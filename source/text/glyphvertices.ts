
import { vec3, vec4 } from 'gl-matrix';


/**
 * Information required for rendering a single glyph. Technical this could be denoted as a vertex of a vertex cloud.
 */
export interface GlyphVertex {

    /**
     * Position of the glyph in normalized device coordinates.
     */
    origin: vec3;

    /**
     * Tangent vector (usually the label's baseline direction). The length of this vector is expected to be the advance
     * of this glyphs geometry in baseline direction, i.e., it is used to derive the vertices using simple addition.
     */
    tangent: vec3;

    /**
     * Bitangent vector (orthogonal to the label's baseline). The length of this vector is expected to be the height of
     * this glyphs geometry, i.e., it is used to derive the glyph vertices using simple addition.
     */
    up: vec3;

    /**
     * Sub image rect of the glyph in the glyph texture (uv-coordinates).
     */
    uvRect: vec4;
}


/**
 * Vertex cloud that describes each glyph that is to be rendered on the screen.
 */
export class GlyphVertices {

    /** @see {@link vertices} */
    protected _vertices = new Array<GlyphVertex>();

    /** @see {@link origins} */
    protected _origins: Float32Array;
    /** @see {@link tangents} */
    protected _tangents: Float32Array;
    /** @see {@link ups} */
    protected _ups: Float32Array;
    /** @see {@link texCoords} */
    protected _texCoords: Float32Array;



    /**
     * Constructs a specialized array containing GlyphVertex objects.
     * @param numGlyphs - the number of GlyphVertex objects.
     */
    constructor(numGlyphs: number) {
        for (let i = 0; i < numGlyphs; ++i) {

            const vertex: GlyphVertex = {
                origin: vec3.create(),
                tangent: vec3.create(),
                up: vec3.create(),
                /* vec2 lowerLeft and vec2 upperRight in glyph texture (uv) */
                uvRect: vec4.create(),
            };
            this._vertices.push(vertex);
        }
    }

    /**
     * Updates its buffers origins, tangents, ups and texCoords. Call this to get buffers suitable for LabelGeometry.
     */
    update(): void {
        const length = this.length;

        this._origins = new Float32Array(length * 3);
        this._tangents = new Float32Array(length * 3);
        this._ups = new Float32Array(length * 3);

        this._texCoords = new Float32Array(length * 4);

        for (let i = 0; i < length; i++) {
            const vertex = this._vertices[i];

            this._origins[i * 3 + 0] = vertex.origin[0];
            this._origins[i * 3 + 1] = vertex.origin[1];
            this._origins[i * 3 + 2] = vertex.origin[2];

            this._tangents[i * 3 + 0] = vertex.tangent[0];
            this._tangents[i * 3 + 1] = vertex.tangent[1];
            this._tangents[i * 3 + 2] = vertex.tangent[2];

            this._ups[i * 3 + 0] = vertex.up[0];
            this._ups[i * 3 + 1] = vertex.up[1];
            this._ups[i * 3 + 2] = vertex.up[2];

            this._texCoords[i * 4 + 0] = vertex.uvRect[0];
            this._texCoords[i * 4 + 1] = vertex.uvRect[1];
            this._texCoords[i * 4 + 2] = vertex.uvRect[2];
            this._texCoords[i * 4 + 3] = vertex.uvRect[3];
        }
    }

    /**
     * Concatenates all vertices of a glyph vertices object and calls update.
     * @param glyphs - glyph vertices to concatenate.
     */
    concat(glyphs: GlyphVertices): void {
        this._vertices = this._vertices.concat(glyphs._vertices);
        this.update();
    }


    /**
     * Access to the glyph vertex array.
     */
    get vertices(): Array<GlyphVertex> {
        return this._vertices;
    }

    /**
     * Number of glyph vertices.
     */
    get length(): number {
        return this._vertices.length;
    }

    /**
     * All GlyphVertex origins gathered in one buffer. Call update() to update it.
     */
    get origins(): Float32Array {
        return this._origins;
    }

    /**
     * All GlyphVertex tangent vectors gathered in one buffer. Call update() to update it.
     */
    get tangents(): Float32Array {
        return this._tangents;
    }

    /**
     * All GlyphVertex up vectors gathered in one buffer. Call update() to update it.
     */
    get ups(): Float32Array {
        return this._ups;
    }

    /**
     * All GlyphVertex texture coordinates gathered in one buffer. Call update() to update it.
     */
    get texCoords(): Float32Array {
        return this._texCoords;
    }

}
