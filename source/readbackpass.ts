
/* spellchecker: disable */

import { mat4, vec3, vec4 } from 'gl-matrix';

import { assert } from './auxiliaries';
import {
    decode_float24x1_from_uint8x3,
    decode_uint32_from_rgba8,
} from './gl-matrix-extensions';

import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { NdcFillingTriangle } from './ndcfillingtriangle';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2D } from './texture2d';
import { GLsizei2 } from './tuples';

/* spellchecker: enable */


/**
 * This stage provides means to sample G-Buffers, in order to give access to world space coordinates, depth values and
 * IDs. World space coordinates are calculated by sampling the depth value and unprojecting the normalized device
 * coordinates. Depth and ID values are read from the GPU by rendering the requested pixel to a 1x1 texture and reading
 * back the value from this texture. Note that depth and ID values are cached as long as no redraw (frame) was invoked.
 */
export class ReadbackPass extends Initializable {

    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
    protected _context: Context;


    /** @see {@link cache} */
    protected _cache = false;


    /** @see {@link depthFBO} */
    protected _depthFBO: Framebuffer;  // This is used if depth is already uint8x3 encoded

    /** @see {@link depthAttachment} */
    protected _depthAttachment: GLenum = 0;

    /**
     * Cache providing previously read depth values for a given position hash.
     */
    protected _cachedDepths = new Map<GLsizei, GLfloat | undefined>();


    /** @see {@link idFBO} */
    protected _idFBO: Framebuffer;

    /** @see {@link idAttachment} */
    protected _idAttachment: GLenum;

    /**
     * Cache providing previously read id values for a given position hash.
     */
    protected _cachedIDs = new Map<GLsizei, GLsizei | undefined>();


    /**
     * Buffer to read into.
     */
    protected _buffer = new Uint8Array(4);


    /**
     * Properties required for 24bit depth readback workaround. If a valid depth format is available as renderable
     * texture format, a single fragment is rasterized in order to encode the depth of at a specific location into
     * uint8x3 format, rendered into a RGBA texture for readback. This workaround is currently necessary since reading
     * back depth buffer data is not supported. All following protected properties are undefined when this workaround
     * is not required (i.e., in IE11), since the depth texture is already rendered explicitly in a previous render
     * pass.
     */
    protected _texture: Texture2D;
    protected _framebuffer: Framebuffer;

    /**
     * Coordinate reference size @see {@link coordinateReferenceSize}.
     */
    protected _referenceSize: GLsizei2 | undefined;


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
    protected _uOffset: WebGLUniformLocation;
    protected _uScale: WebGLUniformLocation;


    /**
     * Read the the depth of a fragment in normalized device coordinates. The implementation of this function is
     * assigned at initialization based on the available WebGL features.
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     */
    readDepthAt: (x: GLsizei, y: GLsizei) => Uint8Array;


    /**
     * Returns the maximal depth value that can be encoded when using a uint8[3] - @see{@link depthAt}.
     */
    static maxClearDepth(): GLfloat {
        return decode_float24x1_from_uint8x3(vec3.fromValues(255, 255, 255));
    }


    constructor(context: Context) {
        super();
        this._context = context;
    }


    /**
     * Frame implementation clearing depth and ID caches. To avoid unnecessary readbacks (potentially causing sync
     * points), the requested and found IDs and depths are cached by position. Hence, these cached values have to be
     * cleared whenever the framebuffers are written/rendered to.
     */
    protected onFrame(): void {
        this._cachedDepths.clear();
        this._cachedIDs.clear();
    }


    /**
     * Create a numerical hash that can be used for efficient look-up (number preferred, no string for now). Note that
     * the implementation assumes that we do not exceed 65k pixel in horizontal or vertical resolution soon.
     * @param x - Horizontal coordinate from the upper left corner of the viewport origin.
     * @param y - Vertical coordinate from the upper left corner of the viewport origin.
     */
    protected hash(x: GLsizei, y: GLsizei): GLsizei {
        return 0xffff * y + x;
    }

    /**
     * Implements the direct readback of uint8x3 encoded depth values from a given framebuffer (see depthFBO and
     * depthAttachment).
     * @param x - Horizontal coordinate from the upper left corner of the viewport origin.
     * @param y - Vertical coordinate from the upper left corner of the viewport origin.
     * @returns - An array with 4 uint8 entries, the first three of which encode the depth.
     */
    @Initializable.assert_initialized()
    protected directReadDepthAt(x: GLsizei, y: GLsizei): Uint8Array {
        assert(this._depthFBO !== undefined && this._depthFBO.valid, `valid depth FBO expected for reading back depth`);
        const texture = this._depthFBO.texture(this._depthAttachment) as Texture2D;

        const gl = this._context.gl;
        const size = texture.size;

        this._depthFBO.bind();

        const scale = this._referenceSize === undefined ? [1.0, 1.0] :
            [size[0] / this._referenceSize[0], size[1] / this._referenceSize[1]];

        if (this._context.isWebGL2 || this._context.supportsDrawBuffers) {
            gl.readBuffer(this._depthAttachment);
        }
        gl.readPixels(x * scale[0], size[1] - y * scale[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._buffer);
        return this._buffer;
    }


    /**
     * Implements the indirect readback of uint8x3 encoded depth values from a given framebuffer (see depthFBO and
     * depthAttachment). This renders a single pixel (1x1 pixel viewport) with the depth fbo as texture and reads this
     * afterwards. This is a fallback required when direct pixel read from depth attachments is not supported.
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     * @returns - An array with 4 uint8 entries, the first three of which encode the depth.
     */
    @Initializable.assert_initialized()
    renderThenReadDepthAt(x: GLsizei, y: GLsizei): Uint8Array {
        assert(this._depthFBO !== undefined && this._depthFBO.valid, `valid depth FBO expected for reading back depth`);
        const texture = this._depthFBO.texture(this._depthAttachment) as Texture2D;

        const gl = this._context.gl;
        const size = texture.size;

        const scale = this._referenceSize === undefined ? [1.0, 1.0] :
            [size[0] / this._referenceSize[0], size[1] / this._referenceSize[1]];

        /* Render a single fragment, thereby encoding the depth render texture data of the requested position. */
        gl.viewport(0, 0, 1, 1);

        this._program.bind();
        gl.uniform2f(this._uOffset, x * scale[0] / size[0], (size[1] - y * scale[1]) / size[1]);
        gl.uniform2f(this._uScale, 1.0 / size[0], 1.0 / size[1]);

        texture.bind(gl.TEXTURE0);

        this._framebuffer.bind();

        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();

        texture.unbind();

        /** Every stage is expected to bind its own program when drawing, thus, unbinding is not necessary. */
        // this._program.unbind();

        if ((this._context.isWebGL2 || this._context.supportsDrawBuffers) && gl.readBuffer) {
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
        }

        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._buffer);
        this._framebuffer.unbind();

        return this._buffer;
    }


    /**
     * Specializes this pass's initialization. If required. ad screen-filling triangle geometry and a single program
     * are created. All attribute and dynamic uniform locations are cached.
     * @param ndcTriangle - If specified, assumed to be used as shared geometry. If none is specified, a ndc-filling
     * triangle will be created internally.
     * @param direct - If depth is already uint8x3 encoded into a rgb/rgba target no readback workaround is required.
     */
    @Initializable.initialize()
    initialize(ndcTriangle: NdcFillingTriangle | undefined, direct: boolean): boolean {
        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        if (direct) {
            this.readDepthAt = this.directReadDepthAt;
            return true;
        }

        /* Configure read back for depth data. */
        this.readDepthAt = this.renderThenReadDepthAt;


        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices.vert (readback)');
        vert.initialize(require('./shaders/ndcvertices.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'readbackdepth.frag');
        frag.initialize(require('./shaders/readbackdepth.frag'));

        this._program = new Program(this._context, 'ReadbackDepthProgram');
        this._program.initialize([vert, frag], false);

        if (ndcTriangle === undefined) {
            this._ndcTriangle = new NdcFillingTriangle(this._context);
        } else {
            this._ndcTriangle = ndcTriangle;
            this._ndcTriangleShared = true;
        }

        if (!this._ndcTriangle.initialized) {
            this._ndcTriangle.initialize();
        }
        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);
        this._program.link();

        this._uOffset = this._program.uniform('u_offset');
        this._program.bind();
        gl.uniform1i(this._program.uniform('u_texture'), 0);
        this._program.unbind();

        /* Configure read back framebuffer and color attachment. */

        this._texture = new Texture2D(this._context, 'ReadbackRenderTexture');
        this._texture.initialize(1, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

        this._framebuffer = new Framebuffer(this._context, 'ReadbackFBO');
        this._framebuffer.initialize([[gl2facade.COLOR_ATTACHMENT0, this._texture]]);

        return true;
    }


    /**
     * Specializes this stage's uninitialization. Program and geometry resources are released (if allocated). Cached
     * uniform and attribute locations are invalidated.
     */
    @Initializable.uninitialize()
    uninitialize(): void {
        if (this._context.isWebGL1 && !this._context.supportsDepthTexture) {
            return;
        }

        if (!this._ndcTriangleShared && this._ndcTriangle.initialized) {
            this._ndcTriangle.uninitialize();
        }

        this._program.uninitialize();

        this._texture.uninitialize();
        this._framebuffer.uninitialize();
    }

    /**
     * Retrieve the depth of a fragment in normalized device coordinates. The implementation of this function is
     * assigned at initialization based on the available WebGL features. Please note that in order to get the far plane
     * depth at just below 1.0, the clear depth should be set to:
     *     float24x1_from_uint8x3([255,255, 255]) = 0.9999999403953552
     * This will result in a readback of [255, 255, 255] and is the deepest depth value representable using a uint8x3.
     * Using 1.0 should result in [256, 0, 0] and would be easy to detect, however, it is somehow clamped to [255, 0, 0]
     * which is highly misleading and actual not nearly the far plane's depth. Thus, if [255, 255, 255] is read back,
     * undefined will be returned by this query and thereby reduce the effective depth range by 1 over 255^3 - sorry.
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     */
    @Initializable.assert_initialized()
    depthAt(x: GLsizei, y: GLsizei): GLfloat | undefined {

        const hash = this.hash(x, y);
        if (this._cache && this._cachedDepths.has(hash)) {
            return this._cachedDepths.get(hash);
        }

        const buffer: Uint8Array = this.readDepthAt(x, y);

        /* See notes above for more info on this weird convention. */
        const depth: GLfloat | undefined = buffer[0] === 255 && buffer[1] === 255 && buffer[2] === 255 ?
            undefined : decode_float24x1_from_uint8x3(vec3.fromValues(buffer[0], buffer[1], buffer[2]));

        if (this._cache) {
            this._cachedDepths.set(hash, depth);
        }

        return depth;
    }

    /**
     * Retrieving the world space coordinate of a fragment.
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     * @param zInNDC - optional depth parameter (e.g., from previous query).
     * @param viewProjectionInverse - matrix used to unproject the coordinate from ndc to world space.
     * @returns - The unprojected world space coordinate at location x, y.
     */
    @Initializable.assert_initialized()
    coordsAt(x: GLsizei, y: GLsizei, zInNDC: number | undefined, viewProjectionInverse: mat4): vec3 | undefined {
        const size = (this._depthFBO.texture(this._depthAttachment) as Texture2D).size;
        const depth = zInNDC === undefined ? this.depthAt(x, y) : zInNDC;
        if (depth === undefined) {
            return undefined;
        }

        const scale = this._referenceSize === undefined ? [1.0, 1.0] :
            [size[0] / this._referenceSize[0], size[1] / this._referenceSize[1]];

        const p = vec3.fromValues(
            x * scale[0] * 2.0 / size[0] - 1.0, 1.0 - y * scale[1] * 2.0 / size[1], depth * 2.0 - 1.0);

        return vec3.transformMat4(vec3.create(), p, viewProjectionInverse);
    }

    /**
     * Retrieve the id of an object at fragment position.
     * @param x - Horizontal coordinate for the upper left corner of the viewport origin.
     * @param y - Vertical coordinate for the upper left corner of the viewport origin.
     * @returns - The id rendered at location x, y.
     */
    @Initializable.assert_initialized()
    idAt(x: GLsizei, y: GLsizei): GLsizei | undefined {
        const hash = this.hash(x, y);
        if (this._cache && this._cachedIDs.has(hash)) {
            return this._cachedIDs.get(hash);
        }

        const gl = this._context.gl;
        const size = (this._idFBO.texture(this._idAttachment) as Texture2D).size;

        const scale = this._referenceSize === undefined ? [1.0, 1.0] :
            [size[0] / this._referenceSize[0], size[1] / this._referenceSize[1]];

        this._idFBO.bind();
        if (this._context.isWebGL2) {
            gl.readBuffer(this._idAttachment);
        }
        gl.readPixels(x * scale[0], size[1] - y * scale[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._buffer);

        const id = decode_uint32_from_rgba8(
            vec4.fromValues(this._buffer[0], this._buffer[1], this._buffer[2], this._buffer[3]));

        if (this._cache) {
            this._cachedIDs.set(hash, id);
        }
        return id;
    }


    /**
     * Invokes the frame implementation @see{@link onFrame}.
     */
    frame(): void {
        this.onFrame();
    }


    /**
     * Whether or not caching of requested depths and ids should be used to reduce performance impact.
     */
    set cache(value: boolean) {
        this._cache = value;
    }


    /**
     * Sets the framebuffer object that is to be used for depth readback.
     * @param framebuffer - Framebuffer that is to be used for depth readback.
     */
    set depthFBO(framebuffer: Framebuffer) {
        this._depthFBO = framebuffer;
    }

    /**
     * Sets the framebuffer's {@link depthFBO} depth attachment that is to be used for depth readback.
     * @param attachment - Depth attachment that is to be used for depth readback.
     */
    set depthAttachment(attachment: GLenum) {
        this._depthAttachment = attachment;
    }

    /**
     * Sets the framebuffer object that is to be used for id readback.
     * @param framebuffer - Framebuffer that is to be used for id readback.
     */
    set idFBO(framebuffer: Framebuffer) {
        this._idFBO = framebuffer;
    }

    /**
     * Sets the framebuffer's {@link idFBO} id attachment that is to be used for id readback.
     * @param attachment - ID attachment that is to be used for id readback.
     */
    set idAttachment(attachment: GLenum) {
        this._idAttachment = attachment;
    }

    /**
     * Sets the coordinate-reference size that is, if not undefined, used to scale incomming x and y coordinates.
     * @param size - Size of the output, e.g., the canvas, the buffer is rendered to.
     */
    set coordinateReferenceSize(size: GLsizei2 | undefined) {
        this._referenceSize = size;
    }

}
