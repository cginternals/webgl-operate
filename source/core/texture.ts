
import { vec2 } from 'gl-matrix';

import { assert } from './common';
import { byteSizeOfFormat } from './formatbytesizes';

import { Bindable } from './bindable';
import { assert_initialized } from './initializable';
import { AbstractObject } from './object';


/**
 * Wrapper for an WebGL 2D texture providing size accessors and requiring for bind, unbind, resize, validity, and
 * initialization implementations.
 */
export class Texture2 extends AbstractObject<WebGLTexture> implements Bindable {

    /**
     * Default texture, e.g., used for unbind.
     */
    static readonly DEFAULT_TEXTURE = undefined;

    /**
     * Caches whether or not image data was passed to the texture object in order to track allocated bytes.
     */
    protected _bytes: GLsizei = 0;

    /**
     * @see {@link width}
     */
    protected _width: GLsizei;

    /**
     * @see {@link height}
     */
    protected _height: GLsizei;

    /**
     * @see {@link internalFormat}
     */
    protected _internalFormat: GLenum | undefined;

    /**
     * @see {@link format}
     */
    protected _format: GLenum | undefined;

    /**
     * @see {@link type}
     */
    protected _type: GLenum | undefined;

    /**
     * Create a texture object on the GPU.
     * @param width - Initial width of the texture in px.
     * @param height - Initial height of the texture in px.
     * @param internalFormat - Internal format of the texture object.
     * @param format - Format of the texture data even though no data is passed.
     * @param type - Data type of the texel data.
     */
    protected create(width: GLsizei, height: GLsizei, internalFormat: GLenum, format: GLenum, type: GLenum
        , data?: ArrayBufferView): WebGLTexture | undefined {
        const gl = this._context.gl;

        this._object = gl.createTexture();

        assert(width > 0 && height > 0, `texture requires valid width and height of greater than zero`);

        this._width = width;
        this._height = height;

        this._internalFormat = internalFormat;
        this._format = format;
        this._type = type;

        this.filter(gl.NEAREST, gl.NEAREST, true, false);
        this.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, false, false);
        if (data !== undefined) {
            this.data(data, false, false);
        }
        this.unbind();

        /* note that gl.isTexture requires the texture to be bound */
        this._valid = this._object instanceof WebGLTexture;

        return this._object;
    }

    /**
     * Delete the texture object on the GPU. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        const gl = this._context.gl;
        assert(this._object instanceof WebGLTexture, `expected WebGLTexture object`);

        gl.deleteTexture(this._object);
        this._object = undefined;
        this._valid = false;

        this._internalFormat = undefined;
        this._format = undefined;
        this._type = undefined;

        this._width = 0;
        this._height = 0;
    }

    /**
     * Bind the texture object to a texture unit.
     */
    @assert_initialized()
    bind(unit?: GLenum): void {
        const gl = this.context.gl;
        if (unit) {
            gl.activeTexture(unit);
        }
        gl.bindTexture(gl.TEXTURE_2D, this._object);
    }

    /**
     * Unbind the texture object from a texture unit.
     */
    @assert_initialized()
    unbind(unit?: GLenum): void {
        const gl = this.context.gl;
        if (unit) {
            gl.activeTexture(unit);
        }
        gl.bindTexture(gl.TEXTURE_2D, Texture2.DEFAULT_TEXTURE);
    }

    /**
     * Pass image data to the texture object.
     * @param data - Texel data that will be copied into the objects data store.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @assert_initialized()
    data(data: ArrayBufferView | undefined, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, this._internalFormat, this._width, this._height, 0, this._format, this._type
            /* tslint:disable-next-line:no-null-keyword */
            , data === undefined ? null : data);  // must be 'null', not '0' nor 'undefined' for ie and edge to work
        if (unbind) {
            this.unbind();
        }

        if (data !== undefined) {
            this._bytes = this.width * this.height * byteSizeOfFormat(this.context, this._internalFormat as GLenum);
            // Fix in case of implicit float and half-float texture generation (e.g., in webgl with half_float support).
            if (this._type === this.context.gl2facade.HALF_FLOAT && this._internalFormat !== this.context.gl.RGBA16F) {
                this._bytes *= 2;
            } else if (this._type === this.context.gl.FLOAT && this._internalFormat !== this.context.gl.RGBA16F) {
                this._bytes *= 4;
            }
        } else {
            this._bytes = 0;
        }
        this.context.allocationRegister.reallocate(this._identifier, this._bytes);
    }

    /**
     * Sets the texture object's magnification and minification filter.
     * @param mag - Value for the TEXTURE_MAG_FILTER parameter.
     * @param min - Value for the TEXTURE_MIN_FILTER parameter.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @assert_initialized()
    filter(mag: GLenum, min: GLenum, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Sets the texture object's wrapping function for s and t coordinates.
     *
     * @param wrap_s - Value for the TEXTURE_WRAP_S parameter.
     * @param wrap_t - Value for the TEXTURE_WRAP_T parameter.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @assert_initialized()
    /* tslint:disable-next-line:variable-name */
    wrap(wrap_s: GLenum, wrap_t: GLenum, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap_s);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap_t);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * This can be used to reformat the texture image without creating a new texture object. Please note that this
     * resets the texture's image data to undefined. @see { @link data } for setting new image data.
     * @param internalFormat - Internal format of the texture object.
     * @param format - Format of the texture data even though no data is passed.
     * @param type - Data type of the texel data.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @assert_initialized()
    reformat(internalFormat: GLenum, format?: GLenum, type?: GLenum
        , bind: boolean = true, unbind: boolean = true): void {

        if (internalFormat === this._internalFormat
            && (format === undefined || format === this._format)
            && (type === undefined || type === this._type)) {
            return;
        }
        assert(internalFormat !== undefined, `valid internal format expected`);
        this._internalFormat = internalFormat;

        if (format) {
            this._format = format;
        }
        if (type) {
            this._type = type;
        }

        this.data(undefined, bind, unbind);
    }

    /**
     * This should be used to implement efficient resize the texture.
     * @param size - Targeted texture resolution in pixel.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @assert_initialized()
    resize(width: GLsizei, height: GLsizei, bind: boolean = false, unbind: boolean = false): void {
        if (width === this._width && height === this._height) {
            return;
        }
        this.data(undefined, bind, unbind);
    }

    /**
     * Returns the number of bytes this object approximately allocates on the GPU.
     */
    @assert_initialized()
    get bytes(): GLsizei {
        return this._bytes;
    }

    /**
     * Cached internal format of the texture for efficient resize. This can only be changed by re-initialization.
     */
    @assert_initialized()
    get internalFormat(): GLenum {
        return this._internalFormat as GLenum;
    }

    /**
     * Cached format of the data provided to the texture object for efficient resize. This is set on initialization and
     * might change on data transfers.
     */
    @assert_initialized()
    get format(): GLenum {
        return this._format as GLenum;
    }

    /**
     * Cached type of the data provided to the texture used for efficient resize. This is set on initialization and
     * might change on data transfers.
     */
    @assert_initialized()
    get type(): GLenum {
        return this._type as GLenum;
    }

    /**
     * Convenience accessor: returns the width of the texture object.
     */
    @assert_initialized()
    get width(): GLsizei {
        return this._width;
    }

    /**
     * Convenience accessor: returns the height of the texture object.
     */
    @assert_initialized()
    get height(): GLsizei {
        return this._height;
    }

}
