
import { assert } from './auxiliaries';

import { Bindable } from './bindable';
import { Initializable } from './initializable';
import { AbstractObject } from './object';


/**
 * Wrapper around an OpenGL array or element array buffer. This buffer may be used to be attached to multiple VAOs.
 */
export class Buffer extends AbstractObject<WebGLBuffer> implements Bindable {

    /**
     * Default buffer, e.g., used for unbind.
     */
    static readonly DEFAULT_BUFFER = undefined;


    /**
     * @see {@link bytes}
     */
    protected _bytes: GLsizei = 0;

    /**
     * @see {@link target}
     */
    protected _target: GLenum | undefined = Buffer.DEFAULT_BUFFER;

    /**
     * Create a buffer object on the GPU.
     */
    protected create(target: GLenum): WebGLBuffer | undefined {
        const gl = this._context.gl;

        this._object = gl.createBuffer();
        /* note that gl.isBuffer requires the buffer to be bound */
        this._valid = this._object instanceof WebGLBuffer;

        if (this._valid) {
            assert(target === gl.ARRAY_BUFFER || target === gl.ELEMENT_ARRAY_BUFFER
                , `either ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER expected as buffer target`);
            this._target = target;
        }
        return this._object;
    }

    /**
     * Delete the buffer object on the GPU. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        assert(this._object instanceof WebGLBuffer, `expected WebGLBuffer object`);
        this._context.gl.deleteBuffer(this._object);

        this._object = undefined;
        this._valid = false;

        this._target = Buffer.DEFAULT_BUFFER;
    }

    /**
     * Binds the buffer object as buffer to predefined target.
     */
    @Initializable.assert_initialized()
    bind(): void {
        assert(this._target === this._context.gl.ARRAY_BUFFER || this._target === this._context.gl.ELEMENT_ARRAY_BUFFER
            , `expected either ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER as buffer target`);
        this._context.gl.bindBuffer(this._target, this._object);
    }

    /**
     * Binds null as current buffer to predefined target;
     */
    @Initializable.assert_initialized()
    unbind(): void {
        this.context.gl.bindBuffer(this._target, Buffer.DEFAULT_BUFFER);
    }

    /**
     * Creates the buffer object's data store and updates the objects status.
     * @param data - Data that will be copied into the objects data store.
     * @param usage - Usage pattern of the data store.
     * @param bind - Allows to skip binding the object (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the object (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    data(data: ArrayBufferView, usage: GLenum, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.bufferData(gl.ARRAY_BUFFER, data, usage);
        if (unbind) {
            this.unbind();
        }

        this._valid = gl.isBuffer(this._object) && gl.getError() === gl.NO_ERROR;
        this._bytes = this._valid ? data.byteLength : 0;
        this.context.allocationRegister.reallocate(this._identifier, this._bytes);
    }

    /**
     * Specifies the memory layout of the buffer for a binding point.
     * @param index - Index of the vertex attribute that is to be setup and enabled.
     * @param size - Number of components per vertex attribute.
     * @param type - Data type of each component in the array.
     * @param normalized - Whether integer data values should be normalized when being casted to a float.
     * @param stride - Offset in bytes between the beginning of consecutive vertex attributes.
     * @param offset - Offset in bytes of the first component in the vertex attribute array.
     * @param bind - Allows to skip binding the object (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the object (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    attribEnable(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean = false
        , stride: GLsizei = 0, offset: GLintptr = 0, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;
        if (bind) {
            this.bind();
        }
        gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
        gl.enableVertexAttribArray(index);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Disables a buffer binding point.
     * @param index - Index of the vertex attribute that is to be disabled.
     * @param bind - Allows to skip binding the object (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the object (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    attribDisable(index: GLuint, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;
        if (bind) {
            this.bind();
        }
        gl.disableVertexAttribArray(index);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Returns the number of bytes this object approximately allocates on the GPU.
     */
    get bytes() {
        this.assertInitialized();
        return this._bytes;
    }

    /**
     * Target to which the buffer object is bound (either GL_ARRAY_BUFFER or GL_ELEMENT_ARRAY_BUFFER).
     * Readonly access to the target (as specified on initialization) the buffer will be bound to.
     */
    get target(): GLenum {
        this.assertInitialized();
        return this._target as GLenum;
    }

}
