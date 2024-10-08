
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';
import { tuples } from './tuples';

import { ChangeLookup } from './changelookup';
import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { NdcFillingTriangle } from './ndcfillingtriangle';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2D } from './texture2d';
import { Wizard } from './wizard';

/* spellchecker: enable */


/**
 * This pass accumulates the color attachment 0 of a framebuffer, e.g., the result of an intermediate frame, into an
 * accumulation buffer. For accumulation the frame number is used to derive the accumulation weight. For rendering to
 * texture, a textured ndc-filling triangle is used.
 *
 * The accumulation pass can be used as follows:
 * ```
 * this.accumulate.initialize();
 * this.accumulate.texture = this.intermediateFBO.texture(gl2facade.COLOR_ATTACHMENT0);
 * this.accumulate.update();
 * this.accumulate.frame(frameNumber);
 * ```
 */
export class AccumulatePass extends Initializable {

    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
    protected _context: Context;

    /**
     * Alterable auxiliary object for tracking changes on this object's input and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false, texture: false, precision: false, passThrough: false,
    });


    /** @see {@link texture} */
    protected _texture: Texture2D;

    /** @see {@link precision} */
    protected _precision: Wizard.Precision = Wizard.Precision.half;

    /** @see {@link passThrough} */
    protected _passThrough: boolean;

    /**
     * Two rgba-framebuffers used for accumulation (buffer ping-ponging is used for alternating the buffers for read
     * and write access due to a limitation in WebGL).
     */
    protected _accumulationFBOs: [Framebuffer, Framebuffer];
    protected _accumulationTextures: [Texture2D, Texture2D];


    /**
     * Stores the index of the last buffer written to.
     */
    protected _write: GLuint = 0;

    /**
     * Geometry used to draw on. This is not provided by default to allow for geometry sharing. If no triangle is given,
     * the ndc triangle will be created and managed internally.
     */
    protected _ndcTriangle: NdcFillingTriangle;

    /**
     * Tracks ownership of the ndc-filling triangle.
     */
    protected _ndcTriangleShared = false;

    protected _program: Program;
    protected _uWeight: WebGLUniformLocation;


    constructor(context: Context) {
        super();
        this._context = context;
    }


    /**
     * Specializes this pass's initialization. This pass requires an ndc-filling triangle, a single accumulation
     * program, and two accumulation framebuffers for ping pong (simultaneous read and write is currently not allowed
     * by webgl). All attribute and dynamic uniform locations are cached.
     * @param ndcTriangle - If specified, assumed to be used as shared geometry. If none is specified, a ndc-filling
     * triangle will be created internally.
     */
    @Initializable.initialize()
    initialize(ndcTriangle?: NdcFillingTriangle): boolean {
        const gl = this._context.gl;

        this._accumulationFBOs = [
            new Framebuffer(this._context, 'AccumPingFBO'),
            new Framebuffer(this._context, 'AccumPongFBO')];

        this._accumulationTextures = [
            new Texture2D(this._context, 'AccumPingTexture'),
            new Texture2D(this._context, 'AccumPongTexture')];

        if (ndcTriangle === undefined) {
            this._ndcTriangle = new NdcFillingTriangle(this._context, 'NdcFillingTriangle-Accumulate');
        } else {
            this._ndcTriangle = ndcTriangle;
            this._ndcTriangleShared = true;
        }

        /* Configure program-based accumulate. */

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices.vert (accumulate)');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        vert.initialize(require('./shaders/ndcvertices.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'accumulate.frag');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        frag.initialize(require('./shaders/accumulate.frag'));

        this._program = new Program(this._context, 'AccumulateProgram');
        this._program.initialize([vert, frag], false);

        if (!this._ndcTriangle.initialized) {
            this._ndcTriangle.initialize();
        }
        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);
        this._program.link();

        this._uWeight = this._program.uniform('u_weight');
        this._program.bind();
        gl.uniform1f(this._uWeight, 0.0);
        gl.uniform1i(this._program.uniform('u_accumulationTexture'), 0);
        gl.uniform1i(this._program.uniform('u_currentFrameTexture'), 1);
        this._program.unbind();

        return true;
    }

    /**
     * Specializes this pass's uninitialization. Program and geometry resources are released (if allocated). Cached
     * uniform and attribute locations are invalidated.
     */
    @Initializable.uninitialize()
    uninitialize(): void {
        if (!this._ndcTriangleShared && this._ndcTriangle.initialized) {
            this._ndcTriangle.uninitialize();
        }
        this._program.uninitialize();

        this._accumulationFBOs[0].uninitialize();
        this._accumulationFBOs[1].uninitialize();
        this._accumulationTextures[0].uninitialize();
        this._accumulationTextures[1].uninitialize();

        this._write = 0;
    }

    /**
     * Initialize accumulation textures and FBOs (if not initialized yet). Then verifies if the texture's size has
     * changed, and if so, resizes the accumulation buffers.
     */
    @Initializable.assert_initialized()
    update(): void {
        if (!this._texture || !this._texture.valid) {
            auxiliaries.log(auxiliaries.LogLevel.Warning, `valid texture for accumulation update expected, given ${this._texture}`);
            return;
        }

        if (this._passThrough) {
            return;
        }

        const sizeAltered = this._altered.texture || this._accumulationTextures[0].width !== this._texture.width ||
            this._accumulationTextures[0].height !== this._texture.height;
        if (!this._altered.any && !sizeAltered) {
            auxiliaries.assert(this._accumulationFBOs[0].valid && this._accumulationFBOs[1].valid,
                `valid accumulation framebuffers expected`);
            return;
        }

        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        /* Create and initialize accumulation texture and FBOs. */

        const textureSize = this._texture.size;

        if (!this._accumulationTextures[0].initialized) {
            const internalFormat = Wizard.queryInternalTextureFormat(this._context, gl.RGBA, this._precision);
            this._accumulationTextures[0].initialize(textureSize[0], textureSize[1],
                internalFormat[0], gl.RGBA, internalFormat[1]);
            this._accumulationTextures[1].initialize(textureSize[0], textureSize[1],
                internalFormat[0], gl.RGBA, internalFormat[1]);

        } else {
            if (this._altered.texture || sizeAltered) {
                this._accumulationTextures[0].resize(this._texture.width, this._texture.height);
                this._accumulationTextures[1].resize(this._texture.width, this._texture.height);
            }
            if (this._altered.precision) {
                const internalFormat = Wizard.queryInternalTextureFormat(this._context, gl.RGBA, this._precision);
                this._accumulationTextures[0].reformat(internalFormat[0], gl.RGBA, internalFormat[1]);
                this._accumulationTextures[1].reformat(internalFormat[0], gl.RGBA, internalFormat[1]);
            }
        }

        if (!this._accumulationFBOs[0].initialized) {
            this._accumulationFBOs[0].initialize([[gl2facade.COLOR_ATTACHMENT0, this._accumulationTextures[0]]]);
            this._accumulationFBOs[1].initialize([[gl2facade.COLOR_ATTACHMENT0, this._accumulationTextures[1]]]);
        }

        auxiliaries.assert(this._accumulationFBOs[0].valid && this._accumulationFBOs[1].valid,
            `valid accumulation framebuffers expected`);

        this._altered.reset();
    }

    /**
     * An accumulation frame binds the two accumulation textures (ping-pong framebuffer), one for read, the other for
     * write/accumulating into. A screen-aligned triangle is used to fill the viewport and mix the input texture with
     * the weight of 1 / (frameNumber + 1) with the previous accumulation result. If no texture is specified, pass
     * through is used.
     * @param frameNumber - Frame number used to select the current read and write framebuffer as well as frame weight.
     * @param viewport - If specified, the viewport for accumulation will be set to the given width and height. If not,
     * the currently set viewport is used.
     */
    @Initializable.assert_initialized()
    frame(frameNumber: number, viewport?: tuples.GLsizei2): void {
        auxiliaries.assert(this._accumulationFBOs[0].valid && this._accumulationFBOs[1].valid,
            `valid framebuffer objects for accumulation expected (initialize or update was probably not called)`);

        if (this._passThrough || this._texture === undefined) {
            return;
        }
        auxiliaries.logIf(!this._texture || !this._texture.valid, auxiliaries.LogLevel.Warning,
            `valid texture for accumulation frame expected, given ${this._texture}`);

        const gl = this._context.gl;

        if (viewport !== undefined) {
            gl.viewport(0, 0, viewport[0], viewport[1]);
        }

        const readIndex = frameNumber % 2;
        const writeIndex = this._write = 1 - readIndex;

        const accumTexture = this._accumulationTextures[readIndex];
        const frameTexture = this._texture;

        accumTexture.bind(gl.TEXTURE0);
        frameTexture.bind(gl.TEXTURE1);

        this._program.bind();
        gl.uniform1f(this._uWeight, 1.0 / (frameNumber + 1));

        this._accumulationFBOs[writeIndex].bind(gl.DRAW_FRAMEBUFFER); // bind draw only does not work for IE and EDGE
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();
        this._accumulationFBOs[writeIndex].unbind(gl.DRAW_FRAMEBUFFER);

        /** Every pass is expected to bind its own program when drawing, thus, unbinding is not necessary. */
        // this.program.unbind();

        accumTexture.unbind(gl.TEXTURE0);
        frameTexture.unbind(gl.TEXTURE1);
    }


    /**
     * Sets the texture that is to be accumulated. The ping and pong render textures will be resized on next frame
     * automatically if the texture size changed.
     * @param texture - Framebuffer that is to be accumulated.
     */
    set texture(texture: Texture2D) {
        this.assertInitialized();
        if (this._texture !== texture) {
            this._texture = texture;
            this._altered.alter('texture');
        }
    }

    /**
     * Allows to specify the accumulation precision.
     */
    set precision(precision: Wizard.Precision) {
        this.assertInitialized();
        if (this._precision !== precision) {
            this._precision = precision;
            this._altered.alter('precision');
        }
    }

    /**
     * Allows to skip accumulation. If pass through is enabled, nothing will be rendered on frame at all and the
     * ping pong render textures will be reduced to a minimum size of [1, 1] until pass through is disabled.
     */
    set passThrough(passThrough: boolean) {
        this.assertInitialized();

        if (this._passThrough === passThrough) {
            return;
        }

        if (this._passThrough && this._accumulationTextures[0].initialized) {
            this._accumulationTextures[0].uninitialize();
            this._accumulationTextures[1].uninitialize();
        }
        if (this._passThrough && this._accumulationFBOs[0].initialized) {
            this._accumulationFBOs[0].uninitialize();
            this._accumulationFBOs[1].uninitialize();
        }

        this._passThrough = passThrough;
        this._altered.alter('passThrough');
    }

    /**
     * Returns the framebuffer last accumulated into. Note: the accumulation buffer is represented by two framebuffers
     * swapped for read and write every frame. The accumulation result is in the first color attachment.
     * @returns - The rgba framebuffer last accumulated into.
     */
    get framebuffer(): Framebuffer | undefined {
        return this._passThrough ? undefined : this._accumulationFBOs[this._write];
    }

}
