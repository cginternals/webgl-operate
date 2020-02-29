
/* spellchecker: disable */

import { vec4 } from 'gl-matrix';

import { assert, logIf, LogLevel } from './auxiliaries';
import { v4 } from './gl-matrix-extensions';

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
 * The blit pass can be used as follows:
 * ```
 * this._blitPass = new BlitPass(this._context);
 * this._blitPass.initialize();
 *
 * this._blitPass.readBuffer = gl2facade.COLOR_ATTACHMENT0;
 * // this._blitPass.srcBounds = vec4.fromValues(0, 0, this._sourceSize[0], this._sourceSize[1]);
 * this._blitPass.filter = gl.LINEAR;
 * this._blitPass.target = this._defaultFBO;
 * this._blitPass.drawBuffer = gl.BACK;
 *
 * this.blitPass.framebuffer = this.intermediateFBO;
 * // this.blitPass.dstBounds = vec4.fromValues(dstX0, dstY0, dstX1, dstY1);
 * this.blitPass.frame();
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

    /** @see {@link filter} */
    protected _filter: GLenum;

    /** @see {@link srcBounds} */
    protected _srcBounds: vec4 | undefined;

    /** @see {@link dstBounds} */
    protected _dstBounds: vec4 | undefined;

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

    /**
     * Uniform for passing the filter to blit: true for nearest, false otherwise (linear).
     */
    protected _uNearest: WebGLUniformLocation;

    /**
     * Uniform for passing the source bounds to blit.
     */
    protected _uSrcBounds: WebGLUniformLocation;

    /**
     * Uniform for passing the destination bounds to blit.
     */
    protected _uDstBounds: WebGLUniformLocation;


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

        const srcBounds = this._srcBounds ? this._srcBounds : [0, 0, this._framebuffer.width, this._framebuffer.height];
        const dstBounds = this._dstBounds ? this._dstBounds : [0, 0, this._target.width, this._target.height];

        gl.blitFramebuffer(
            srcBounds[0], srcBounds[1], srcBounds[2], srcBounds[3],
            dstBounds[0], dstBounds[1], dstBounds[2], dstBounds[3],
            gl.COLOR_BUFFER_BIT, this._filter);

        this._framebuffer.unbind(gl.READ_FRAMEBUFFER);
        this._target.unbind(gl.DRAW_FRAMEBUFFER);
    }

    /**
     * Uses indirect blit by drawing a textured, screen-aligned triangle into the given target framebuffer.
     * @param program - The program the is used for minimal blit.
     */
    private programBlit(): void {
        if (this._program === undefined) {
            this.createProgram();
        }

        assert(this._ndcTriangle && this._ndcTriangle.initialized, `expected an initialized ndc triangle`);
        const gl = this._context.gl;

        const srcBounds: vec4 = this._srcBounds ? this._srcBounds :
            [0, 0, this._framebuffer.width, this._framebuffer.height];
        const dstBounds: vec4 = this._dstBounds ? this._dstBounds : [0, 0, this._target.width, this._target.height];

        const srcBoundsNormalized: vec4 = vec4.div(v4(), srcBounds,
            [this._framebuffer.width, this._framebuffer.height, this._framebuffer.width, this._framebuffer.height]);
        const dstBoundsNormalized: vec4 = vec4.div(v4(), dstBounds,
            [this._target.width, this._target.height, this._target.width, this._target.height]);

        gl.viewport(dstBounds[0], dstBounds[1], dstBounds[2] - dstBounds[0], dstBounds[3] - dstBounds[1]);

        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        this._program.bind();
        gl.uniform4fv(this._uSrcBounds, srcBoundsNormalized);
        gl.uniform4fv(this._uDstBounds, dstBoundsNormalized);
        gl.uniform1i(this._uNearest, this.filter === gl.nearest);

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
     * Used to create (on-demand) the blit program for program based blitting. This function can be specialized, e.g.,
     * for creating custom blit passes such as the `DebugPass` {@link DebugPass}. This method assumes the program to be
     * undefined.
     */
    protected createProgram(): boolean {
        assert(this._program === undefined, `expected blit program to be undefined before its creation`);
        const gl = this._context.gl;

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'blit.vert (blit)');
        vert.initialize(require('./shaders/blit.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'blit.frag (blit)');
        frag.initialize(require('./shaders/blit.frag'));

        this._program = new Program(this._context, 'BlitProgram');
        this._program.initialize([vert, frag], false);

        if (!this._ndcTriangle.initialized) {
            this._ndcTriangle.initialize();
        }
        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);
        this._program.link();

        this._uSrcBounds = this._program.uniform('u_srcBounds');
        this._uDstBounds = this._program.uniform('u_dstBounds');
        this._uNearest = this._program.uniform('u_nearest');

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_source'), 0);
        this._program.unbind();

        return this._program.valid;
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

        this._filter = gl.NEAREST;

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
    frame(): void {
        logIf(!this._target || !this._target.valid, LogLevel.Warning, `valid target expected, given ${this._target}`);
        logIf(!this._framebuffer || !this._framebuffer.valid, LogLevel.Warning,
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
        if (this._context.supportsBlitFramebuffer && this._enforceProgramBlit === false) {
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

    /**
     * Specifies the interpolation to be applied if the image is stretched. Must be GL_NEAREST or GL_LINEAR.
     */
    set filter(filter: GLenum) {
        this._filter = filter;
    }

    /**
     * Specify the bounds of the source rectangle within the read buffer of the read framebuffer.
     * @param bounds - [srcX0, srcY0, srcX1, srcY1] as used in glBlitFramebuffer. If bounds is
     * undefined, the full size of the source buffer (framebuffer) will be used.
     */
    set srcBounds(bounds: vec4 | undefined) {
        this._srcBounds = bounds ? vec4.clone(bounds) : undefined;
    }

    /**
     * Specify the bounds of the destination rectangle within the write buffer of the write framebuffer.
     * @param bounds - [srcX0, srcY0, srcX1, srcY1] as used in glBlitFramebuffer. If bounds is
     * undefined, the full size of the destination (target) buffer will be used.
     */
    set dstBounds(bounds: vec4 | undefined) {
        this._dstBounds = bounds ? vec4.clone(bounds) : undefined;
    }


    /**
     * Specify whether or not experimental WebGL blit can be used if available.
     * @param enforce - If true, program based blit instead of WebGL experimental blit function will be used.
     */
    set enforceProgramBlit(enforce: boolean) {
        this._enforceProgramBlit = enforce;
    }

}
