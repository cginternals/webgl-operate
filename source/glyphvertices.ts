
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
export class GlyphVertices extends Array<GlyphVertex> {

    /**
     * All GlyphVertex origins gathered in one buffer. Call fillBuffers() to update it.
     */
    protected _origins: Float32Array;
    /**
     * All GlyphVertex tangent vectors gathered in one buffer. Call fillBuffers() to update it.
     */
    protected _tangents: Float32Array;
    /**
     * All GlyphVertex up vectors gathered in one buffer. Call fillBuffers() to update it.
     */
    protected _ups: Float32Array;
    /**
     * All GlyphVertex texture coordinates gathered in one buffer. Call fillBuffers() to update it.
     */
    protected _texCoords: Float32Array;

    constructor(numGlyphs: number) {
        super();

        /* Set the prototype explicitly:
         * https://github.com/Microsoft/TypeScript/wiki/FAQ#why-doesnt-extending-built-ins-like-error-array-and-map-work
         */
        Object.setPrototypeOf(this, GlyphVertices.prototype);

        for (let i = 0; i < numGlyphs; ++i) {

            const vertex: GlyphVertex = {
                origin: vec3.create(),
                tangent: vec3.create(),
                up: vec3.create(),
                /* vec2 lowerLeft and vec2 upperRight in glyph texture (uv) */
                uvRect: vec4.create(),
            };
            this.push(vertex);
        }

        this._origins = new Float32Array(numGlyphs);
        this._tangents = new Float32Array(numGlyphs);
        this._ups = new Float32Array(numGlyphs);
        this._texCoords = new Float32Array(numGlyphs);
    }

    /**
     * Updates its buffers origins, tangents, ups and texCoords. Call this to get buffers suitable for LabelGeometry.
     */
    updateBuffers(): void {

        const origins: Array<number> = [];
        const tangents: Array<number> = [];
        const ups: Array<number> = [];
        const texCoords: Array<number> = [];

        const l = this.length;

        for (let i = 0; i < l; i++) {
            const v = this[i];

            origins.push.apply(origins, v.origin);
            tangents.push.apply(tangents, v.tangent);
            ups.push.apply(ups, v.up);
            texCoords.push.apply(texCoords, v.uvRect);
        }

        this._origins = Float32Array.from(origins);
        this._tangents = Float32Array.from(tangents);
        this._ups = Float32Array.from(ups);
        this._texCoords = Float32Array.from(texCoords);
    }

    /**
     * All GlyphVertex origins gathered in one buffer. Call fillBuffers() to update it.
     */
    get origins(): Float32Array {
        return this._origins;
    }

    /**
     * All GlyphVertex tangent vectors gathered in one buffer. Call fillBuffers() to update it.
     */
    get tangents(): Float32Array {
        return this._tangents;
    }

    /**
     * All GlyphVertex up vectors gathered in one buffer. Call fillBuffers() to update it.
     */
    get ups(): Float32Array {
        return this._ups;
    }

    /**
     * All GlyphVertex texture coordinates gathered in one buffer. Call fillBuffers() to update it.
     */
    get texCoords(): Float32Array {
        return this._texCoords;
    }

    // optimize() {

    // }

}
