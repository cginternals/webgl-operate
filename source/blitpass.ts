
import { assert, log_if, LogLevel } from './auxiliaries';

import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { NdcFillingTriangle } from './ndcfillingtriangle';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2 } from './texture2';


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

    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
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


    constructor(context: Context) {
        super();
        this._context = context;
    }

    /**
     * Uses direct blit via glBlitFramebuffer for blitting a single read buffer into the given target's draw buffer.
     */
    private functionBlit(): void {
        const gl = this._context.gl;

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
        const gl = this._context.gl;

        gl.viewport(0, 0, this._target.width, this._target.height);

        this._program.bind();

        const texture = this._framebuffer.texture(this._readBuffer) as Texture2;
        texture.bind(0);

        const target = this._context.isWebGL2 ? gl.DRAW_FRAMEBUFFER : gl.FRAMEBUFFER;
        this._target.bind(target);
        this._ndcTriangle.draw();
        this._target.unbind(target);

        texture.unbind();

        /* Every pass is expected to bind its own program when drawing, thus, unbinding is not necessary. */
        // this.program.unbind();
    }

    /**
     * Specializes this pass's initialization. This pass either requires blitFramebuffer support or creates screen-
     * aligned triangle geometry and a single program. All attribute and dynamic uniform locations are cached.
     * @param ndcTriangle - If specified, assumed to be used as shared geometry. If none is specified, a ndc-filling
     * triangle will be created internally.
     */
    @Initializable.initialize()
    initialize(ndcTriangle?: NdcFillingTriangle): boolean {
        const gl = this._context.gl;

        /* Configure program-based blit. */

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices.vert (blit)');
        vert.initialize(require('./shaders/ndcvertices.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'blit.frag');
        frag.initialize(require('./shaders/blit.frag'));

        this._program = new Program(this._context, 'BlitProgram');
        this._program.initialize([vert, frag]);

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_texture'), 0);
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

        const gl = this._context.gl;

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
        if (this._context.supportsBlitFramebuffer) {
            return this.functionBlit();
        }
        this.programBlit();
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
