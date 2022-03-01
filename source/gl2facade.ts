
/* spellchecker: disable */

import { assert, logIf, LogLevel } from './auxiliaries';

import { Context } from './context';

/* spellchecker: enable */


export type TexImage2DData = GLintptr | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement |
    ImageBitmap | ImageData | ArrayBufferView | undefined;

export type TexImage3DData = GLintptr | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement |
    ImageBitmap | ImageData | ArrayBufferView | undefined;

/**
 * A WebGL 2 facade, simplifying the access to gl functions that are either not available, exposed via extension or
 * supported directly, e.g., in webgl2. All gl features/interfaces handled by this facade are mandatory.
 */
export class GL2Facade {

    /**
     * @param context - Wrapped gl context for function resolution.
     */
    constructor(context: Context) {
        assert(context !== undefined, `gl2 facade expects a valid WebGL context`);

        this.queryHalfFloatSupport(context);
        this.queryColorAttachments(context);
        this.queryInstancedArraySupport(context);
        this.queryDrawBuffersSupport(context);
        this.queryVertexArrayObjectSupport(context);
        this.queryMaxUniformVec3Components(context);
        this.queryBufferSubDataInterface(context);
        this.queryTexImageInterface(context);
    }


    // HALF FLOAT

    /**
     * Stores the HALF_FLOAT enum if supported. @see {@link HALF_FLOAT}
     */
    protected _halfFloat: GLenum;

    /**
     * The HALF_FLOAT format enum. Is `undefined` if not supported.
     */
    get HALF_FLOAT(): GLenum {
        return this._halfFloat;
    }

    /**
     *  For WebGL1 the HALF_FLOAT enum needs to be saved via the extension object.
     */
    protected queryHalfFloatSupport(context: Context): void {
        switch (context.backend) {
            case Context.BackendType.WebGL1:
                this._halfFloat = context.supportsTextureHalfFloat && context.textureHalfFloat ?
                    context.textureHalfFloat.HALF_FLOAT_OES : undefined;
                break;

            case Context.BackendType.WebGL2:
            /* falls through */
            default:
                this._halfFloat = context.gl.HALF_FLOAT;
                break;
        }
    }


    // COLOR ATTACHMENTS

    /**
     * Stores the lowest color attachment identifier.
     */
    protected _colorAttachmentMin: GLenum;
    /**
     * The lowest color attachment identifier format enum.
     */
    get COLOR_ATTACHMENT_MIN(): GLenum {
        return this._colorAttachmentMin;
    }

    /**
     * Stores the highest supported color attachment identifier.
     */
    protected _colorAttachmentMax: GLenum;

    /**
     * Stores all context/backend sepcific color attachment identifier for COLOR_ATTACHMENT# getter.
     */
    protected _colorAttachments: Array<GLenum>;

    /**
     * The lowest color attachment identifier format enum.
     * Is at least `COLOR_ATTACHMENT_MIN`.
     */
    get COLOR_ATTACHMENT_MAX(): GLenum {
        return this._colorAttachmentMax;
    }

    get COLOR_ATTACHMENT0(): GLenum {
        return this._colorAttachments[0];
    }
    get COLOR_ATTACHMENT1(): GLenum {
        return this._colorAttachments[1];
    }
    get COLOR_ATTACHMENT2(): GLenum {
        return this._colorAttachments[2];
    }
    get COLOR_ATTACHMENT3(): GLenum {
        return this._colorAttachments[3];
    }
    get COLOR_ATTACHMENT4(): GLenum {
        return this._colorAttachments[4];
    }
    get COLOR_ATTACHMENT5(): GLenum {
        return this._colorAttachments[5];
    }
    get COLOR_ATTACHMENT6(): GLenum {
        return this._colorAttachments[6];
    }
    get COLOR_ATTACHMENT7(): GLenum {
        return this._colorAttachments[7];
    }
    get COLOR_ATTACHMENT8(): GLenum {
        return this._colorAttachments[8];
    }
    get COLOR_ATTACHMENT9(): GLenum {
        return this._colorAttachments[9];
    }
    get COLOR_ATTACHMENT10(): GLenum {
        return this._colorAttachments[10];
    }
    get COLOR_ATTACHMENT11(): GLenum {
        return this._colorAttachments[11];
    }
    get COLOR_ATTACHMENT12(): GLenum {
        return this._colorAttachments[12];
    }
    get COLOR_ATTACHMENT13(): GLenum {
        return this._colorAttachments[13];
    }
    get COLOR_ATTACHMENT14(): GLenum {
        return this._colorAttachments[14];
    }
    get COLOR_ATTACHMENT15(): GLenum {
        return this._colorAttachments[15];
    }

    /**
     * Queries the valid range of color attachments and provides an interface for convenience.
     */
    protected queryColorAttachments(context: Context): void {
        const gl = context.gl;

        this._colorAttachments = new Array<GLenum>(16);
        this._colorAttachments[0] = gl.COLOR_ATTACHMENT0;

        /**
         * In WebGL, draw buffers is supported by extension, in WebGL2 by default.
         * This maps the various default color attachment identifier to a unified interface.
         */
        switch (context.backend) {
            case Context.BackendType.WebGL1:
                const drawBuffers = context.supportsDrawBuffers ? context.drawBuffers : undefined;

                this._colorAttachmentMin = this._colorAttachments[0];
                this._colorAttachmentMax = this._colorAttachmentMin + (drawBuffers ?
                    gl.getParameter(drawBuffers.MAX_COLOR_ATTACHMENTS_WEBGL) : 0) as GLenum;

                this._colorAttachments[0] = drawBuffers ? drawBuffers.COLOR_ATTACHMENT0_WEBGL : gl.COLOR_ATTACHMENT0;
                if (!drawBuffers) {
                    break;
                }
                for (let i = 1; i < 16; ++i) {
                    // Enums are assumed to be incremental in their definition ...
                    this._colorAttachments[i] = drawBuffers.COLOR_ATTACHMENT0_WEBGL + i;
                }
                break;

            case Context.BackendType.WebGL2:
            /* falls through */
            default:
                this._colorAttachmentMin = context.gl.COLOR_ATTACHMENT0;
                this._colorAttachmentMax = context.gl.COLOR_ATTACHMENT0
                    + gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) as GLenum;

                for (let i = 0; i < 16; ++i) {
                    // Enums are assumed to be incremental in their definition ...
                    this._colorAttachments[i] = gl.COLOR_ATTACHMENT0 + i;
                }
                break;
        }
    }


    // INSTANCED ARRAYS

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/ANGLE_instanced_arrays/drawArraysInstancedANGLE
     */
    drawArraysInstanced: (mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) => void;
    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/ANGLE_instanced_arrays/drawElementsInstancedANGLE
     */
    drawElementsInstanced: (mode: GLenum, count: GLint, type: GLsizei, offset: GLintptr, primcount: GLsizei) => void;
    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/ANGLE_instanced_arrays/vertexAttribDivisorANGLE
     */
    vertexAttribDivisor: (index: GLuint, divisor: GLuint) => void;

    /**
     * Evaluate whether or not ANGLE_instanced_arrays is supported (either by extension or in WebGL2 by default) and, if
     * supported, binds the associated functions.
     * @param context - WebGL context to query extension support in
     */
    protected queryInstancedArraySupport(context: Context): void {
        if (!context.isWebGL2 && !context.supportsInstancedArrays) {
            return;
        }

        this.drawArraysInstanced = context.isWebGL2 ?
            (mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) =>
                context.gl.drawArraysInstanced(mode, first, count, instanceCount) :
            (mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) =>
                context.instancedArrays.drawArraysInstancedANGLE(mode, first, count, instanceCount);

        this.drawElementsInstanced = context.isWebGL2 ?
            (mode: GLenum, count: GLint, type: GLsizei, offset: GLintptr, primcount: GLsizei) =>
                context.gl.drawElementsInstanced(mode, count, type, offset, primcount) :
            (mode: GLenum, count: GLint, type: GLsizei, offset: GLintptr, primcount: GLsizei) =>
                context.instancedArrays.drawElementsInstancedANGLE(mode, count, type, offset, primcount);

        this.vertexAttribDivisor = context.isWebGL2 ?
            (index: GLuint, divisor: GLuint) => context.gl.vertexAttribDivisor(index, divisor) :
            (index: GLuint, divisor: GLuint) => context.instancedArrays.vertexAttribDivisorANGLE(index, divisor);
    }


    // DRAW BUFFERS

    /**
     * Stores the MAX_DRAW_BUFFERS enum if supported. @see {@link MAX_DRAW_BUFFERS}
     */
    protected _maxDrawBuffers: GLenum;

    /**
     * The MAX_DRAW_BUFFERS format enum. Is `undefined` if not supported.
     */
    get MAX_DRAW_BUFFERS(): GLenum {
        return this._maxDrawBuffers;
    }


    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_draw_buffers/drawBuffersWEBGL
     */
    drawBuffers: ((buffers: Array<GLenum>) => void) | undefined = undefined;

    /**
     * Evaluate whether or not WEBGL_draw_buffers is supported (either by extension or in WebGL2 by default) and, if
     * supported, binds the associated functions.
     * @param context - WebGL context to query extension support in.
     */
    protected queryDrawBuffersSupport(context: Context): void {
        if (!context.isWebGL2 && !context.supportsDrawBuffers) {
            return;
        }

        this.drawBuffers = context.isWebGL2 ?
            (buffers: Array<GLenum>) => context.gl.drawBuffers(buffers) :
            (buffers: Array<GLenum>) => context.drawBuffers.drawBuffersWEBGL(buffers);

        this._maxDrawBuffers = context.isWebGL2 ?
            context.gl.MAX_DRAW_BUFFERS :
            context.drawBuffers.MAX_DRAW_BUFFERS_WEBGL;
    }


    // VERTEX ARRAY

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/createVertexArray
     */
    createVertexArray: () => any /* WebGLVertexArrayObject */;

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/createVertexArray
     */
    deleteVertexArray: (arrayObject: any /* WebGLVertexArrayObject */) => void;

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/isVertexArray
     */
    isVertexArray: (arrayObject: any /* WebGLVertexArrayObject */) => GLboolean;

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/bindVertexArray
     */
    bindVertexArray: (arrayObject: any /* WebGLVertexArrayObject */) => void;

    protected queryVertexArrayObjectSupport(context: Context): void {
        if (!context.isWebGL2 && !context.supportsVertexArrayObject) {
            return;
        }

        this.createVertexArray = context.isWebGL2 ?
            () => context.gl.createVertexArray() :
            () => context.vertexArrayObject.createVertexArrayOES();

        this.deleteVertexArray = context.isWebGL2 ?
            (arrayObject: any) => context.gl.deleteVertexArray(arrayObject) :
            (arrayObject: any) => context.vertexArrayObject.deleteVertexArrayOES(arrayObject);

        this.isVertexArray = context.isWebGL2 ?
            (arrayObject: any) => context.gl.isVertexArray(arrayObject) :
            (arrayObject: any) => context.vertexArrayObject.isVertexArrayOES(arrayObject);

        this.bindVertexArray = context.isWebGL2 ?
            (arrayObject: any) => context.gl.bindVertexArray(arrayObject) :
            (arrayObject: any) => context.vertexArrayObject.bindVertexArrayOES(arrayObject);
    }


    // MAX UNIFORM COMPONENTS

    /** @see {@link maxUniformVec3Components} */
    protected _maxUniformVec3Components: GLint | undefined;
    /**
     * The maximum number of floats, integers, or booleans that can be in storage for a vertex shader.
     */
    get maxUniformVec3Components(): GLint | undefined {
        return this._maxUniformVec3Components;
    }

    /**
     * Query and store the maximum number of floats, integers, or booleans that can be in storage for a vertex shader.
     * @param context - WebGL context to query the value in.
     */
    protected queryMaxUniformVec3Components(context: Context): void {
        const gl = context.gl;

        this._maxUniformVec3Components = context.isWebGL2
            ? gl.getParameter(gl.MAX_VERTEX_UNIFORM_COMPONENTS)
            : gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) * 3;
    }


    // BUFFER INTERFACE

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferSubData
     */
    bufferSubData: (target: GLenum, dstByteOffset: GLintptr,
        srcData: ArrayBufferView | ArrayBuffer, srcOffset: GLuint, length: GLuint) => void;

    protected queryBufferSubDataInterface(context: Context): void {
        const gl = context.gl;

        if (context.isWebGL2) {
            this.bufferSubData = (target: GLenum, dstByteOffset: GLintptr,
                srcData: ArrayBufferView | ArrayBuffer, srcOffset: GLuint, length: GLuint = 0) => {

                return gl.bufferSubData(target, dstByteOffset, srcData, srcOffset, length);
            };
        } else {
            this.bufferSubData = (target: GLenum, dstByteOffset: GLintptr,
                srcData: ArrayBufferView | ArrayBuffer, srcOffset: GLuint = 0, length: GLuint = 0) => {

                logIf(srcOffset !== 0, LogLevel.Warning, `srcOffset ignored (not supported in WebGL)`);
                logIf(length !== 0, LogLevel.Warning, `length ignored (not supported in WebGL)`);
                return gl.bufferSubData(target, dstByteOffset, srcData);
            };
        }
    }

    // TEX IMAGE INTERFACE

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
     */
    texImage2D: (target: GLenum, level: GLint, internalformat: GLenum, width: GLsizei, height: GLsizei,
        border: GLint, format: GLenum, type: GLenum, source?: TexImage2DData, offset?: GLintptr) => void;

    /**
     * @link https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/texImage3D
     */
    texImage3D: (target: GLenum, level: GLint, internalformat: GLenum, width: GLsizei, height: GLsizei, depth: GLsizei,
        border: GLint, format: GLenum, type: GLenum, source?: TexImage3DData, offset?: GLintptr) => void;

    protected queryTexImageInterface(context: Context): void {
        const gl = context.gl;

        if (context.isWebGL2) {
            this.texImage2D = (target: GLenum, level: GLint, internalformat: GLenum,
                width: GLsizei, height: GLsizei, border: GLint,
                format: GLenum, type: GLenum, source?: TexImage2DData, offset?: GLintptr) => {
                /* Please note that source must be 'null', not '0' nor 'undefined' for ie and edge to work. */
                if (source instanceof ArrayBuffer) {
                    return gl.texImage2D(target, level, internalformat, width, height, border
                        , format, type, source === undefined ? null : source, offset);
                }
                assert(offset === undefined, `offset expected to be undefined for non ArrayBuffer source`);
                return gl.texImage2D(target, level, internalformat, width, height, border
                    , format, type, source === undefined ? null : source);
            };

        } else {
            this.texImage2D = (target: GLenum, level: GLint, internalformat: GLenum,
                width: GLsizei, height: GLsizei, border: GLint,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                format: GLenum, type: GLenum, source?: TexImage2DData, offset?: GLintptr) => {

                if (source === undefined) {
                    return gl.texImage2D(target, level, internalformat, width, height, border, format, type, null);
                }
                if (source instanceof Int8Array ||
                    source instanceof Uint8Array ||
                    source instanceof Uint8ClampedArray ||
                    source instanceof Int16Array ||
                    source instanceof Uint16Array ||
                    source instanceof Int32Array ||
                    source instanceof Uint32Array ||
                    source instanceof Float32Array ||
                    source instanceof Float64Array ||
                    source instanceof DataView) {
                    return gl.texImage2D(target, level, internalformat, width, height, border, format, type, source);
                }
                return gl.texImage2D(target, level, internalformat, format, type, source);
            };
        }

        if (context.supportsTexImage3D) {
            this.texImage3D = (target: GLenum, level: GLint, internalformat: GLenum,
                width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint,
                format: GLenum, type: GLenum, source?: TexImage3DData, offset?: GLintptr) => {
                /* Please note that source must be 'null', not '0' nor 'undefined' for ie and edge to work. */
                if (source instanceof ArrayBuffer) {
                    return gl.texImage3D(target, level, internalformat, width, height, depth, border
                        , format, type, source === undefined ? null : source, offset);
                }
                assert(offset === undefined, `offset expected to be undefined for non ArrayBuffer source`);
                return gl.texImage3D(target, level, internalformat, width, height, depth, border
                    , format, type, source === undefined ? null : source);
            };
        } else {
            /* eslint-disable @typescript-eslint/no-unused-vars */
            this.texImage3D = (target: GLenum, level: GLint, internalformat: GLenum,
                width: GLsizei, height: GLsizei, depth: GLsizei, border: GLint,
                format: GLenum, type: GLenum, source?: TexImage3DData, offset?: GLintptr) =>
                assert(false, 'texImage3D not supported on this context');
            /* eslint-enable @typescript-eslint/no-unused-vars */
        }
    }

}
