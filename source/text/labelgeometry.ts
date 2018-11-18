
/* spellchecker: disable */

import { assert } from '../auxiliaries';

import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';
import { Initializable } from '../initializable';

/* spellchecker: enable */


/**
 * Gathers vertices and other data needed for drawing all labels using the glyphquad-shaders.
 *
 * Example usage:
 * ```
 * const labelGeometry = new LabelGeometry(this._context);
 * labelGeometry = new LabelGeometry(this._context);
 * this._program.attribute('a_vertex', labelGeometry.vertexLocation);
 * this._program.attribute('a_vertex', labelGeometry.vertexLocation);
 * this._program.attribute('a_vertex', labelGeometry.vertexLocation);
 * this._program.attribute('a_vertex', labelGeometry.vertexLocation);
 * this._program.attribute('a_vertex', labelGeometry.vertexLocation);
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
     * Handle to the glyph template this geometry is based on.
     */
    protected _vertices: Buffer;

    protected _texCoords: Buffer;
    protected _origins: Buffer;
    protected _tangents: Buffer;
    protected _bitangents: Buffer;


    /**
     * Number of glyphs encoded within the geometry.
     */
    protected _numberOfGlyphs = 0;


    protected _vertexLocation: GLuint;
    protected _texCoordLocation: GLuint;

    protected _originLocation: GLuint;
    protected _tangentLocation: GLuint;
    protected _bitangentLocation: GLuint;


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

        this._vertices = new Buffer(context, `${identifier}VBO`);
        this._buffers.push(this._vertices);

        this._texCoords = new Buffer(context, `${identifier}TexCoordVBO`);
        this._buffers.push(this._texCoords);

        this._origins = new Buffer(context, `${identifier}OriginVBO`);
        this._buffers.push(this._origins);

        this._tangents = new Buffer(context, `${identifier}TangentVBO`);
        this._buffers.push(this._tangents);

        this._bitangents = new Buffer(context, `${identifier}UpVBO`);
        this._buffers.push(this._bitangents);
    }

    /**
     * Binds the vertex buffer object (VBO) to an attribute binding point of a given, pre-defined index.
     * @param indices - indices of buffers to bind
     */
    protected bindBuffers(indices: Array<GLuint>): void {
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        /* Please note the implicit bind in attribEnable */

        this._vertices.attribEnable(this._vertexLocation,
            2, gl.FLOAT, false, 8, 0, true, false);
        gl2facade.vertexAttribDivisor(this._vertexLocation, 0);
        this._texCoords.attribEnable(this._texCoordLocation,
            4, gl.FLOAT, false, 16, 0, true, false);
        gl2facade.vertexAttribDivisor(this._texCoordLocation, 1);

        this._origins.attribEnable(this._originLocation,
            3, gl.FLOAT, false, 12, 0, true, false);
        gl2facade.vertexAttribDivisor(this._originLocation, 1);

        this._tangents.attribEnable(this._tangentLocation,
            3, gl.FLOAT, false, 12, 0, true, false);
        gl2facade.vertexAttribDivisor(this._tangentLocation, 1);
        this._bitangents.attribEnable(this._bitangentLocation,
            3, gl.FLOAT, false, 12, 0, true, false);
        gl2facade.vertexAttribDivisor(this._bitangentLocation, 1);
    }

    /**
     * Unbinds the vertex buffer object (VBO) and disables the binding point.
     * @param indices - indices of buffers to unbind
     */
    protected unbindBuffers(indices: Array<GLuint>): void {
        /* Please note the implicit unbind in attribEnable is skipped */

        this._vertices.attribDisable(this._vertexLocation, false, false);
        this._texCoords.attribDisable(this._texCoordLocation, false, false);

        this._origins.attribDisable(this._originLocation, false, false);

        this._tangents.attribDisable(this._tangentLocation, false, false);
        this._bitangents.attribDisable(this._bitangentLocation, false, false);
    }


    /**
     * Creates the vertex buffer object (VBO) and creates and initializes the buffer's data store.
     * @param vertexLocation - Attribute binding point for vertices.
     * @param texCoordLocation - Attribute binding point for texture coordinates.
     * @param originLocation - Attribute binding point for glyph origin coordinates
     * @param tangentLocation - Attribute binding point for glyph tangent coordinates.
     * @param bitangentLocation - Attribute binding point for glyph up-vector/bitangent coordinates.
     */
    initialize(
        vertexLocation: GLuint = 0,
        texCoordLocation: GLuint = 1,
        originLocation: GLuint = 2,
        tangentLocation: GLuint = 3,
        bitangentLocation: GLuint = 4): boolean {

        this._vertexLocation = vertexLocation;
        this._texCoordLocation = texCoordLocation;
        this._originLocation = originLocation;
        this._tangentLocation = tangentLocation;
        this._bitangentLocation = bitangentLocation;

        const gl = this.context.gl;
        const valid = super.initialize(
            [gl.ARRAY_BUFFER, gl.ARRAY_BUFFER, gl.ARRAY_BUFFER, gl.ARRAY_BUFFER, gl.ARRAY_BUFFER]);

        /**
         * These vertices are equal for all quads. There actual position will be changed using
         * origin, tangent and up(-vector).
         */
        this._vertices.data(LabelGeometry.VERTICES, gl.STATIC_DRAW);

        return valid;
    }

    /**
     * Specializes the uninitialization by invoking uninitialize on each buffer explicitly.
     * The base class then uninitializes the vertex array.
     */
    uninitialize(): void {
        this._vertices.uninitialize();
        this._texCoords.uninitialize();

        this._origins.uninitialize();

        this._tangents.uninitialize();
        this._bitangents.uninitialize();

        super.uninitialize();
    }

    /**
     * Use this method to set (or update) the glyph coordinates, e.g. after typesetting or after the calculations
     * of a placement algorithm. The actual interpretation of those buffers depends on the shader, usually they are
     * 3-component vectors in world space (provided as flat array.)
     * @param origins - Coordinates of the lower left corner of every glyph.
     * @param tangents - Tangent vector for every glyph (direction along base line).
     * @param bitangents - Up vector / bitangent for every glyph (orthogonal to its tangent vector).
     * @param texCoords - The texture coordinates for every glyph, format: ll.x, ll.y, ur.x, ur.y.
     */
    update(origins: Float32Array, tangents: Float32Array, bitangents: Float32Array, texCoords: Float32Array): void {

        /** @todo The following buffers could be simplified to an interleaved buffer. */

        this._numberOfGlyphs = origins.length / 3;
        const gl = this.context.gl;

        this._texCoords.data(texCoords, gl.STATIC_DRAW);
        this._origins.data(origins, gl.STATIC_DRAW);
        this._tangents.data(tangents, gl.STATIC_DRAW);
        this._bitangents.data(bitangents, gl.STATIC_DRAW);
    }

    /**
     * Specifies/invokes the draw of specific labels (ranges are supposed to be tracked/managed from outside).
     */
    @Initializable.assert_initialized()
    draw(offset: GLint = 0, count: GLint = 0): void {
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        this._vertices.attribEnable(this._vertexLocation,
            2, gl.FLOAT, false, 8, 0, true, false);
        this._texCoords.attribEnable(this._texCoordLocation,
            4, gl.FLOAT, false, 16, offset * 16, true, false);

        this._origins.attribEnable(this._originLocation,
            3, gl.FLOAT, false, 12, offset * 12, true, false);
        this._tangents.attribEnable(this._tangentLocation,
            3, gl.FLOAT, false, 12, offset * 12, true, false);
        this._bitangents.attribEnable(this._bitangentLocation,
            3, gl.FLOAT, false, 12, offset * 12, true, false);

        gl2facade.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }

    get numberOfGlyphs(): number {
        return this._numberOfGlyphs;
    }

    get valid(): boolean {
        const validVertex = this._vertices && this._vertices.valid;
        const validTexCoord = this._texCoords && this._texCoords.valid;
        const validOrigin = this._origins && this._origins.valid;
        const validTangent = this._tangents && this._tangents.valid;
        const validBitangent = this._bitangents && this._bitangents.valid;
        return this.initialized && validVertex && validTexCoord && validOrigin && validTangent && validBitangent;
    }


    /**
     * Attribute location to that this geometry's vertices are bound to.
     */
    get vertexLocation(): GLint {
        return this._vertexLocation;
    }

    /**
     * Attribute location to that this geometry's texture coordinates are bound to.
     */
    get texCoordLocation(): GLint {
        return this._texCoordLocation;
    }

    /**
     * Attribute location to that this geometry's origins are bound to.
     */
    get originLocation(): GLint {
        return this._originLocation;
    }

    /**
     * Attribute location to that this geometry's tangents are bound to.
     */
    get tangentLocation(): GLint {
        return this._tangentLocation;
    }

    /**
     * Attribute location to that this geometry's bitangents are bound to.
     */
    get bitangentLocation(): GLint {
        return this._bitangentLocation;
    }

}
