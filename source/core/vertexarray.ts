
import { assert } from './common';

import { assert_initialized } from '../core/initializable';
import { Bindable } from './bindable';
import { AbstractObject } from './object';


/**
 * Wrapper for drawable objects by means of multiple vertex buffer that could be bound to a vertex array. If the
 * context supports vertex array objects either natively (webgl2) or by extension, the drawable buffer are bound
 * only once on initialization and only a single VAO bind and unbind is required for a rendering pass.
 *
 * The VertexArray can be used wrapped around any VertexBuffer interface:
 * ```
 * export class ScreenFillingTriangle extends VertexBuffer {
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
    @assert_initialized()
    bind(): void {
        this._bind();
    }

    /**
     * Invokes the preset unbind function.
     */
    @assert_initialized()
    unbind(): void {
        this._unbind();
    }

}
