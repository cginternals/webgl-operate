
/* spellchecker: disable */

import { vec2, vec3 } from 'gl-matrix';

/* spellchecker: enable */


/**
 * Vertex cloud that describes each glyph that is to be rendered on the screen.
 */
export class GlyphVertices {

    static readonly FLOATS_PER_TEXCOORD = 4;
    static readonly FLOATS_PER_ORIGIN = 3;
    static readonly FLOATS_PER_TANGENT = 3;
    static readonly FLOATS_PER_UP = 3;


    /** @see {@link origins} */
    protected _origins: Float32Array;
    /** @see {@link tangents} */
    protected _tangents: Float32Array;
    /** @see {@link ups} */
    protected _ups: Float32Array;
    /** @see {@link texCoords} */
    protected _texCoords: Float32Array;


    /**
     * Concatenates multiple glyph vertices into a single new glyph vertices object.
     * @param array - Array of glyph vertices. Undefined glyph vertices will be ignored.
     */
    static concat(array: Array<GlyphVertices | undefined>): GlyphVertices {

        let length = 0;
        array.forEach((vertices) => length += vertices ? vertices.length : 0);

        const concatenated = new GlyphVertices(length);
        let offset = 0;

        /* tslint:disable-next-line:prefer-for-of */
        for (let index = 0; index < array.length; ++index) {
            const vertices = array[index];
            if (vertices === undefined || vertices!.length === 0) {
                continue;
            }
            concatenated._texCoords.set(vertices._texCoords, offset * GlyphVertices.FLOATS_PER_TEXCOORD);
            concatenated._origins.set(vertices._origins, offset * GlyphVertices.FLOATS_PER_ORIGIN);
            concatenated._tangents.set(vertices._tangents, offset * GlyphVertices.FLOATS_PER_TANGENT);
            concatenated._ups.set(vertices._ups, offset * GlyphVertices.FLOATS_PER_UP);

            offset += vertices.length;
        }
        return concatenated;
    }


    /**
     * Constructs a specialized arrays representing glyph vertex data.
     * @param numberOfGlyphs - The number of glyph vertices required (number of glyphs).
     */
    constructor(numberOfGlyphs: number) {
        const length = Math.max(0, numberOfGlyphs);

        this._texCoords = new Float32Array(length * GlyphVertices.FLOATS_PER_TEXCOORD);
        this._origins = new Float32Array(length * GlyphVertices.FLOATS_PER_ORIGIN);
        this._tangents = new Float32Array(length * GlyphVertices.FLOATS_PER_TANGENT);
        this._ups = new Float32Array(length * GlyphVertices.FLOATS_PER_UP);
    }

    /**
     * Efficiently reduces the size of all underlying float arrays (copies data if reduced).
     * @param numberOfGlyphs - Target number of glyphs to reduce the vertices to.
     */
    shrink(numberOfGlyphs: number): void {
        const length = Math.max(0, numberOfGlyphs);
        if (this.length === length) {
            return;
        }

        /* Utility that slices the underlying buffer to the required length in bytes, and then creates a new
        float 32 array view to that buffer. */
        const shrink = (array: Float32Array, length: number, components: number) =>
            array = new Float32Array(
                array.buffer.slice(0, length * array.BYTES_PER_ELEMENT * components),
                0, length * components);

        shrink(this._texCoords, length, GlyphVertices.FLOATS_PER_TEXCOORD);
        shrink(this._origins, length, GlyphVertices.FLOATS_PER_ORIGIN);
        shrink(this._ups, length, GlyphVertices.FLOATS_PER_TANGENT);
        shrink(this._tangents, length, GlyphVertices.FLOATS_PER_UP);
    }

    /**
     * Typed vec2 view to the lower left texture coordinate of the glyph at given index.
     * @param index - Index of the glyph to return the lower left texture coordinate of.
     */
    uvLowerLeft(index: number): vec2 {
        const begin = index * GlyphVertices.FLOATS_PER_TEXCOORD + 0;
        return this._texCoords.subarray(begin, begin + 2) as vec2;
    }

    /**
     * Typed vec2 view to the upper right texture coordinate of the glyph at given index.
     * @param index - Index of the glyph to return the upper right texture coordinate of.
     */
    uvUpperRight(index: number): vec2 {
        const begin = index * GlyphVertices.FLOATS_PER_TEXCOORD + 2;
        return this._texCoords.subarray(begin, begin + 2) as vec2;
    }

    /**
     * Typed vec3 view to the origin of the glyph at given index.
     * @param index - Index of the glyph to return the origin of.
     */
    origin(index: number): vec3 {
        const begin = index * GlyphVertices.FLOATS_PER_ORIGIN;
        return this._origins.subarray(begin, begin + GlyphVertices.FLOATS_PER_ORIGIN) as vec3;
    }

    /**
     * Typed vec3 view to the tangent of the glyph at given index.
     * @param index - Index of the glyph to return the tangent of.
     */
    tangent(index: number): vec3 {
        const begin = index * GlyphVertices.FLOATS_PER_TANGENT;
        return this._tangents.subarray(begin, begin + GlyphVertices.FLOATS_PER_TANGENT) as vec3;
    }

    /**
     * Typed vec3 view to the up vector of the glyph at given index.
     * @param index - Index of the glyph to return the up vector of.
     */
    up(index: number): vec3 {
        const begin = index * GlyphVertices.FLOATS_PER_UP;
        return this._ups.subarray(begin, begin + GlyphVertices.FLOATS_PER_UP) as vec3;
    }


    /**
     * Number of glyph vertices.
     */
    get length(): number {
        return this._origins.length / GlyphVertices.FLOATS_PER_ORIGIN;
    }

    /**
     * Read-access to all glyph vertices' origins in a single typed buffer.
     */
    get origins(): Float32Array {
        return this._origins;
    }

    /**
     * Read-access to all glyph vertices' tangent vectors in a single typed buffer.
     */
    get tangents(): Float32Array {
        return this._tangents;
    }

    /**
     * Read-access to all glyph vertices' up vectors in a single typed buffer.
     */
    get ups(): Float32Array {
        return this._ups;
    }

    /**
     * Read-access to all glyph vertices' texture coordinates (lower left and upper right) in a single typed buffer.
     */
    get texCoords(): Float32Array {
        return this._texCoords;
    }

}
