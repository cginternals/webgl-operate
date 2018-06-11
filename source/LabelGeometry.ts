
import { assert } from './auxiliaries';

import { Buffer } from './buffer';
import { Context } from './context';
import { Geometry } from './geometry';
import { Initializable } from './initializable';

/**
 * Gathers vertices and other data needed for drawing all labels.
 */
export class LabelGeometry extends Geometry {

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     */
    constructor(context: Context, identifier?: string) {
        super(context, identifier);

        /* Generate identifier from constructor name if none given. */
        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;

        const vertexVBO = new Buffer(context, identifier + 'VBO');
        const indexBuffer = new Buffer(context, identifier + 'TexCoordBuffer');
        this._buffers.push(vertexVBO);
        this._buffers.push(indexBuffer);
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     */
    protected bindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(indices[0], 3, this.context.gl.FLOAT, false, 0, 0, true, false);
        this._buffers[1].bind();
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        this._buffers[0].attribDisable(indices[0], true, true);
        this._buffers[1].unbind();
    }

    /**
     * Specifies/invokes the draw of all labels.
     */
    @Initializable.assert_initialized()
    draw(): void {
        const gl = this.context.gl;
        gl.drawElements(gl.TRIANGLE_STRIP, /* TODO */ 4, gl.UNSIGNED_BYTE, 0);
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param aVertex - Attribute binding point for vertices.
     */
    initialize(aVertex: GLuint): boolean {
        const gl = this.context.gl;

        // TODO: do not bind index to location 4
        const valid = super.initialize([gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER], [aVertex, 8]);

        assert(this._buffers[0] !== undefined && this._buffers[0].object instanceof WebGLBuffer,
            `expected valid WebGLBuffer`);

        assert(this._buffers[1] !== undefined && this._buffers[1].object instanceof WebGLBuffer,
            `expected valid WebGLBuffer`);

        this._buffers[0].data(/*TODO vertices */, gl.STATIC_DRAW);
        this._buffers[1].data(/*TODO tex coords*/, gl.STATIC_DRAW);

        return valid;
    }
}
