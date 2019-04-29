
import { assert } from '../auxiliaries';

import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';


/**
 * Geometry of a box with configurable size and texture coordinates (optional).
 */
export class BoxGeometry extends Geometry {

    /**
     * Width of the box
     */
    protected _width = 1.0;

    /**
     * Height of the box
     */
    protected _height = 1.0;

    /**
     * Depth of the box
     */
    protected _depth = 1.0;

    /**
     * Is the box textured?
     */
    protected _textured = false;

    /**
     * Attribute location of the vertex position
     */
    protected _vertexLocation: GLuint;

    /**
     * Attribute location of the texture coordinate
     */
    protected _texCoordLocation: GLuint;

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     * @param width - Width of the box (default: 1.0)
     * @param height - Height of the box (default: 1.0)
     * @param depth - Depth of the box (default: 1.0)
     * @param textured - Is the box textured? (default: true)
     */
    constructor(context: Context, identifier?: string,
        width: number = 1.0, height: number = 1.0, depth: number = 1.0,
        textured: boolean = true) {
        super(context, identifier);

        /* Generate identifier from constructor name if none given. */
        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;

        /* Save configuration. */
        this._width = width;
        this._height = height;
        this._depth = depth;
        this._textured = textured;

        /* Generate vertex buffers. */
        const vertexVBO = new Buffer(context, identifier + 'VBO');
        this._buffers.push(vertexVBO);

        if (this._textured) {
            const uvVBO = new Buffer(context, identifier + 'UV');
            this._buffers.push(uvVBO);
        }
    }

    /**
     * Generates the vertex array for the box.
     * @param width - Width of the box
     * @param height - Height of the box
     * @param depth - Depth of the box
     */
    protected generateVertices(width: number, height: number, depth: number): Float32Array {
        const x = 0.5 * width;
        const y = 0.5 * height;
        const z = 0.5 * depth;

        return new Float32Array([
            -x, -y, +z,
            +x, -y, +z,
            -x, +y, +z,

            -x, +y, +z,
            +x, -y, +z,
            +x, +y, +z,

            +x, -y, +z,
            +x, -y, -z,
            +x, +y, +z,

            +x, +y, +z,
            +x, -y, -z,
            +x, +y, -z,

            +x, -y, -z,
            -x, -y, -z,
            +x, +y, -z,

            +x, +y, -z,
            -x, -y, -z,
            -x, +y, -z,

            -x, -y, -z,
            -x, -y, +z,
            -x, +y, -z,

            -x, +y, -z,
            -x, -y, +z,
            -x, +y, +z,

            -x, +y, +z,
            +x, +y, +z,
            -x, +y, -z,

            -x, +y, -z,
            +x, +y, +z,
            +x, +y, -z,

            -x, -y, -z,
            +x, -y, -z,
            -x, -y, +z,

            -x, -y, +z,
            +x, -y, -z,
            +x, -y, +z,
        ]);
    }

    /**
     * Generates the texture coordinates for the box.
     */
    protected generateTexCoords(): Float32Array {
        return new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,

            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,

            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,

            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,

            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,

            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,

            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,

            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,

            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,

            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,

            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,

            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,
        ]);
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit bind in attribEnable. */
        this._buffers[0].attribEnable(this._vertexLocation, 3, this.context.gl.FLOAT, false, 0, 0, true, false);
        if (this._textured) {
            this._buffers[1].attribEnable(this._texCoordLocation, 2, this.context.gl.FLOAT, false, 0, 0, true, false);
        }
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit unbind in attribEnable is skipped. */
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
        if (this._textured) {
            this._buffers[1].attribDisable(this._texCoordLocation, true, true);
        }
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param aVertex - Attribute binding point for vertices.
     * @param aTexCoord - Attribute binding point for texture coordinates.
     */
    initialize(aVertex: GLuint = 0, aTexCoord: GLuint = 1): boolean {
        const gl = this.context.gl;

        this._vertexLocation = aVertex;
        this._texCoordLocation = aTexCoord;

        const valid = super.initialize([gl.ARRAY_BUFFER, gl.ARRAY_BUFFER], [aVertex, aTexCoord]);

        assert(this._buffers[0] !== undefined && this._buffers[0].object instanceof WebGLBuffer,
            `expected valid WebGLBuffer`);

        if (this._textured) {
            assert(
                this._buffers[1] !== undefined && this._buffers[1].object instanceof WebGLBuffer,
                `expected valid WebGLBuffer`);
        }

        this._buffers[0].data(this.generateVertices(this._width, this._height, this._depth), gl.STATIC_DRAW);
        if (this._textured) {
            this._buffers[1].data(this.generateTexCoords(), gl.STATIC_DRAW);
        }

        return valid;
    }

    /**
     * Draws the box.
     */
    draw(): void {
        const gl = this.context.gl;
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    /**
     * Attribute location to which this geometrys vertices are bound to.
     */
    get vertexLocation(): GLuint {
        return this._vertexLocation;
    }

    /**
     * Attribute location to which this geometrys texture coordinates are bound to.
     */
    get texCoordLocation(): GLuint {
        return this._texCoordLocation;
    }
}
