
/* spellchecker: disable */

import {
    auxiliaries,
    Context,
    Framebuffer,
    Initializable,
    NdcFillingTriangle,
    Program,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';

/* spellchecker: enable */

export class PostProcessingPass extends Initializable {

    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
    protected _context: Context;

    protected _texture: Texture2D;

    protected _targetTexture: Texture2D;
    protected _frameBuffer: Framebuffer;

    protected _ndcTriangle: NdcFillingTriangle;

    protected _program: Program;


    constructor(context: Context) {
        super();
        this._context = context;
    }

    @Initializable.initialize()
    initialize(ndcTriangle: NdcFillingTriangle): boolean {
        const gl = this._context.gl;

        this._frameBuffer = new Framebuffer(this._context, 'PostProcessingFBO');
        this._targetTexture = new Texture2D(this._context, 'PostProcessingTexture');

        this._ndcTriangle = ndcTriangle;

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices.vert (postprocessing)');
        vert.initialize(require('../../source/shaders/ndcvertices.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'postprocessing.frag');
        frag.initialize(require('./data/postprocessing.frag'));

        this._program = new Program(this._context, 'AccumulateProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);
        this._program.link();

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_texture'), 0);
        this._program.unbind();

        return true;
    }

    /**
     * Specializes this pass's uninitialization. Program and geometry resources are released (if allocated). Cached
     * uniform and attribute locations are invalidated.
     */
    @Initializable.uninitialize()
    uninitialize(): void {
        this._program.uninitialize();
        this._frameBuffer.uninitialize();
    }

    @Initializable.assert_initialized()
    update(): void {
        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        if (!this._texture || !this._texture.valid) {
            auxiliaries.log(auxiliaries.LogLevel.Warning,
                `valid texture for postprocessing update expected, given ${this._texture}`);
            return;
        }

        const textureSize = this._texture.size;

        if (!this._targetTexture.initialized) {
            const internalFormat = Wizard.queryInternalTextureFormat(this._context, gl.RGBA, gl.FLOAT);
            this._targetTexture.initialize(textureSize[0], textureSize[1],
                internalFormat[0], gl.RGBA, internalFormat[1]);
        }

        const sizeAltered = this._targetTexture.width !== this._texture.width ||
            this._targetTexture.height !== this._texture.height;


        if (sizeAltered) {
            this._targetTexture.resize(this._texture.width, this._texture.height);
        }

        if (!this._frameBuffer.initialized) {
            this._frameBuffer.initialize([[gl2facade.COLOR_ATTACHMENT0, this._targetTexture]]);
        }

        auxiliaries.assert(this._frameBuffer.valid,
            `valid framebuffers expected for postprocessing`);
    }

    @Initializable.assert_initialized()
    frame(): void {
        auxiliaries.assert(this._frameBuffer.valid,
            `valid framebuffer objects for postprocessing expected.`);

        auxiliaries.logIf(!this._texture || !this._texture.valid, auxiliaries.LogLevel.Warning,
            `valid texture for postprocessing frame expected, given ${this._texture}`);

        const gl = this._context.gl;

        gl.viewport(0, 0, this._targetTexture.width, this._targetTexture.height);

        this._program.bind();
        this._texture.bind(gl.TEXTURE0);

        this._frameBuffer.bind(gl.DRAW_FRAMEBUFFER);
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();
        this._frameBuffer.unbind(gl.DRAW_FRAMEBUFFER);
    }

    set texture(texture: Texture2D) {
        this._texture = texture;
    }

    get targetTexture(): Texture2D {
        return this._targetTexture;
    }
}
