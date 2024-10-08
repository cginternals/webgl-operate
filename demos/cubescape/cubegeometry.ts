
/* spellchecker: disable */

import { gl_matrix_extensions, vec4 } from '../../../webgl-operate';

import {
    Buffer,
    Context,
    Geometry,
    Initializable,
} from '../../../webgl-operate';

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

    protected _count = 1;

    protected _vertexLocation: GLuint;
    protected _instanceLocation: GLuint;


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
        const instancesVBO = new Buffer(context, `${identifier}InstancesVBO`);
        this._buffers.push(instancesVBO);

        const indexBuffer = new Buffer(context, `${identifier}IndicesVBO`);
        this._buffers.push(indexBuffer);

    }


    /**
     * Binds all vertex buffer objects (VBOs) to pre-set attribute binding points.
     * @param indices - Unused, since pre-set locations are used.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        const gl2facade = this.context.gl2facade;

        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(this._vertexLocation,
            3, this.context.gl.FLOAT, false, 0, 0, true, false);
        gl2facade.vertexAttribDivisor(this._vertexLocation, 0);

        this._buffers[1].attribEnable(this._instanceLocation,
            3, this.context.gl.UNSIGNED_BYTE, false, 0, 0, true, false);
        gl2facade.vertexAttribDivisor(this._instanceLocation, 1);

        this._buffers[2].bind();
    }

    /**
     * Unbinds all vertex buffer objects (VBOs) and disables their attribute binding points.
     * @param indices - Unused, since pre-set locations are used.
     */
    protected unbindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
        this._buffers[1].attribDisable(this._instanceLocation, true, true);
        this._buffers[2].unbind();
    }


    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param vertexLocation - Attribute binding point for vertices.
     */
    initialize(
        vertexLocation: GLuint = 0,
        instanceLocation: GLuint = 1,
    ): boolean {

        this._vertexLocation = vertexLocation;
        this._instanceLocation = instanceLocation;

        const gl = this.context.gl;
        const valid = super.initialize([gl.ARRAY_BUFFER, gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER]);

        this._buffers[0].data(CubeGeometry.VERTICES, gl.STATIC_DRAW);
        this._buffers[2].data(CubeGeometry.INDICES, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specifies/invokes the draw of this cube.
     */
    @Initializable.assert_initialized()
    draw(): void {
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;
        gl2facade.drawElementsInstanced(gl.TRIANGLE_STRIP, CubeGeometry.INDICES.length, gl.UNSIGNED_BYTE,
            0, this._count * this._count);
    }

    /**
     * Specifies the number of cubes per side of the cubescape to be drawn (total is count²).
     */
    set count(count: GLuint) {
        if (this._count === count) {
            return;
        }
        this._count = count;

        const instances = new Uint8Array(3 * count * count);
        const vec: vec4 = vec4.create();
        for (let i = 0; i < instances.length; i += 3) {
            gl_matrix_extensions.encode_uint32_to_rgba8(vec, i / 3);
            instances[i + 0] = vec[0];
            instances[i + 1] = vec[1];
            instances[i + 2] = vec[2];
        }

        const gl = this.context.gl;
        this._buffers[1].data(instances, gl.DYNAMIC_DRAW);
    }
    get count(): GLuint {
        return this._count;
    }

    /**
     * Attribute location to which this geometry's vertices are bound to.
     */
    get vertexLocation(): GLint {
        return this._vertexLocation;
    }

    /**
     * Attribute location to which this geometry's instance indices are bound to.
     */
    get instanceLocation(): GLint {
        return this._instanceLocation;
    }

}
