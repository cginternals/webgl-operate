
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

    constructor(numGlyphs: number) {
        super();

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
    }

    constructBuffers(originsOut: Float32Array, tangentsOut: Float32Array,
        upsOut: Float32Array, texCoordsOut: Float32Array): void {

        console.log('construct!!');

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

        originsOut = Float32Array.from(origins);
        tangentsOut = Float32Array.from(tangents);
        upsOut = Float32Array.from(ups);
        texCoordsOut = Float32Array.from(texCoords);
    }

    // optimize() {

    // }

}
