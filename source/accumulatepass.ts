
import { assert, log, log_if, LogLevel } from './auxiliaries';
import { GLsizei2 } from './tuples';

import { AlterationLookup } from './alterable';
import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { NdcFillingTriangle } from './ndcfillingtriangle';
import { Program } from './program';
import { Renderbuffer } from './renderbuffer';
import { Shader } from './shader';
import { Texture2 } from './texture2';
import { FramePrecisionString, Wizard } from './wizard';


/**
 * This stage accumulates the color attachment 0 of a framebuffer, e.g., the result of an intermediate frame, into an
 * accumulation buffer. For accumulation the frame number is used to derive the accumulation weight. For rendering to
 * texture, a textured ndc-filling triangle is used.
 *
 * The accumulation stage can be used as follows:
 * ```
 * this.accumulate.initialize();
 * this.accumulate.texture = this.intermediateFBO.texture(gl2facade.COLOR_ATTACHMENT0);
 * this.accumulate.update();
 * this.accumulate.frame(frameNumber);
 * ```
 */
export class AccumulatePass extends Initializable {

    /**
     * Used to resize the accumulation framebuffers when passthrough is active.
     */
    protected static readonly MIN_SIZE: GLsizei2 = [1, 1];

    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
    protected _context: Context;

    /**
     * Alterable auxiliary object for tracking changes on this object's input and lazy updates.
     */
    protected readonly _altered = Object.assign(new AlterationLookup(), {
        any: false, texture: false, depthStencilAttachment: false, precision: false, passThrough: false,
    });


    /** @see {@link texture} */
    protected _texture: Texture2;

    /**
     * Accumulate allows specification of a depth and stencil attachment for accumulation. Please note that this render
     * buffer has to be of the exact same size as the texture that is to be accumulated.
     */
    protected _depthStencilAttachment: Texture2 | Renderbuffer | undefined;

    /** @see {@link precision} */
    protected _precision: FramePrecisionString = 'half';

    /** @see {@link passThrough} */
    protected _passThrough: boolean;

    /**
     * Two rgba-framebuffers used for accumulation (buffer ping-ponging is used for alternating the buffers for read
     * and write access due to a limitation in WebGL).
     */
    protected _accumulationFBOs: [Framebuffer, Framebuffer];
    protected _accumulationTextures: [Texture2, Texture2];


    /**
     * Stores the index of the last buffer written to.
     */
    protected _write: GLuint = 0;

    protected _ndcTriangle: NdcFillingTriangle;
    protected _ndcTriangleShared = false;

    protected _program: Program;
    protected _uWeight: WebGLUniformLocation;


    constructor(context: Context) {
        super();
        this._context = context;
    }


    /**
     * Specializes this stage's initialization. This stage requires an ndc-filling triangle, a single accumulation
     * program, and two accumulation framebuffers for ping pong (simultaneous read and write is currently not allowed
     * by webgl). All attribute and dynamic uniform locations are cached.
     * @param ndcTriangle - If specified, assumed to be used as shared geometry. If none is specified, a ndc-filling
     * triangle will be created internally.
     */
    @Initializable.initialize()
    initialize(ndcTriangle: NdcFillingTriangle | undefined): boolean {

        const gl = this._context.gl;

        this._accumulationFBOs = [
            new Framebuffer(this._context, 'AccumulatePingFBO'),
            new Framebuffer(this._context, 'AccumulatePongFBO')];

        this._accumulationTextures = [
            new Texture2(this._context, 'AccumulatePingTexture'),
            new Texture2(this._context, 'AccumulatePongTexture')];

        /* Configure program-based accumulate. */

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices.vert (accumulate)');
        vert.initialize(require('./shaders/ndcvertices.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'accumulate.frag');
        frag.initialize(require('./shaders/accumulate.frag'));

        this._program = new Program(this._context, 'AccumulateProgram');
        this._program.initialize([vert, frag]);

        this._uWeight = this._program.uniform('u_weight');
        this._program.bind();
        gl.uniform1f(this._uWeight, 0.0);
        gl.uniform1i(this._program.uniform('u_accumulationTexture'), 0);
        gl.uniform1i(this._program.uniform('u_currentFrameTexture'), 1);
        this._program.unbind();


        if (ndcTriangle === undefined) {
            this._ndcTriangle = new NdcFillingTriangle(this._context);
        } else {
            this._ndcTriangle = ndcTriangle;
            this._ndcTriangleShared = true;
        }

        if (!this._ndcTriangle.initialized) {
            const aVertex = this._program.attribute('a_vertex', 0);
            this._ndcTriangle.initialize(aVertex);
        } else {
            this._program.attribute('a_vertex', this._ndcTriangle.aVertex);
        }

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


    // altered -> pass through, texture ,stencil, precision ...

    /**
     * Initialize accumulation textures and FBOs (if not initialized yet). Then verifies if the texture's size has
     * changed, and if so, resizes the accumulation buffers. Please note that the depth-stencil-attachment (if provided)
     * must have the exact same size as the texture.
     */
    @Initializable.assert_initialized()
    update() {
        if (!this._texture || !this._texture.valid) {
            log(LogLevel.Dev, `valid texture for accumulation update expected, given ${this._texture}`);
            return;
        }

        if (this._passThrough) {
            return;
        }

        if (!this._altered.any) {
            assert(this._accumulationFBOs[0].valid && this._accumulationFBOs[1].valid,
                `valid accumulation framebuffers expected`);
            return;
        }

        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        /* Create and initialize accumulation texture and FBOs. */

        const textureSize = this._texture.size;

        if (!this._accumulationTextures[0].initialized) {
            const internalFormat = Wizard.queryInternalFormat(this._context, gl.RGBA, this._precision);

            this._accumulationTextures[0].initialize(textureSize[0], textureSize[1],
                internalFormat, gl.RGBA, gl.UNSIGNED_BYTE);
            this._accumulationTextures[1].initialize(textureSize[0], textureSize[1],
                internalFormat, gl.RGBA, gl.UNSIGNED_BYTE);

        } else {
            if (this._altered.texture) {
                // Do not resize framebuffers, since depth stencil attachment is not owned.
                this._accumulationTextures[0].resize(this._texture.width, this._texture.height);
                this._accumulationTextures[1].resize(this._texture.width, this._texture.height);
            }
            if (this._altered.precision) {
                const internalFormat = Wizard.queryInternalFormat(this._context, gl.RGBA, this._precision);
                this._accumulationTextures[0].reformat(internalFormat, gl.RGBA, gl.UNSIGNED_BYTE);
                this._accumulationTextures[1].reformat(internalFormat, gl.RGBA, gl.UNSIGNED_BYTE);
            }
        }

        if (this._altered.depthStencilAttachment && this._depthStencilAttachment) {
            const depthStencilSize = this._depthStencilAttachment.size;
            log_if(textureSize[0] === depthStencilSize[0] && textureSize[1] === depthStencilSize[1], LogLevel.Dev,
                `texture size ${textureSize} expected to match to given depth-stencil-attachment ${depthStencilSize}`);
        }


        /* Actually (re)initialize the framebuffers. */

        if (this._accumulationFBOs[0].initialized) {
            this._accumulationFBOs[0].uninitialize();
            this._accumulationFBOs[1].uninitialize();
        }

        if (this._depthStencilAttachment !== undefined) {
            this._accumulationFBOs[0].initialize([[gl2facade.COLOR_ATTACHMENT0, this._accumulationTextures[0]]
                , [gl.DEPTH_STENCIL_ATTACHMENT, this._depthStencilAttachment]]);
            this._accumulationFBOs[1].initialize([[gl2facade.COLOR_ATTACHMENT0, this._accumulationTextures[1]]
                , [gl.DEPTH_STENCIL_ATTACHMENT, this._depthStencilAttachment]]);

        } else if (this._altered.any) {
            this._accumulationFBOs[0].initialize([[gl2facade.COLOR_ATTACHMENT0, this._accumulationTextures[0]]]);
            this._accumulationFBOs[1].initialize([[gl2facade.COLOR_ATTACHMENT0, this._accumulationTextures[1]]]);
        }

        assert(this._accumulationFBOs[0].valid && this._accumulationFBOs[1].valid,
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
    frame(frameNumber: number, viewport?: GLsizei2) {
        assert(this._accumulationFBOs[0].valid && this._accumulationFBOs[1].valid,
            `valid framebuffer objects for accumulation expected (initialize or update was probably not be called`);

        if (this._passThrough || this._texture === undefined) {
            return;
        }
        log_if(!this._texture || !this._texture.valid, LogLevel.Dev,
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
        this._ndcTriangle.draw();
        this._accumulationFBOs[writeIndex].unbind(gl.DRAW_FRAMEBUFFER);

        /** Every stage is expected to bind its own program when drawing, thus, unbinding is not necessary. */
        // this.program.unbind();

        accumTexture.unbind(gl.TEXTURE0);
        frameTexture.unbind(gl.TEXTURE1);
    }


    /**
     * Sets the texture that is to be accumulated. The ping and pong render textures will be resized on next frame
     * automatically if the texture size changed. Note that the depth-stencil-attachment must match the texture in size.
     * @param texture - Framebuffer that is to be accumulated.
     */
    set texture(texture: Texture2) {
        this.assertInitialized();
        if (this._texture !== texture) {
            this._texture = texture;
            this._altered.alter('texture');
        }
    }

    /**
     * Accumulate allows specification of a depth and stencil attachment for accumulation. Please note that this render
     * buffer has to be of the exact same size as the texture that is to be accumulated.
     */
    set depthStencilAttachment(depthStencilAttachment: Texture2 | Renderbuffer | undefined) {
        this.assertInitialized();
        if (this._depthStencilAttachment !== depthStencilAttachment) {
            this._depthStencilAttachment = depthStencilAttachment;
            this._altered.alter('depthStencilAttachment');
        }
    }

    /**
     * Allows to specify the accumulation precision.
     */
    set precision(precision: FramePrecisionString) {
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
