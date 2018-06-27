
import { assert } from './auxiliaries';

import { Bindable } from './bindable';
import { Buffer } from './buffer';
import { Initializable } from './initializable';
import { AbstractObject } from './object';


/**
 * Wrapper for drawable objects by means of multiple vertex buffer that could be bound to a vertex array. If the
 * context supports vertex array objects either natively (webgl2) or by extension, the drawable buffer are bound
 * only once on initialization and only a single VAO bind and unbind is required for a rendering pass.
 *
 * The VertexArray can be used wrapped around any VertexBuffer interface:
 * ```
 * export class ScreenFillingTriangle extends VertexArray {
 * // ...
 *     bind(index: GLuint): void { ...  }
 *     unbind(index: GLuint): void { ... }
 *     draw(): void { ... }
 * }
 *
 * export class ScreenFillingTriangleVAO extends VertexArray<ScreenFillingTriangle> { }
 * ```
 *
 * With that the screen-filling triangle can be drawn as follows:
 * ```
 * this.someTriangleVAO.draw();
 * ```
 */
export class VertexArray extends AbstractObject<any> implements Bindable {

    /**
     * Default vertex array, e.g., used for unbind.
     */
    static readonly DEFAULT_VERTEX_ARRAY = undefined;


    /**
     * Flag to track one-time initialization (in case vertex arrays are supported).
     */
    protected _buffersBound = false;

    /**
     * The feature specific bind function. This is mapped on initialization either to native VAO bind, extension based
     * VAO bind or directly to the drawable's bind.
     */
    protected _bind: () => void;
    /**
     * The feature specific unbind function. This is mapped on initialization either to native VAO unbind, extension
     * based VAO unbind or directly to the drawable's unbind.
     */
    protected _unbind: () => void;


    /**
     * Depending on the context features, a vertex array object is created and the bind method is specified (either
     * native, by extension, or none/direct bind).
     * @param bindBOs - Function that should bind all VBOs and IBOs required for drawing.
     * @param unbindBOs - Function that should unbind all VBOs and IBOs used for drawing.
     */
    protected create(bindBOs: () => void, unbindBOs: () => void): any /* WebGLVertexArrayObject */ | undefined {

        if (this.context.isWebGL2 || this.context.supportsVertexArrayObject) {
            const gl2facade = this.context.gl2facade;

            this._object = gl2facade.createVertexArray();
            /* note that gl.isVertexArray requires the vertex array to be bound */
            this._valid = this._object !== undefined;

            this._bind = () => {
                gl2facade.bindVertexArray(this.object);
                if (this._buffersBound) {
                    return;
                }
                bindBOs();
                this._buffersBound = true;
            };
            this._unbind = () => gl2facade.bindVertexArray(VertexArray.DEFAULT_VERTEX_ARRAY);

        } else {
            this._bind = () => bindBOs();
            this._unbind = () => unbindBOs();
            this._valid = true;
        }

        return this._object;
    }

    /**
     * On deletion either the VAO is deleted (when VAOs are supported natively or by extension) or nothing happens. Note
     * that the VAO does not own any of its associated buffers (which can be shared over multiple VAO instances or
     * used directly).
     */
    protected delete(): void {
        if (!this.context.isWebGL2 && !this.context.supportsVertexArrayObject) {
            this._valid = false;
            return;
        }

        assert(this._object !== undefined, `expected WebGLVertexArrayObject object`);
        this._context.gl2facade.deleteVertexArray(this._object);

        this._object = undefined;
        this._valid = false;

        this._buffersBound = false;
    }

    /**
     * Invokes the preset bind function.
     */
    @Initializable.assert_initialized()
    bind(): void {
        this._bind();
    }

    /**
     * Invokes the preset unbind function.
     */
    @Initializable.assert_initialized()
    unbind(): void {
        this._unbind();
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
    attribEnable(index: GLuint, buffer: Buffer, size: GLint, type: GLenum, normalized: GLboolean = false,
        stride: GLsizei = 0, offset: GLintptr = 0, bind: boolean = true, unbind: boolean = true,
        vboBind = true, vboUnbind = true): void {

        const gl = this.context.gl;
        if (bind) {
            this.bind();
        }

        if (vboBind) {
            buffer.bind();
        }

        gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
        gl.enableVertexAttribArray(index);

        if (vboUnbind) {
            buffer.unbind();
        }

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
     * Can be used to enforce rebinding all buffers, e.g., when data has changed.
     */
    invalidate() {
        this._buffersBound = false;
    }

}
