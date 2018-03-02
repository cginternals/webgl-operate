
import { assert, log_if, LogLevel } from './auxiliaries';

import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2 } from './texture2';

import { NdcFillingTriangle } from './ndcfillingtriangle';


/**
 * This rendering pass blits the color attachment of a given rgba-framebuffer into the target buffer provided on frame.
 * For rendering, a direct blit is used. However, if this is not supported, a textured, screen-aligned triangle is used
 * for blitting as fallback.
 *
 * The blit component can be used as follows:
 * ```
 * this.blit.framebuffer = this.intermediateFBO;
 * this.blit.frame(this.defaultFBO, null, null);
 * ```
 */
export class BlitPass extends Initializable {

    /** @see {@link context} */
    protected _context: Context;

    /** @see {@link target} */
    protected _target: Framebuffer;

    /** @see {@link framebuffer} */
    protected _framebuffer: Framebuffer;

    /** @see {@link readBuffer} */
    protected _readBuffer: GLenum;

    /** @see {@link drawBuffer} */
    protected _drawBuffer: GLenum;

    /* Indirect blit and fallback implementation. */

    protected _ndcTriangle: NdcFillingTriangle;
    protected _ndcTriangleShared = false;

    protected _program: Program;
    protected _aVertex: GLint;


    constructor(context: Context) {
        super();
        this._context = context;
    }

    /**
     * Uses direct blit via glBlitFramebuffer for blitting a single read buffer into the given target's draw buffer.
     */
    private functionBlit(): void {
        const gl = this.context.gl;

        this._target.bind(gl.DRAW_FRAMEBUFFER);
        this._framebuffer.bind(gl.READ_FRAMEBUFFER);
        gl.readBuffer(this._readBuffer);
        gl.drawBuffers([this._drawBuffer]);

        /**
         * The glClear is somehow required to make the blit work. Reducing the clear area to zero is intended to reduce
         * the actual load of clear.
         */
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.SCISSOR_TEST);

        gl.blitFramebuffer(0, 0, this._framebuffer.width, this._framebuffer.height, 0, 0
            , this._target.width, this._target.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

        this._framebuffer.unbind(gl.READ_FRAMEBUFFER);
        this._target.unbind(gl.DRAW_FRAMEBUFFER);
    }

    /**
     * Uses indirect blit by drawing a textured, screen-aligned triangle into the given target framebuffer.
     */
    private programBlit(): void {
        assert(this._ndcTriangle && this._ndcTriangle.initialized, `expected an initialized ndc triangle`);
        const gl = this.context.gl;

        gl.viewport(0, 0, this._target.width, this._target.height);

        this._program.bind();

        const texture: Texture2 = this._framebuffer.texture(this._readBuffer) as Texture2;
        texture.bind(gl.TEXTURE0);

        const target = this.context.isWebGL2 ? gl.DRAW_FRAMEBUFFER : gl.FRAMEBUFFER;
        this._target.bind(target);
        this._ndcTriangle.draw();
        this._target.unbind(target);

        texture.unbind();

        /* Every stage is expected to bind its own program when drawing, thus, unbinding is not necessary. */
        // this.program.unbind();
    }

    /**
     * Specializes this stage's initialization. This stage either requires blitFramebuffer support or creates screen-
     * aligned triangle geometry and a single program. All attribute and dynamic uniform locations are cached.
     *
     * @param context - Wrapped gl context for function resolution (passed to all stages).
     */
    @Initializable.initialize()
    initialize(ndcTriangle?: NdcFillingTriangle): boolean {
        const gl = this.context.gl;

        /* Configure program-based blit. */

        this._program = new Program(this.context, 'BlitProgram');

        const vert = new Shader(this.context, gl.VERTEX_SHADER, 'ndcvertices.vert');
        vert.initialize(require('./shaders/ndcvertices.vert'));
        const frag = new Shader(this.context, gl.FRAGMENT_SHADER, 'blit.frag');
        frag.initialize(require('./shaders/blit.frag'));

        this._program.initialize([vert, frag]);
        this._aVertex = this._program.attribute('aVertex', 0);

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_texture'), 0);
        this._program.unbind();


        if (ndcTriangle === undefined) {
            this._ndcTriangle = new NdcFillingTriangle(this.context);
        } else {
            this._ndcTriangle = ndcTriangle;
            this._ndcTriangleShared = true;
        }
        if (!this._ndcTriangle.initialized) {
            this._ndcTriangle.initialize(this._aVertex);
        }

        return true;
    }

    /**
     * Specializes this stage's uninitialization. Program and geometry resources are released (if allocated). Cached
     * uniform and attribute locations are invalidated.
     */
    @Initializable.uninitialize()
    uninitialize(): void {
        if (!this._ndcTriangleShared && this._ndcTriangle.initialized) {
            this._ndcTriangle.uninitialize();
        }
        this._program.uninitialize();
    }

    /**
     * A blit frame either blits or draws the color attachment of the given framebuffer to the target framebuffer. For
     * program based/indirect blit a viewport filling area, i.e., a screen-aligned triangle is used.
     */
    @Initializable.assert_initialized()
    frame() {
        log_if(!this._target || !this._target.valid, LogLevel.Dev, `valid target expected, given ${this._target}`);
        log_if(!this._framebuffer || !this._framebuffer.valid, LogLevel.Dev,
            `valid framebuffer for blitting from expected, given ${this._framebuffer}`);

        const gl = this.context.gl;

        switch (this._readBuffer) {
            /* falls through */
            case gl.DEPTH_ATTACHMENT:
            case gl.STENCIL_ATTACHMENT:
            case gl.DEPTH_STENCIL_ATTACHMENT:
                return this.programBlit();
            default:
                break;
        }

        /* BlitFramebuffer is not an extension and, thus, it does not need to be enabled. */
        if (this.context.supportsBlitFramebuffer) {
            return this.functionBlit();
        }
        this.programBlit();
    }

    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
    get context(): Context {
        return this._context;
    }

    /**
     * Sets the framebuffer that is to be blitted.
     * @param framebuffer - Framebuffer that is to be blitted.
     */
    set framebuffer(framebuffer: Framebuffer) {
        this.assertInitialized();
        this._framebuffer = framebuffer;
    }

    /**
     * The read buffer to blit from (currently, this is expected to refer to a texture attachment of this._framebuffer).
     * @param readBuffer - GLenum that is to be queried from the FBO.
     */
    set readBuffer(readBuffer: GLenum) {
        this.assertInitialized();
        this._readBuffer = readBuffer;
    }

    /**
     * The draw buffer to blit to (currently, this is expected to refer to a texture attachment of this._target or
     * gl.BACK). Please note that this will be ignored if WebGL 1 is used without a WEBGL_draw_buffer extension.
     * Furthermore, if the drawBuffer is gl.BACK, a DefaultBuffer is expected as target.
     * @param drawBuffer - GLenum that specifies the draw buffer.
     */
    set drawBuffer(drawBuffer: GLenum) {
        this.assertInitialized();
        this._drawBuffer = drawBuffer;
    }

    /**
     * Framebuffer to blit the given framebuffer (@see framebuffer} into.
     * @param target - Framebuffer to blit into.
     */
    set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

}
