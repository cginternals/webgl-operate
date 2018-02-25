
import { assert } from '../core/auxiliaries';

import { Buffer } from '../core/buffer';
import { Context } from '../core/context';
import { Geometry } from '../core/geometry';
import { Initializable } from '../core/initializable';


/**
 * Geometry for a viewport/screen-filling rectangle. The geometry creates rectangle vertices, associated to
 * a vertex array object (from geometry base class), and provides a specialized draw call for rendering. It is intended
 * for, e.g., viewport/screen-filling rendering in post-processing. The vertices can be used directly as normalized
 * device space (NDC) coordinates, e.g., by using the following vertex shader snippet:
 *
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
export class NdcFillingRectangle extends Geometry {

    /**
     * 2 ───── 3
     * │  \    │
     * │    \  │
     * 0 ───── 1
     */
    protected static readonly VERTICES = new Float32Array(
        [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

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

        this._buffers.push(vertexVBO);
    }


    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     */
    protected bindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit bind in attribEnable. */
        this._buffers[0].attribEnable(indices[0], 2, this.context.gl.FLOAT, false, 0, 0, true, false);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     */
    protected unbindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit unbind in attribEnable is skipped. */
        this._buffers[0].attribDisable(indices[0], true, true);
    }


    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param aVertex - Attribute binding point for vertices.
     */
    initialize(aVertex: GLuint): boolean {
        const gl = this.context.gl;
        const valid = super.initialize([gl.ARRAY_BUFFER], [aVertex]);

        assert(this._buffers[0] !== undefined && this._buffers[0].object instanceof WebGLBuffer
            , `expected valid WebGLBuffer`);

        this._buffers[0].data(NdcFillingRectangle.VERTICES, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specifies/invokes the draw of this screen-aligned triangle.
     */
    @Initializable.assert_initialized()
    draw(): void {
        const gl = this.context.gl;
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

}
