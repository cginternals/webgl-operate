
import { assert } from './common';
import { byteSizeOfFormat } from './formatbytesizes';

import { Bindable } from './bindable';
import { assert_initialized } from './initializable';
import { AbstractObject } from './object';


/**
 * WebGL Renderbuffer implementation providing size accessors and requiring for bind, unbind, resize, validity, and
 * initialization implementations.
 * ```
 * @todo add usage example
 * ```
 */
export class Renderbuffer extends AbstractObject<WebGLRenderbuffer> implements Bindable {

    /**
     * Default renderbuffer, e.g., used for unbind.
     */
    static readonly DEFAULT_RENDER_BUFFER = undefined;

    /**
     * @see {@link width}
     */
    protected _width: GLsizei;

    /**
     * @see {@link height}
     */
    protected _height: GLsizei;

    /**
     * Cached internal format of the renderbuffer for efficient resize.
     */
    protected _internalFormat: GLenum | undefined = undefined;

    /**
     * Create a renderbuffer object on the GPU.
     * @param context - Stored for local access to the WebGL API.
     * @param size - Initial size of the renderbuffer.
     * @param internalFormat - Internal format of the renderbuffer data.
     */
    protected create(width: GLsizei, height: GLsizei, internalFormat: GLenum): WebGLRenderbuffer | undefined {
        assert(width > 0 && height > 0, `renderbuffer object requires valid width and height greater than zero`);
        const gl = this.context.gl;

        this._width = width;
        this._height = height;
        this._internalFormat = internalFormat;

        this.bind();
        gl.renderbufferStorage(gl.RENDERBUFFER, this._internalFormat, this._width, this._height);
        this.context.allocationRegister.allocate(this._identifier, this.bytes);
        this.unbind();

        /* note that gl.isRenderbuffer requires the renderbuffer to be bound */
        this._valid = this._object instanceof WebGLRenderbuffer;
        return this.context.gl.createRenderbuffer();
    }

    /**
     * Delete the renderbuffer object on the GPU.
     * This should have the reverse effect of ```create```.
     */
    protected delete(): void {
        this.context.gl.deleteRenderbuffer(this._object);
        this.context.allocationRegister.reallocate(this._identifier, 0);

        this._width = 0;
        this._height = 0;
        this._internalFormat = undefined;
    }

    /**
     * Bind the renderbuffer object.
     */
    @assert_initialized()
    bind(): void {
        this.context.gl.bindRenderbuffer(this.context.gl.RENDERBUFFER, this._object);
    }

    /**
     * Unbind the renderbuffer object.
     */
    @assert_initialized()
    unbind(): void {
        this.context.gl.bindRenderbuffer(this.context.gl.RENDERBUFFER, undefined);
    }

    /**
     * This should be used to implement efficient resize for all attachments.
     * @param width - Targeted/new width of the renderbuffer in px.
     * @param height - Targeted/new height of the renderbuffer in px.
     * @param bind - Allows to skip binding the renderbuffer (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the renderbuffer (e.g., when binding is handled outside).
     */
    @assert_initialized()
    resize(width: GLsizei, height: GLsizei, bind: boolean = false, unbind: boolean = false): void {
        if (width === this._width && height === this._height) {
            return;
        }
        this._width = width;
        this._height = height;

        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.renderbufferStorage(gl.RENDERBUFFER, this._internalFormat, this._width, this._height);
        this.context.allocationRegister.reallocate(this._identifier, this.bytes);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Returns the number of bytes this object approximately allocates on the GPU.
     */
    get bytes(): GLsizei {
        this.assertInitialized();
        return this._width * this._height * byteSizeOfFormat(this.context, this._internalFormat as GLenum);
    }

    /**
     * Readonly access to the internal format of the renderbuffer object. This can only be changed by re-initialization.
     */
    get internalFormat(): GLenum {
        this.assertInitialized();
        return this._internalFormat as GLenum;
    }

    /**
     * Convenience accessor: returns the width of the texture object.
     */
    get width(): GLsizei {
        this.assertInitialized();
        return this._width;
    }

    /**
     * Convenience accessor: returns the height of the texture object.
     */
    get height(): GLsizei {
        this.assertInitialized();
        return this._height;
    }

}
