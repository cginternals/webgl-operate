
/* spellchecker: disable */

import { assert } from './auxiliaries';
import { byteSizeOfFormat } from './formatbytesizes';
import { GLsizei2 } from './tuples';

import { Bindable } from './bindable';
import { Initializable } from './initializable';
import { AbstractObject } from './object';

/* spellchecker: enable */


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

    /** @see {@link width} */
    protected _width: GLsizei;

    /** @see {@link height} */
    protected _height: GLsizei;

    /**
     * Cached internal format of the renderbuffer for efficient resize.
     */
    protected _internalFormat: GLenum | undefined = undefined;

    /**
     * Cached sample count for multisampling.
     */
    protected _samples: GLsizei;

    /**
     * Create a renderbuffer object on the GPU.
     * @param width - Initial width of the renderbuffer.
     * @param height - Initial height of the renderbuffer.
     * @param internalFormat - Internal format of the renderbuffer data.
     */
    protected create(width: GLsizei, height: GLsizei, internalFormat: GLenum, samples = 1): WebGLRenderbuffer | undefined {
        assert(width > 0 && height > 0, `renderbuffer object requires valid width and height greater than zero`);
        const gl = this.context.gl;

        this._object = gl.createRenderbuffer();

        this._width = width;
        this._height = height;
        this._internalFormat = internalFormat;
        this._samples = samples;

        gl.bindRenderbuffer(gl.RENDERBUFFER, this._object);
        if (this._samples > 1) {
            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this._samples, internalFormat, width, height);
        } else {
            gl.renderbufferStorage(gl.RENDERBUFFER, internalFormat, width, height);
        }
        /* note that gl.isRenderbuffer requires the renderbuffer to be bound */
        this._valid = gl.isRenderbuffer(this._object);
        gl.bindRenderbuffer(gl.RENDERBUFFER, Renderbuffer.DEFAULT_RENDER_BUFFER);

        const bytes: GLsizei = width * height * byteSizeOfFormat(this.context, internalFormat!);
        this.context.allocationRegister.reallocate(this._identifier, bytes);

        return this._object;
    }

    /**
     * Delete the renderbuffer object on the GPU. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        assert(this._object instanceof WebGLRenderbuffer, `expected WebGLRenderbuffer object`);
        this.context.gl.deleteRenderbuffer(this._object);

        this._object = undefined;
        this._valid = false;

        this._internalFormat = undefined;

        this._width = 0;
        this._height = 0;
    }


    /**
     * Bind the renderbuffer object.
     */
    @Initializable.assert_initialized()
    bind(): void {
        this.context.gl.bindRenderbuffer(this.context.gl.RENDERBUFFER, this._object);
    }

    /**
     * Unbind the renderbuffer object.
     */
    @Initializable.assert_initialized()
    unbind(): void {
        this.context.gl.bindRenderbuffer(this.context.gl.RENDERBUFFER, Renderbuffer.DEFAULT_RENDER_BUFFER);
    }

    /**
     * This should be used to implement efficient resize for all attachments.
     * @param width - Targeted/new width of the renderbuffer in px.
     * @param height - Targeted/new height of the renderbuffer in px.
     * @param bind - Allows to skip binding the renderbuffer (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the renderbuffer (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
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
        if (this._samples > 1) {
            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this._samples, this._internalFormat, width, height);
        } else {
            gl.renderbufferStorage(gl.RENDERBUFFER, this._internalFormat, width, height);
        }
        if (unbind) {
            this.unbind();
        }

        // update allocated bytes
        const bytes: GLsizei = width * height * byteSizeOfFormat(this.context, this._internalFormat!);
        this.context.allocationRegister.reallocate(this._identifier, bytes);
    }

    /**
     * Returns the number of bytes this object approximately allocates on the GPU.
     */
    get bytes(): GLsizei {
        this.assertInitialized();
        return this.context.allocationRegister.allocated(this._identifier);
    }

    /**
     * Readonly access to the internal format of the renderbuffer object. This can only be changed by re-initialization.
     */
    get internalFormat(): GLenum {
        this.assertInitialized();
        return this._internalFormat!;
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

    /**
     * Convenience accessor: sample count for multisampling.
     */
    get samples(): GLsizei {
        this.assertInitialized();
        return this._samples;
    }

    /**
     * Convenience accessor: if multisampling is enabled.
     */
    get multisampling(): boolean {
        this.assertInitialized();
        return this._samples > 1;
    }

    /**
     * Convenience getter for the 2-tuple containing the render buffer's width and height.
     * @see {@link width}
     * @see {@link heigth}
     */
    get size(): GLsizei2 {
        return [this.width, this.height];
    }

}
