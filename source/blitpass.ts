
/* spellchecker: disable */

import { assert, logIf, LogLevel } from './auxiliaries';

import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { NdcFillingTriangle } from './ndcfillingtriangle';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2D } from './texture2d';

/* spellchecker: enable */


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
 *
 * This pass also provides some basic debugging facilities, such as blitting the input as linearized depth (packed or
 * not packed) etc. An additional WebGL program will be initialized when a debug mode is specified for the first time.
 * The default program blit remains untouched in order to keep it as minimal as possible.
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

    /** @see {@link forceProgramBlit} */
    protected _enforceProgramBlit = false;

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
    protected _debugProgram: Program | undefined = undefined;

    /** @see {@link debug} */
    protected _debug: BlitPass.Debug = BlitPass.Debug.None;

    /**
     * Uniform for passing the debug mode to the specialized blit program.
     */
    protected _uDebugMode: WebGLUniformLocation | undefined;

    /**
     * Uniform used to pass near and far data to the specialized blit program for linearization.
     */
    protected _uLinearize: WebGLUniformLocation | undefined;

    /**
     * If provided, depth will be linearized when depth data is blitted.
     */
    protected _near: GLfloat = 0.0;
    protected _far: GLfloat = 0.0;


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
     * @param program - The program the is used for blitting, either the minimal blit or debug blit.
     */
    private programBlit(program: Program): void {
        assert(this._ndcTriangle && this._ndcTriangle.initialized, `expected an initialized ndc triangle`);
        const gl = this._context.gl;

        gl.viewport(0, 0, this._target.width, this._target.height);

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        program.bind();

        const texture = this._framebuffer.texture(this._readBuffer) as Texture2D;
        texture.bind(gl.TEXTURE0);

        const target = this._context.isWebGL2 ? gl.DRAW_FRAMEBUFFER : gl.FRAMEBUFFER;
        this._target.bind(target);
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();
        this._target.unbind(target);

        texture.unbind();

        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);

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

        if (ndcTriangle === undefined) {
            this._ndcTriangle = new NdcFillingTriangle(this._context, 'NdcFillingTriangle-Blit');
        } else {
            this._ndcTriangle = ndcTriangle;
            this._ndcTriangleShared = true;
        }

        /* Configure program-based blit. */

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices.vert (blit)');
        vert.initialize(require('./shaders/ndcvertices.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'blit.frag');
        frag.initialize(require('./shaders/blit.frag'));

        this._program = new Program(this._context, 'BlitProgram');
        this._program.initialize([vert, frag], false);

        if (!this._ndcTriangle.initialized) {
            this._ndcTriangle.initialize();
        }
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
        if (!this._ndcTriangleShared && this._ndcTriangle.initialized) {
            this._ndcTriangle.uninitialize();
        }
        this._program.uninitialize();

        if (this._debugProgram) {
            this._debugProgram.uninitialize();
            this._uDebugMode = undefined;
            this._uLinearize = undefined;
        }
    }

    /**
     * A blit frame either blits or draws the color attachment of the given framebuffer to the target framebuffer. For
     * program based/indirect blit a viewport filling area, i.e., a screen-aligned triangle is used.
     */
    @Initializable.assert_initialized()
    frame(): void {
        logIf(!this._target || !this._target.valid, LogLevel.Warning, `valid target expected, given ${this._target}`);
        logIf(!this._framebuffer || !this._framebuffer.valid, LogLevel.Warning,
            `valid framebuffer for blitting from expected, given ${this._framebuffer}`);

        if (this._debug !== BlitPass.Debug.None) {
            return this.programBlit(this._debugProgram!);
        }

        const gl = this._context.gl;
        switch (this._readBuffer) {
            /* falls through */
            case gl.DEPTH_ATTACHMENT:
            case gl.STENCIL_ATTACHMENT:
            case gl.DEPTH_STENCIL_ATTACHMENT:
                return this.programBlit(this._program);
            default:
                break;
        }

        /* BlitFramebuffer is not an extension and, thus, it does not need to be enabled. */
        if (this._context.supportsBlitFramebuffer && this._enforceProgramBlit === false) {
            return this.functionBlit();
        }
        this.programBlit(this._program);
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

    /**
     * Specify whether or not experimental WebGL blit can be used if available.
     * @param enforce - If true, program based blit instead of WebGL experimental blit function will be used.
     */
    set enforceProgramBlit(enforce: boolean) {
        this._enforceProgramBlit = enforce;
    }

    /**
     * Specify a debug mode for blitting @see {@link Blitpass.Debug}. If the debug mode is set to anything except
     * `Debug.None` for the first time, a specialized debug program will be created, initialized, and used for blit.
     */
    set debug(mode: BlitPass.Debug) {
        this.assertInitialized();
        const gl = this._context.gl;

        this._debug = mode;
        if (this._debug === BlitPass.Debug.None) {
            return;
        }
        if (this._debugProgram !== undefined) {
            this._debugProgram!.bind();
            gl.uniform1i(this._uDebugMode, this._debug);
            return;
        }

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices.vert (blit)');
        vert.initialize(require('./shaders/ndcvertices.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'blit_debug.frag (blit)');
        frag.initialize(require('./shaders/blit_debug.frag'));

        this._debugProgram = new Program(this._context, 'BlitProgramDebug');
        this._debugProgram.initialize([vert, frag]);

        this._uDebugMode = this._debugProgram.uniform('u_mode');
        this._uLinearize = this._debugProgram.uniform('u_linearize');

        this._debugProgram.bind();
        gl.uniform1i(this._debugProgram.uniform('u_texture'), 0);
        gl.uniform1i(this._uDebugMode, this._debug);
        gl.uniform2f(this._uLinearize, this._near, this._far);
    }

    /**
     * Debug-feature: if linearized is enabled, depth buffer blitting will use this near value for linearization.
     */
    set near(near: GLfloat | undefined) {
        this._near = near ? near : 0.0;
        if (this._debugProgram) {
            this._debugProgram.bind();
            this._context.gl.uniform2f(this._uLinearize, this._near, this._far);
        }
    }

    /**
     * Debug-feature: if linearized is enabled, depth buffer blitting will use this far value for linearization.
     */
    set far(far: GLfloat | undefined) {
        this._far = far ? far : 0.0;

        if (this._debugProgram) {
            this._debugProgram.bind();
            this._context.gl.uniform2f(this._uLinearize, this._near, this._far);
        }
    }

}

export namespace BlitPass {

    export enum Debug {
        None,
        Depth = 1,
        DepthLinear = 2,
        DepthPacked = 3,
        DepthLinearPacked = 4,
    }

}
