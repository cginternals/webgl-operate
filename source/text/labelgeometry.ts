
import { assert } from '../auxiliaries';

import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';
import { Initializable } from '../initializable';


/**
 * Gathers vertices and other data needed for drawing all labels using the glyphquad-shaders.
 *
 * Example usage:
 * ```
 * const labelGeometry = new LabelGeometry(this._context);
 * labelGeometry = new LabelGeometry(this._context);
 * const aVertex = this._program.attribute('a_quadVertex', 0);
 * const aTexCoord = this._program.attribute('a_texCoord', 1);
 * const aOrigin = this._program.attribute('a_origin', 2);
 * const aTangent = this._program.attribute('a_tangent', 3);
 * const aUp = this._program.attribute('a_up', 4);
 *
 * labelGeometry.initialize(aVertex, aTexCoord, aOrigin, aTangent, aUp);
 * ...
 * labelGeometry.update(origins, tangents, ups, texCoords);
 * ...
 * labelGeometry.bind();
 * labelGeometry.draw();
 * labelGeometry.unbind();
 * ```
 */
export class LabelGeometry extends Geometry {

    /**
     * These 2D vertices are equal for all quads, used for instanced rendering. Their actual position will be changed
     * in the vertex shader, based on origins, tangents and up-vector attributes.
     * 2-------4
     * |  \    |
     * |    \  |
     * 1-------3
     */
    protected static readonly VERTICES = new Float32Array(
        [0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]);

    /**
     * Number of glyphs encoded within the geometry.
     */
    protected _glyphCount = 0;


    /**
     * Object constructor, requires a context and an identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     */
    constructor(context: Context, identifier?: string) {
        super(context, identifier);

        assert(context.isWebGL2 || context.supportsInstancedArrays,
            `expected extension 'ANGLE_instanced_arrays' to be supported`);

        /* Generate identifier from constructor name if none given. */
        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;

        this._buffers.push(new Buffer(context, `${identifier}VBO`));
        this._buffers.push(new Buffer(context, `${identifier}TexCoordVBO`));
        this._buffers.push(new Buffer(context, `${identifier}OriginVBO`));
        this._buffers.push(new Buffer(context, `${identifier}TangentVBO`));
        this._buffers.push(new Buffer(context, `${identifier}UpVBO`));
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     * @param indices - indices of buffers to bind
     */
    protected bindBuffers(indices: Array<GLuint>): void {
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        /* Please note the implicit bind in attribEnable */

        /* quadVertex */
        this._buffers[0].attribEnable(indices[0], 2, gl.FLOAT, false, 0, 0, true, false);
        gl2facade.vertexAttribDivisor(indices[0], 0);
        /* texCoords */
        this._buffers[1].attribEnable(indices[1], 4, gl.FLOAT, false, 4 * 4, 0, true, false);
        gl2facade.vertexAttribDivisor(indices[1], 1);
        /* origin */
        this._buffers[2].attribEnable(indices[2], 3, gl.FLOAT, false, 3 * 4, 0, true, false);
        gl2facade.vertexAttribDivisor(indices[2], 1);
        /* tangent */
        this._buffers[3].attribEnable(indices[3], 3, gl.FLOAT, false, 3 * 4, 0, true, false);
        gl2facade.vertexAttribDivisor(indices[3], 1);
        /* up */
        this._buffers[4].attribEnable(indices[4], 3, gl.FLOAT, false, 3 * 4, 0, true, false);
        gl2facade.vertexAttribDivisor(indices[4], 1);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     * @param indices - indices of buffers to unbind
     */
    protected unbindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit unbind in attribEnable is skipped */
        const l = this._buffers.length;
        for (let i = 0; i < l; i++) {
            this._buffers[i].attribDisable(indices[i], true, true);
        }
    }

    /**
     * Specifies/invokes the draw of all labels.
     */
    @Initializable.assert_initialized()
    draw(): void {
        this.context.gl2facade.drawArraysInstanced(this.context.gl.TRIANGLE_STRIP, 0, 4, this._glyphCount);
    }

    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param aQuadVertex - Attribute binding point for vertices.
     * @param aTexCoord - Attribute binding point for texture coordinates.
     * @param aOrigin - Attribute binding point for glyph origin coordinates
     * @param aTangent - Attribute binding point for glyph tangent coordinates.
     * @param aUp - Attribute binding point for glyph up-vector coordinates.
     */
    initialize(aQuadVertex: GLuint, aTexCoord: GLuint, aOrigin: GLuint, aTangent: GLuint, aUp: GLuint): boolean {
        const gl = this.context.gl;
        const valid = super.initialize(
            [gl.ARRAY_BUFFER, gl.ARRAY_BUFFER, gl.ARRAY_BUFFER, gl.ARRAY_BUFFER, gl.ARRAY_BUFFER],
            [aQuadVertex, aTexCoord, aOrigin, aTangent, aUp]);

        /**
         * These vertices are equal for all quads. There actual position will be changed using
         * origin, tangent and up(-vector).
         */
        this._buffers[0].data(LabelGeometry.VERTICES, gl.STATIC_DRAW);

        return valid;
    }


    /**
     * Use this method to set (or update) the glyph coordinates, e.g. after typesetting or after the calculations
     * of a placement algorithm. The actual interpretation of those buffers depends on the shader, usually they are
     * 3-component vectors in world space (provided as flat array.)
     * @param origins - Coordinates of the lower left corner of every glyph.
     * @param tangents - Tangent vector for every glyph (direction along base line).
     * @param ups - Up vector for every glyph (orthogonal to its tangent vector).
     * @param texCoords - The texture coordinates for every glyph, format: ll.x, ll.y, ur.x, ur.y.
     */
    update(origins: Float32Array, tangents: Float32Array, ups: Float32Array, texCoords: Float32Array): void {

        /** @todo The following buffers could be simplified to an interleaved buffer. */

        this._glyphCount = origins.length / 3;

        const gl = this.context.gl;
        /** @todo is DYNAMIC_DRAW more appropriate? */
        this._buffers[2].data(origins, gl.STATIC_DRAW);
        this._buffers[3].data(tangents, gl.STATIC_DRAW);
        this._buffers[4].data(ups, gl.STATIC_DRAW);
        this._buffers[1].data(texCoords, gl.STATIC_DRAW);
    }

}
