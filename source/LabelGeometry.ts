
import { assert } from './auxiliaries';

import { Buffer } from './buffer';
import { Context } from './context';
import { Geometry } from './geometry';
import { Initializable } from './initializable';

/**
 * Gathers vertices and other data needed for drawing all labels.
 */
export class LabelGeometry extends Geometry {

    protected _vertices: Float32Array = new Float32Array(0);
    protected _texCoords: Float32Array = new Float32Array(0);

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
        const texCoordBuffer = new Buffer(context, identifier + 'TexCoordBuffer');
        this._buffers.push(vertexVBO);
        this._buffers.push(texCoordBuffer);
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     */
    protected bindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(indices[0], 3, this.context.gl.FLOAT, false, 0, 0, true, false);
        this._buffers[1].attribEnable(indices[1], 2, this.context.gl.FLOAT, false, 0, 0, true, false);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        this._buffers[0].attribDisable(indices[0], true, true);
        this._buffers[1].attribDisable(indices[1], true, true);
    }

    /**
     * Specifies/invokes the draw of all labels.
     */
    @Initializable.assert_initialized()
    draw(): void {
        const gl = this.context.gl;
        const count = this._texCoords.length / 2;

        // gl.drawElements(gl.TRIANGLE_STRIP, /* TODO */ 4, gl.UNSIGNED_BYTE, 0);
        // gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);

        // TODO refactor this for performance! ( = only 1 draw call)
        for (let i = 0; i < count; i = i + 4) {
            gl.drawArrays(gl.TRIANGLE_STRIP, i, 4);
        }

        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * // TODO doesnt really initialize the data!
     * @param aVertex - Attribute binding point for vertices.
     * @param aTexCoord - Attribute binding point for texture coordinates.
     */
    initialize(aVertex: GLuint, aTexCoord: GLuint): boolean {

        const gl = this.context.gl;

        // TODO: do not bind index to location 4 // why not?
        const valid = super.initialize([gl.ARRAY_BUFFER, gl.ARRAY_BUFFER], [aVertex, aTexCoord]);

        return valid;
    }

    setVertices(data: Float32Array): void {

        assert(this._buffers[0] !== undefined && this._buffers[0].object instanceof WebGLBuffer,
            `expected valid WebGLBuffer`);

        this._vertices = data;

        const gl = this.context.gl;
        // TODO: is DYNAMIC_DRAW more appropriate?
        this._buffers[0].data(this._vertices, gl.STATIC_DRAW);
    }

    setTexCoords(data: Float32Array): void {

        assert(this._buffers[1] !== undefined && this._buffers[1].object instanceof WebGLBuffer,
            `expected valid WebGLBuffer`);

        this._texCoords = data;

        const gl = this.context.gl;
        // TODO: is DYNAMIC_DRAW more appropriate?
        this._buffers[1].data(this._texCoords, gl.STATIC_DRAW);
    }

}
