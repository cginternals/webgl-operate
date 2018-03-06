
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { decode_float24x1_from_uint8x3, decode_uint32_from_rgba8 } from '../core/gl-matrix-ext';

import { assert } from '../core/common';

import { Context } from '../core/context';
import { Stage } from '../core/stage';

import { Framebuffer } from '../core/framebuffer';
import { Program } from '../core/program';
import { Texture2 } from '../core/texture';

import { ScreenAlignedTriangle, ScreenAlignedTriangleDrawable } from '../assets/screenalignedtriangle';


/**
 * This stage provides means to sample G-Buffers, in order to give access to world space coordinates, depth values and
 * IDs. World space coordinates are calculated by sampling the depth value and unprojecting the normalized device
 * coordinates. Depth and ID values are read from the GPU by rendering the requested pixel to a 1x1 texture and reading
 * back the value from this texture. Note that depth and ID values are cached as long as no redraw (frame) was invoked.
 */
export class ReadbackStage extends Stage {

    protected _depthAttachment: GLenum = 0;
    protected _depthFBO: Framebuffer | undefined; // This is used if depth is already uint8x3 encoded
    protected _cachedDepths = new Map<number, GLfloat>();

    protected _idAttachment: GLenum;
    protected _idFBO: Framebuffer;
    protected _cachedIDs = new Map<number, GLsizei>();

    protected _cache = false;
    set cache(value: boolean) {
        this._cache = value;
    }


    protected buffer = new Uint8Array(4);

    /**
     * Properties required for 24bit depth readback workaround. If a valid depth format is available as renderable
     * texture format, a single fragment is rasterized in order to encode the depth of at a specific location into
     * uint8x3 format, rendered into a RGBA texture for readback. This workaround is currently necessary since reading
     * back depth buffer data is not supported. All following protected properties are undefined when this workaround
     * is not required (i.e., in IE11), since the depth texture is already rendered explicitly in a previous render
     * pass.
     */

    protected texture: Texture2;
    protected fbo: Framebuffer;

    protected saTriangle: ScreenAlignedTriangleDrawable | undefined;

    protected program: Program | undefined;
    protected uOffset: WebGLUniformLocation | undefined;
    protected uScale: WebGLUniformLocation | undefined;

    protected aVertex: GLint = -1;

    /**
     * Retrieve the depth of a fragment in normalized device coordinates. The implementation of this function is
     * assigned at initialization based on the available WebGL features.
     *
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     */
    depthAt: (x: GLint, y: GLint) => GLfloat | undefined;

    /**
     * @param context - Wrapped gl context for function resolution (passed to all stages).
     */
    protected onInitialize(context: Context): void {
        super.onInitialize(context);
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        /**
         * If depth is already uint8x3 encoded into a rgb/rgba target no readback workaround is required.
         */
        if (this.context.isWebGL1 && !this.context.supportsDepthTexture) {
            this.depthAt = (x: GLint, y: GLint) => this.depthAt_directRead(x, y);
            return;
        }

        /**
         * Configure read back for depth data.
         */
        this.depthAt = (x: GLint, y: GLint) => this.depthAt_renderThenRead(x, y);

        this.saTriangle = new ScreenAlignedTriangleDrawable();

        this.program = new Program(context, 'ReadbackDepthProgram');
        this.program.initialize([require('../shaders/screenaligned.vert')], [require('../shaders/readbackdepth.frag')]);

        this.uOffset = this.program.uniform('u_offset');

        this.program.bind();
        gl.uniform1i(this.program.uniform('u_texture'), 0);
        /** Every stage is expected to bind its own program when drawing, thus, unbinding is not necessary. */
        // this.program.unbind();

        // Configure read back frame buffer and color attachment.

        this.texture = new Texture2(this.context, 'ReadbackRenderTexture');
        this.texture.initialize(vec2.fromValues(1, 1), gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

        this.fbo = new Framebuffer(this.context, 'ReadbackFBO');
        this.fbo.initialize([[gl2facade.COLOR_ATTACHMENT0, this.texture]]);
    }

    /**
     * Specializes this stage's uninitialization. Program and geometry resources are released (if allocated). Cached
     * uniform and attribute locations are invalidated.
     */
    protected onUninitialize(): void {
        super.onUninitialize();

        this.texture.uninitialize();

        if (this.saTriangle) {
            this.saTriangle.uninitialize();
        }
        if (this.program) {
            this.program.uninitialize();
        }
        super.onUninitialize();
    }

    /**
     * Frame implementation clearing depth and ID caches. To avoid unnecessary readbacks (potentially causing sync
     * points), the requested and found IDs and depths are cached by position. Hence, these cached values have to be
     * cleared whenever the frame buffers are written/rendered to.
     */
    protected onFrame() {
        this._cachedDepths.clear();
        this._cachedIDs.clear();
    }

    /**
     * Create a numerical hash that can be used for efficient look-up (number preferred, no string for now). Note that
     * the implementation assumes that we do not exceed 65k pixel in horizontal or vertical resolution soon.
     *
     * @param x - Horizontal coordinate from the upper left corner of the viewport origin.
     * @param y - Vertical coordinate from the upper left corner of the viewport origin.
     */
    protected hash(x: GLint, y: GLint): number {
        return 0xffff * y + x;
    }

    /**
     * Retrieve the depth of a fragment in normalized device coordinates. This function implements the direct readback
     * of uint8x3 encoded depth values from a given frame buffer (see depthFBO and depthAttachment).
     *
     * @param x - Horizontal coordinate from the upper left corner of the viewport origin.
     * @param y - Vertical coordinate from the upper left corner of the viewport origin.
     */
    depthAt_directRead(x: GLint, y: GLint): GLfloat | undefined {
        this.assert_initialized();

        const hash = this.hash(x, y);
        if (this._cachedDepths.has(hash)) {
            return this._cachedDepths.get(hash);
        }

        assert(undefined !== this._depthFBO && this._depthFBO.valid, `valid depth FBO expected for reading back depth`);
        const gl = this.context.gl;
        const size = this._depthFBO.texture(this._depthAttachment).size;

        this._depthFBO.bind();

        if (this.context.isWebGL2 || this.context.supportsDrawBuffers) {
            gl.readBuffer(this._depthAttachment);
        }
        gl.readPixels(x, size[1] - (y + 0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.buffer);

        let depth = decode_float24x1_from_uint8x3(vec3.fromValues(this.buffer[0], this.buffer[1], this.buffer[2]));
        /** @todo fix far plane depth to be at 1.0 */
        depth = depth > 0.996 ? undefined : depth;

        this._cachedDepths.set(hash, depth);
        return depth;
    }

    /**
     * Retrieve the depth of a fragment in normalized device coordinates.
     *
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     */
    depthAt_renderThenRead(x: GLint, y: GLint): GLfloat | undefined {
        this.assert_initialized();

        const hash = this.hash(x, y);
        if (this._cache && this._cachedDepths.has(hash)) {
            return this._cachedDepths.get(hash);
        }

        const gl = this.context.gl;
        const depthTexture = this._depthFBO.texture(this._depthAttachment);
        const size = depthTexture.size;

        // Render a single fragment, thereby encoding the depth render texture data of the requested position.
        gl.viewport(0, 0, 1, 1);

        this.program.bind();
        gl.uniform2f(this.uOffset, x / size[0], (size[1] - y) / size[1]);
        gl.uniform2f(this.uScale, 1.0 / size[0], 1.0 / size[1]);

        depthTexture.bind(gl.TEXTURE0);

        this.fbo.bind();
        this.saTriangle.draw();

        depthTexture.unbind();
        /** Every stage is expected to bind its own program when drawing, thus, unbinding is not necessary. */
        // this.program.unbind();

        // Bind the framebuffer and read back the requested pixel

        if ((this.context.isWebGL2 || this.context.supportsDrawBuffers)
            && gl.readBuffer) {
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
        }
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.buffer);
        this.fbo.unbind();

        let depth = decode_float24x1_from_uint8x3(vec3.fromValues(this.buffer[0], this.buffer[1], this.buffer[2]));
        /** @todo fix far plane depth to be at 1.0 */
        depth = depth > 0.996 ? undefined : depth;

        if (this._cache) {
            this._cachedDepths.set(hash, depth);
        }
        return depth;
    }

    /**
     * Retrieving the world space coordinate of a fragment.
     *
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     * @param zInNDC - optional depth parameter (e.g., from previous query).
     * @param viewProjectionInverse - matrix used to unproject the coordinate from ndc to world space.
     */
    coordsAt(x: GLint, y: GLint, zInNDC: number | undefined, viewProjectionInverse: mat4): vec3 | undefined {
        const size = this._depthFBO.texture(this._depthAttachment).size;
        const depth = zInNDC === undefined ? this.depthAt(x, y) : zInNDC;
        if (depth === undefined) {
            return undefined;
        }
        const p = vec3.fromValues(x * 2.0 / size[0] - 1.0, 1.0 - y * 2.0 / size[1], depth * 2.0 - 1.0);
        return vec3.transformMat4(vec3.create(), p, viewProjectionInverse);
    }

    /**
     * Retrieve the id of an object at fragment position.
     *
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     */
    idAt(x: GLint, y: GLint): GLsizei | undefined {
        this.assert_initialized();

        const hash = this.hash(x, y);
        if (this._cache && this._cachedIDs.has(hash)) {
            return this._cachedIDs.get(hash);
        }

        const gl = this.context.gl;
        const size = this._idFBO.texture(this._idAttachment).size;

        this._idFBO.bind();
        if ((this.context.isWebGL2 || this.context.supportsDrawBuffers)
            && gl.readBuffer) {
            /** @todo implicit assumption here is that if readbuffer does not exists,
             * id FBO already has id target attached to 0.
             */
            gl.readBuffer(this._idAttachment);
        }
        gl.readPixels(x, size[1] - (y + 0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.buffer);

        const id = decode_uint32_from_rgba8(
            vec4.fromValues(this.buffer[0], this.buffer[1], this.buffer[2], this.buffer[3]));

        if (this._cache) {
            this._cachedIDs.set(hash, id);
        }
        return id;
    }

    set depthAttachment(depthAttachment: GLenum) {
        this._depthAttachment = depthAttachment;
    }

    set depthFBO(depthFBO: Framebuffer) {
        this._depthFBO = depthFBO;
    }

    set idAttachment(idAttachment: GLenum) {
        this._idAttachment = idAttachment;
    }

    set idFBO(idFBO: Framebuffer) {
        this._idFBO = idFBO;
    }

    /**
     * Geometry used to draw on (in case of classical blit using a program and this screen aligned quad geometry). This
     * is not provided internally to allow for geometry sharing. If function blit is used, the triangle is not used.
     *
     * @param saTriangle - Screen-aligned triangle for classical blit.
     */
    set saTriangleVBO(saTriangle: ScreenAlignedTriangle) {
        this.assert_initialized();
        if (this.saTriangle) {
            this.saTriangle.initialize(this.context, saTriangle, this.program.attribute('a_vertex', 0));
        }
    }

}
