
/* spellchecker: disable */

import {
    Buffer,
    Context,
    Geometry,
    Initializable,
} from 'webgl-operate';

/* spellchecker: enable */


export class CubeGeometry extends Geometry {

    protected static readonly VERTICES = new Float32Array([
        -1.0, -1.0, +1.0,
        +1.0, -1.0, +1.0,
        -1.0, +1.0, +1.0,
        +1.0, +1.0, +1.0,
        -1.0, -1.0, -1.0,
        +1.0, -1.0, -1.0,
        -1.0, +1.0, -1.0,
        +1.0, +1.0, -1.0,
    ]);

    protected static readonly INDICES = new Uint8Array([0, 1, 2, 3, 7, 1, 5, 4, 7, 6, 2, 4, 0, 1]);

    protected _vertexLocation: GLuint;


    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     */
    constructor(context: Context, identifier?: string) {
        super(context, identifier);

        /* Generate identifier from constructor name if none given. */
        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;

        const vertexVBO = new Buffer(context, `${identifier}VBO`);
        this._buffers.push(vertexVBO);
        const indexBuffer = new Buffer(context, `${identifier}IndicesVBO`);
        this._buffers.push(indexBuffer);
    }


    /**
     * Binds all vertex buffer objects (VBOs) to pre-set attribute binding points.
     * @param indices - Unused, since pre-set locations are used.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(this._vertexLocation,
            3, this.context.gl.FLOAT, false, 0, 0, true, false);
        this._buffers[1].bind();
    }

    /**
     * Unbinds all vertex buffer objects (VBOs) and disables their attribute binding points.
     * @param indices - Unused, since pre-set locations are used.
     */
    protected unbindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
        this._buffers[1].unbind();
    }


    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param vertexLocation - Attribute binding point for vertices.
     */
    initialize(vertexLocation: GLuint = 0): boolean {

        this._vertexLocation = vertexLocation;

        const gl = this.context.gl;
        const valid = super.initialize([gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER]);

        this._buffers[0].data(CubeGeometry.VERTICES, gl.STATIC_DRAW);
        this._buffers[1].data(CubeGeometry.INDICES, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specifies/invokes the draw of this cube.
     */
    @Initializable.assert_initialized()
    draw(count: GLint = 0): void {
        const gl = this.context.gl;
        // TODO make draw elements instanced
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, CubeGeometry.INDICES.length, gl.UNSIGNED_BYTE,
            0, count * count);
    }

    /**
     * Attribute location to which this geometry's vertices are bound to.
     */
    get vertexLocation(): GLint {
        return this._vertexLocation;
    }

}
