

import { vec3 } from 'gl-matrix';

// import { assert } from '../auxiliaries';

import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';
import { GLfloat3 } from '../tuples';


/**
 * Geometry of a box with configurable size and texture coordinates (optional).
 */
export class CuboidGeometry extends Geometry {


    protected static readonly VERTICES = new Float32Array([
        -1, -1, +1, +1, -1, +1, -1, +1, +1, +1, +1, +1, -1, -1, -1, +1, -1, -1, -1, +1, -1, +1, +1, -1]);

    protected static readonly INDICES = new Uint8Array(
        [0, 1, 2, 3, 7, 1, 5, 4, 7, 6, 2, 4, 0, 1]);


    /* Hacked, (sorry) but probably optimized (not benchmarked), interleaved vertex+uv buffer for indexed drawing
     * using primitive restart. This even works for degenerated triangles, since the coordinates on primitive
     * restart are the same and differ just in uv coords (relevant, since PR is only available in WebGL2).
     */
    protected static readonly VERTICES_UV = new Float32Array([
        -1, -1, +1, 0, 0, +1, -1, +1, 1, 0, -1, +1, +1, 0, 1, +1, +1, +1, 1, 1,
        -1, +1, +1, 0, 0, +1, +1, +1, 1, 0, +1, +1, -1, 1, 1, +1, +1, +1, 0, 1,
        +1, -1, +1, 0, 0, +1, -1, -1, 1, 0, +1, -1, +1, 1, 1, -1, -1, -1, 0, 0,
        +1, -1, -1, 0, 0, -1, -1, -1, 1, 0, +1, +1, -1, 0, 1, -1, +1, -1, 1, 1,
        -1, +1, -1, 0, 1, -1, +1, +1, 1, 1, -1, -1, +1, 1, 0, -1, -1, +1, 0, 1,
    ]);

    protected static readonly INDICES_UV = new Uint8Array(
        [3, 2, 1, 0, /*PR*/ 10, 19, 11, /*PR*/ 18, 11, 17, 16, /*PR*/ 4, 16, 5, 6,
            /*PR*/ 7, 6, 8, 9, /*PR*/ 10, 9, 11, /*PR*/ 12, 13, 14, 15]);


    /** @see {@link vertexLocation} */
    protected _vertexLocation: GLuint = 0;

    /** @see {@link textCoordLocation} */
    protected _uvCoordLocation: GLuint;

    /** @see {@link extent} */
    protected _extent = vec3.fromValues(1.0, 1.0, 1.0);

    /** @see {@link uvCoordinates} */
    protected _uvCoordinates = false;

    protected _count: GLsizei;


    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     * @param uvCoordinates - Create uv coordinates for texturing?
     * @param extent - Width, height, and depth of the cuboid (for backing vertices).
     */
    constructor(context: Context, identifier?: string,
        uvCoordinates: boolean = false, extent: GLfloat3 | vec3 = [1.0, 1.0, 1.0]) {
        super(context, identifier);

        /* Generate identifier from constructor name if none given. */
        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;

        /* Generate vertex buffers. */
        const vertexVBO = new Buffer(context, identifier + 'VBO');
        this._buffers.push(vertexVBO);

        const indexBuffer = new Buffer(context, `${identifier}IndicesVBO`);
        this._buffers.push(indexBuffer);

        this._extent = vec3.clone(extent);
        this._uvCoordinates = uvCoordinates;
    }


    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {

        /* Please note the implicit bind in attribEnable. */
        if (this._uvCoordinates === false) {
            this._buffers[0].attribEnable(this._vertexLocation, 3, this.context.gl.FLOAT,
                false, 0, 0, true, false);
        } else {
            this._buffers[0].attribEnable(this._vertexLocation, 3, this.context.gl.FLOAT,
                false, 5 * 4, 0, true, false);
            this._buffers[0].attribEnable(this._uvCoordLocation, 2, this.context.gl.FLOAT,
                false, 5 * 4, 3 * 4, false, false);
        }
        this._buffers[1].bind();
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit unbind in attribEnable is skipped. */
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
        if (this._uvCoordinates) {
            this._buffers[0].attribDisable(this._uvCoordLocation, false, true);
        }
        this._buffers[1].unbind();
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param vertexLocation - Attribute binding point for vertices.
     * @param uvCoordLocation - Attribute binding point for texture coordinates.
     */
    initialize(vertexLocation: GLuint = 0, uvCoordLocation: GLuint = 1): boolean {

        this._vertexLocation = vertexLocation;
        this._uvCoordLocation = uvCoordLocation;

        const gl = this.context.gl;
        const valid = super.initialize([gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER], [vertexLocation, uvCoordLocation]);

        const uv = this._uvCoordinates;
        let vertices = uv ? CuboidGeometry.VERTICES_UV : CuboidGeometry.VERTICES;

        /* Apply extent. */
        vertices = vertices.map((value, index) => value * (uv === false ? this._extent[index % 3] * 0.5 :
            (index % 5) < 3 ? this._extent[index % 5] * 0.5 : 1.0));

        this._buffers[0].data(vertices, gl.STATIC_DRAW);
        this._buffers[1].data(uv ? CuboidGeometry.INDICES_UV : CuboidGeometry.INDICES, gl.STATIC_DRAW);

        this._count = uv ? CuboidGeometry.INDICES_UV.length : CuboidGeometry.INDICES.length;

        return valid;
    }

    /**
     * Draws the box.
     */
    draw(): void {
        const gl = this.context.gl;
        gl.drawElements(gl.TRIANGLE_STRIP, this._count, gl.UNSIGNED_BYTE, 0);
    }

    /**
     * Attribute location to which this geometry's vertices are bound to.
     */
    get vertexLocation(): GLuint {
        return this._vertexLocation;
    }

    /**
     * Attribute location to which this geometry's texture coordinates are bound to.
     */
    get uvCoordLocation(): GLuint {
        return this._uvCoordLocation;
    }

    /**
     * The cuboid's extent in width, height, and depth.
     */
    get extent(): vec3 {
        return this._extent;
    }

    /**
     * The cuboid's index buffer length.
     */
    get count(): GLsizei {
        return this._count;
    }
}
