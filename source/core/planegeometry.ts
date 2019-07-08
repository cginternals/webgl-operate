
import { mat4, quat, vec2, vec3 } from 'gl-matrix';

import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';


export class PlaneGeometry extends Geometry {

    protected static readonly VERTICES = new Float32Array([
        -1.0, 0.0, -1.0,
        -1.0, 0.0, +1.0,
        +1.0, 0.0, -1.0,
        +1.0, 0.0, +1.0,
    ]);

    protected static readonly INDICES = new Uint8Array([0, 1, 2, 3]);

    protected _vertexLocation: GLuint = 0;

    /** @see {@link translation} */
    protected _translation: vec3;

    /** @see {@link scale} */
    protected _scale: vec3;

    /** @see {@link rotation} */
    protected _rotation: quat;

    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     */
    constructor(context: Context, identifier?: string) {
        super(context, identifier);

        this._translation = vec3.fromValues(0, 0, 0);
        this._scale = vec3.fromValues(1, 1, 1);
        this._rotation = quat.create();

        /* Generate identifier from constructor name if none given. */
        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;

        const vertexVBO = new Buffer(context, identifier + 'VBO');
        const indexBuffer = new Buffer(context, identifier + 'IndexBuffer');
        this._buffers.push(vertexVBO);
        this._buffers.push(indexBuffer);
    }


    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     */
    protected bindBuffers(): void {
        /* Please note the implicit bind in attribEnable */
        this._buffers[0].attribEnable(this._vertexLocation, 3, this.context.gl.FLOAT, false, 0, 0, true, false);
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
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param aVertex - Attribute binding point for vertices.
     */
    initialize(aVertex: GLuint = 0): boolean {
        const gl = this.context.gl;

        this._vertexLocation = aVertex;

        const valid = super.initialize([gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER], [aVertex, 8]);

        this._buffers[0].data(PlaneGeometry.VERTICES, gl.STATIC_DRAW);
        this._buffers[1].data(PlaneGeometry.INDICES, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specifies/invokes the draw of this plane.
     */
    draw(): void {
        const gl = this.context.gl;
        gl.drawElements(gl.TRIANGLE_STRIP, PlaneGeometry.INDICES.length, gl.UNSIGNED_BYTE, 0);
    }

    /**
     * Set the translation of the plane.
     */
    set translation(t: vec3) {
        this._translation = t;
    }

    /**
     * Set the extents of the plane in x and y direction.
     */
    set scale(s: vec2) {
        this._scale = vec3.fromValues(s[0], 1.0, s[1]);
    }

    /**
     * Set the rotation of the plane.
     */
    set rotation(q: quat) {
        this._rotation = q;
    }

    /**
     * Get the transformation matrix to transform the unit plane to the specified translation, scale and rotation.
     */
    get transformation(): mat4 {
        const out = mat4.create();
        return mat4.fromRotationTranslationScale(out, this._rotation, this._translation, this._scale);
    }
}
