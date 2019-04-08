
/* spellchecker: disable */

import { Buffer } from './buffer';
import { Context } from './context';
import { Geometry } from './geometry';
import { Initializable } from './initializable';

/* spellchecker: enable */


/**
 * Geometry for a viewport/screen-filling triangle. The geometry creates triangle vertices, associated to
 * a vertex array object (from geometry base class), and provides a specialized draw call for rendering. It is intended
 * for, e.g., viewport/screen-filling rendering in post-processing. The vertices can be used directly as normalized
 * device space (NDC) coordinates, e.g., by using the following vertex shader snippet:
 * ```
 * #if __VERSION__ == 100
 *     attribute vec2 a_vertex;
 * #else
 *     layout(location = 0) in vec2 a_vertex;
 * #endif
 *
 * ...
 *
 * v_uv = a_vertex * 0.5 + 0.5;
 * gl_Position = vec4(a_vertex, 0.0, 1.0);
 * ```
 */
export class NdcFillingTriangle extends Geometry {

    /**
     * 2───────┬ ----- 1
     * │       │    /
     * │       │ /
     * ├───────┘
     * |     /
     * |  /
     * 0
     */
    protected static readonly VERTICES = new Float32Array(
        [-1.0, -3.0, 3.0, 1.0, -1.0, 1.0]);

    /** @see {@link vertexLocation} */
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
    }


    /**
     * Binds all vertex buffer objects (VBOs) to pre-set attribute binding points.
     * @param indices - Unused, since pre-set locations are used.
     */
    protected bindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(this._vertexLocation,
            2, this.context.gl.FLOAT, false, 0, 0, true, false);
    }

    /**
     * Unbinds all vertex buffer objects (VBOs) and disables their attribute binding points.
     * @param indices - Unused, since pre-set locations are used.
     */
    protected unbindBuffers(/*indices: Array<GLuint>*/): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
    }


    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param vertexLocation - Attribute binding point for vertices.
     */
    initialize(vertexLocation: GLuint = 0): boolean {
        this._vertexLocation = vertexLocation;

        const gl = this.context.gl;
        const valid = super.initialize([gl.ARRAY_BUFFER]);

        this._buffers[0].data(NdcFillingTriangle.VERTICES, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specifies/invokes the draw of this screen-aligned triangle.
     */
    @Initializable.assert_initialized()
    draw(): void {
        const gl = this.context.gl;
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }


    /**
     * Attribute location to which this geometry's vertices are bound to.
     */
    get vertexLocation(): GLint {
        return this._vertexLocation;
    }

}
