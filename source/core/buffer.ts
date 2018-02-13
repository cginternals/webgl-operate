
import { assert } from './common';

import { Bindable } from './bindable';
import { assert_initialized } from './initializable';
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
     * @see {@link target}
     */
    protected _size = 0;

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
            this._target = target;
        }
        return this._object;
    }

    /**
     * Delete the buffer object on the GPU. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        const gl = this._context.gl;
        assert(this._object !== undefined, `expected WebGLBuffer object`);

        gl.deleteBuffer(this._object);
        this._object = undefined;
        this._valid = false;

        assert(this._target === gl.ARRAY_BUFFER || this._target === gl.ELEMENT_ARRAY_BUFFER
            , `either ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER expected as buffer target`);
        this._target = Buffer.DEFAULT_BUFFER;
    }

    /**
     * Binds the buffer object as buffer to predefined target.
     */
    @assert_initialized()
    bind(): void {
        assert(this._target === this._context.gl.ARRAY_BUFFER || this._target === this._context.gl.ELEMENT_ARRAY_BUFFER
            , `expected either ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER as buffer target`);
        this._context.gl.bindBuffer(this._target, this._object);
    }

    /**
     * Binds null as current buffer to predefined target;
     */
    @assert_initialized()
    unbind(): void {
        this.context.gl.bindBuffer(this._target, Buffer.DEFAULT_BUFFER);
    }

    /**
     * Size of the buffer data.
     */
    get size(): number {
        return this._size;
    }

    /**
     * Target to which the buffer object is bound (either GL_ARRAY_BUFFER or GL_ELEMENT_ARRAY_BUFFER).
     * Readonly access to the target (as specified on initialization) the buffer will be bound to.
     */
    get target(): GLenum | undefined {
        return this._target;
    }

    /**
     * Creates the buffer object's data store and updates the objects status.
     * @param data - Data that will be copied into the objects data store.
     * @param usage - Usage pattern of the data store.
     * @param noBindUnbind - Allows to skip binding the object (when binding is handled outside).
     */
    @assert_initialized()
    data(data: ArrayBufferView, usage: GLenum, noBindUnbind: boolean = false): void {
        const gl = this.context.gl;

        if (!noBindUnbind) {
            this.bind();
        }
        gl.bufferData(gl.ARRAY_BUFFER, data, usage);
        if (!noBindUnbind) {
            this.unbind();
        }

        this._valid = gl.isBuffer(this._object) && gl.getError() === gl.NO_ERROR;
        this._size = this._valid ? data.byteLength : 0;
        this.context.allocationRegister.reallocate(this._identifier, this._size);
    }

    /**
     * Specifies the memory layout of the buffer for a binding point.
     * @param index - Index of the vertex attribute that is to be setup and enabled.
     * @param size - Number of components per vertex attribute.
     * @param type - Data type of each component in the array.
     * @param normalized - Whether integer data values should be normalized when being casted to a float.
     * @param stride - Offset in bytes between the beginning of consecutive vertex attributes.
     * @param offset - Offset in bytes of the first component in the vertex attribute array.
     * @param noBindUnbind - Allows to skip binding and unbinding the object (when binding is handled outside).
     */
    @assert_initialized()
    attribEnable(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean = false
        , stride: GLsizei = 0, offset: GLintptr = 0, noBindUnbind: [boolean, boolean] = [false, true]): void {
        const gl = this.context.gl;

        if (!noBindUnbind[0]) {
            this.bind();
        }
        gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
        gl.enableVertexAttribArray(index);
        if (!noBindUnbind[1]) {
            this.unbind();
        }
    }

    /**
     * Disables a buffer binding point.
     * @param index - Index of the vertex attribute that is to be disabled.
     * @param noBindUnbind - Allows to skip binding and unbinding the object (when binding is handled outside).
     */
    @assert_initialized()
    attribDisable(index: GLuint, noBindUnbind: [boolean, boolean] = [false, false]): void {
        const gl = this.context.gl;

        if (!noBindUnbind[0]) {
            this.bind();
        }
        gl.disableVertexAttribArray(index);
        if (!noBindUnbind[1]) {
            this.unbind();
        }
    }

}
