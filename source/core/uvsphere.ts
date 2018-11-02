
import { assert } from '../auxiliaries';


import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';
import { Initializable } from '../initializable';


/**
 * @todo add description
 */
export class UVSphere extends Geometry {

    /**
     * This sphere's interleaved 3-component vertices and 2-component texture coordinates.
     */
    protected _vertices: Float32Array;

    /** @see {@link aVertex} */
    protected _aVertex: GLuint;


    /**
     * Generates a sphere that is made out of ... @todo (quad faces and a triangle fan at the top and bottom)?.
     * @param context - Valid context to create the object for.
     * @param segments - Number of vertical segments.
     * @param rings - Number of horizontal segments.
     * @param identifier - Meaningful name for identification of this instance.
     */
    constructor(context: Context, segments: number, rings: number, identifier?: string) {
        super(context, identifier);

        /* Generate identifier from constructor name if none given. */
        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;

        /** @todo implement UV sphere generation here */
        assert(true, `uv sphere generation not implemented`);

        this._vertices = new Float32Array(0);

        const vertexVBO = new Buffer(context, `${identifier}VBO`);
        this._buffers.push(vertexVBO);
    }


    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     */
    protected bindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(indices[0], 2, this.context.gl.FLOAT, false, 0, 0, true, false);
        this._aVertex = indices[0];
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        this._buffers[0].attribDisable(indices[0], true, true);
    }


    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param aVertex - Attribute binding point for vertices.
     */
    initialize(aVertex: GLuint): boolean {
        const gl = this.context.gl;
        const valid = super.initialize([gl.ARRAY_BUFFER], [aVertex]);

        assert(this._buffers[0] !== undefined && this._buffers[0].object instanceof WebGLBuffer,
            `expected valid WebGLBuffer`);

        this._buffers[0].data(this._vertices, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specifies/invokes the draw of this screen-aligned triangle.
     */
    @Initializable.assert_initialized()
    draw(): void {
        const gl = this.context.gl;
        /** @todo implement draw */
        // gl.drawArrays(gl.TRIANGLES, 0, 3);
    }


    /**
     * Attribute location this geometries vertices are bound to.
     */
    get aVertex(): GLint {
        return this._aVertex;
    }

}
