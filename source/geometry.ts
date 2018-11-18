
/* spellchecker: disable */

import { Bindable } from './bindable';
import { Buffer } from './buffer';
import { Initializable } from './initializable';

import { Context } from './context';
import { VertexArray } from './vertexarray';

/* spellchecker: enable */


/**
 * Geometry that extends Initializable and Bindable by a draw method, a getter for buffers, as well as a getter for the
 * vertex array object. This is used as generic interface for one or more buffer objects associated to a single vertex
 * array object intended for drawing (often also referred to as 'drawable').
 */
export abstract class Geometry extends Initializable implements Bindable {

    /**
     * Vertex array used for binding the rectangle's buffer(s).
     */
    protected _vertexArray: VertexArray;

    /**
     * Various buffers required for this geometry (e.g., vertex buffer).
     */
    protected _buffers = new Array<Buffer>();


    /**
     * Creates the geometry and a vertex array instance. Please note that inheritors are expected to create the buffer.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instances VAO and VBOs.
     */
    constructor(context: Context, identifier?: string) {
        super();

        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;
        this._vertexArray = new VertexArray(context, `${identifier}VAO`);
    }


    /**
     * Binds all buffer object(s) to their associated attribute binding points (pre-defined index/indices). This
     * function is passed to the initialization of this geometries vertex array object.
     * @param indices - Indices passed on geometry initialization by inheritor (sequence as in buffers).
     */
    protected abstract bindBuffers(indices: Array<GLuint>): void;

    /**
     * Unbinds all buffer objects and disables their binding points. This function is passed to the uninitialization
     * of this geometries vertex array object.
     * @param indices - Indices passed on geometry initialization by inheritor (sequence as in buffers).
     */
    protected abstract unbindBuffers(indices: Array<GLuint>): void;


    /**
     * Initializes all buffer objects and the vertex array. Please note that implicit arguments are used in order to
     * enable custom initialization signatures for inheritors.
     * @param targets - Targets to initialize the buffers for.
     * @param indices - Binding points that are passed to the inheritors (un)bind buffer methods.
     */
    @Initializable.initialize()
    initialize(...args: any[]): boolean {
        const targets = args[0] as Array<GLenum>;
        const indices = args[1] as Array<GLuint>;

        let valid = true;
        for (let i = 0; i < this._buffers.length; ++i) {
            valid = this._buffers[i].initialize(targets[i]) && valid;
        }

        this._vertexArray.initialize(() => this.bindBuffers(indices), () => this.unbindBuffers(indices));
        return this._vertexArray.valid && valid;
    }

    /**
     * Uninitialize the vertex array object and the rectangle.
     */
    @Initializable.uninitialize()
    uninitialize(): void {
        this._vertexArray.uninitialize();
        this._buffers.forEach((buffer) => buffer.uninitialize());
        for (const buffer of this._buffers) {
            buffer.uninitialize();
        }
    }


    /**
     * Binds the vertex array object.
     */
    @Initializable.assert_initialized()
    bind(): void {
        this._vertexArray.bind();
    }

    /**
     * Unbinds the vertex array object.
     */
    @Initializable.assert_initialized()
    unbind(): void {
        this._vertexArray.unbind();
    }


    abstract draw(): void;


    /**
     * Read-only access to the buffer(s) associated to this instances vertex array object.
     */
    get buffers(): Array<Buffer> {
        return this._buffers;
    }

    /**
     * Read-only access to the buffers' and vertex array's context.
     */
    get context(): Context {
        return this._vertexArray.context;
    }

    /**
     * Read-only access to the vertex array.
     */
    get vertexArray(): VertexArray {
        return this._vertexArray;
    }

}

