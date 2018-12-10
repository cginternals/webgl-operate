
/* spellchecker: disable */

import { assert } from '../auxiliaries';
import { GLfloat2, GLfloat4, GLsizei2 } from '../tuples';

import { Context } from '../context';
import { Texture2D } from '../texture2d';
import { Wizard } from '../wizard';

import { fetchAsync } from '../fetch';
import { FontFaceLoader } from './fontfaceloader';
import { Glyph } from './glyph';

/* spellchecker: enable */


/**
 * Font related data for glyph based text rendering. The glyph-based font face is described by, e.g., font-size,
 * line spacing, a glyph catalogue, as well as kerning information. The glyph catalogue is based on a set of glyphs
 * referring to a texture atlas (@see {@link Glyph}). All measures are provided in float even though most
 * glyph-textures and associated font data is encoded via integer values. A font face explicitly relies on floating
 * values to reduce the need of casting as well as to simplify the use for dpi aware text rendering. Most measures
 * can be interpreted as points (by means of the unit pt), again, easing the use for arbitrary dpi.
 * The font face interface is designed to access most basic font settings ascent, descent, and line gap (leading).
 * Additional font settings are provided via interface but are derived from or mapped to the above mentioned three
 * settings, e.g., font size is the sum of descent and ascent. This is to provide as much convenience measures for
 * type setting/font rendering as possible.
 * Note: This class does not provide dpi awareness, which has to be handled outside of this class, e.g., during
 * layouting and rendering.
 *
 * A font can be loaded as follows:
 * ```
 * let fontFace: FontFace | undefined;
 * FontFace.fromFile(context, './data/opensansr144.fnt').then((value) => fontFace = value);
 * ```
 */
export class FontFace {

    /** @see {@link size} */
    protected _size: number;

    /** @see {@link base} */
    protected _base: number;

    /** @see {@link ascent} */
    protected _ascent = 0.0;

    /** @see {@link descent} */
    protected _descent = 0.0;

    /** @see {@link lineGap} */
    protected _lineGap = 0.0;

    /** @see {@link glyphTextureExtent} */
    protected _glyphTextureExtent: GLfloat2 = [0.0, 0.0];

    /** @see {@link glyphTexturePadding} */
    protected _glyphTexturePadding: GLfloat4 = [0.0, 0.0, 0.0, 0.0];

    /** @see {@link glyphTexturePadding} */
    protected _glyphTexture: Texture2D;

    /**
     * Map associating a glyph index to a glyph (sub image of a texture).
     * @see {@link glyph}, @see {@link hasGlyph}, @see {@link addGlyph}
     */
    protected _glyphs = new Map<GLsizei, Glyph>();

    protected _context: Context;


    /**
     * Fetches a font face file, and, if successful, processes it and fetches referenced pages.
     *
     * Resolving the promise:
     * ```
     * let fontFace: FontFace | undefined;
     * FontFace.fromFile(context, './data/opensansr144.fnt').then((value) => fontFace = value);
     * ```
     * @param url - Uniform resource locator string referencing the fnt-file that should be loaded.
     * @param context - Valid context to create the object for.
     * @param headless - Whether or not to enable headless mode. If enabled, pages are not loaded.
     * @param identifier - Meaningful name/prefix for identification of fetched pages (glyph atlases).
     */
    static fromFile(url: string, context: Context, headless: boolean = false, identifier?: string):
        Promise<FontFace> {

        const transform = (data: any): PromiseLike<FontFace> => {
            const font = new FontFace(context, identifier);
            return FontFaceLoader.process(font, data, url, headless)
                .then((fontFace: FontFace) => fontFace)
                .catch((reason: any) => Promise.reject(`processing font face data failed: ${reason}`));
        };

        return fetchAsync<FontFace>(url, 'text').then(transform);
    }

    /**
     * Constructs an unconfigured, empty font face specification. The appropriate setters should be used for
     * configuring the font face. Alternatively, the font importer (@see {@link FontImporter}) provides the import
     * of bitmap-font base configuration file ({@link http://www.angelcode.com/products/bmfont/}).
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instances VAO and VBOs.
     */
    constructor(context: Context, identifier?: string) {
        this._context = context;
        const gl = context.gl;

        identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;
        this._glyphTexture = new Texture2D(context, `${identifier}GlyphAtlas`);
        const internalFormat = Wizard.queryInternalTextureFormat(context, gl.RGBA, Wizard.Precision.byte);
        this._glyphTexture.initialize(1, 1, internalFormat[0], gl.RGBA, internalFormat[1]);
        this._glyphTexture.filter(gl.LINEAR, gl.LINEAR);
    }


    /**
     * Check if a glyph of a specific index is available.
     * @param index - Index of the glyph to access.
     * @returns - True if a glyph for the provided index was added.
     */
    hasGlyph(index: GLsizei): boolean {
        return !!this._glyphs.get(index);
    }

    /**
     * Direct access to an indexed glyph. If the glyph does not exist, an empty glyph is returned without adding it
     * to glyphs. The glyph atlas might be loaded asynchronously, thus, new glyphs are expected to be added via
     * addGlyph.
     * @param index - Index of the glyph to access.
     * @returns - Glyph with the matching index or an empty glyph, if index has not match
     */
    glyph(index: GLsizei): Glyph {
        const existingGlyph = this._glyphs.get(index);
        if (existingGlyph) {
            return existingGlyph;
        }
        const glyph = new Glyph();
        glyph.index = index;
        return glyph;
    }

    /**
     * Add a glyph to the font face's set of glyphs. If the glyph already exists, the existing glyph remains.
     * @param glyph - The glyph to add to the set of glyphs.
     */
    addGlyph(glyph: Glyph): void {
        assert(!(this._glyphs.get(glyph.index)), 'expected glyph to not already exist');
        this._glyphs.set(glyph.index, glyph);
    }

    /**
     * Generates aan array of all comprised glyph indices.
     * @returns - An array of all glyph indices available to this font face.
     */
    arrayOfGlyphIndices(): Array<GLsizei> {
        return Array.from(this._glyphs.keys());
    }

    /**
     * Check if a glyph is depictable/renderable. If the glyph's sub-texture vertical or horizontal extent is zero
     * the glyph does not need to be depicted/rendered. E.g., spaces, line feeds, other control sequences as well
     * as unknown glyphs do not need to be processed for rendering.
     * @param index - Index of the glyph to access.
     * @returns - Returns true if the glyph needs to be depicted/rendered.
     */
    depictable(index: GLsizei): boolean {
        return this.glyph(index).depictable();
    }

    /**
     * Kerning for a glyph and a subsequent glyph in pt. If the glyph or the subsequent glyph are unknown to this
     * font face (assertion), 0.f will be returned. For more details on kerning, refer to the Glyph class.
     * @param index - The current glyph index (e.g., of the current pen-position).
     * @param subsequentIndex - The glyph index of the subsequent/next glyph.
     * @returns - The kerning (usually negative) between the two glyphs in pt. If either on of the glyphs is unknown
     * to this font face or no specific kerning for the glyph pair is available a zero kerning is returned.
     */
    kerning(index: GLsizei, subsequentIndex: GLsizei): number {
        const glyph = this._glyphs.get(index);
        if (!glyph) {
            return 0.0;
        }
        return glyph.kerning(subsequentIndex);
    }

    /**
     * Set the kerning for a glyph w.r.t. to a subsequent glyph in pt. If the glyph is known to this font face, the
     * values are forwarded to the glyphs kerning setter (see Glyph for more information).
     * @param index - The target glyph index.
     * @param subsequentIndex - The glyph index of the respective subsequent/next glyph.
     * @param kerning - Kerning of the two glyphs in pt.
     */
    setKerning(index: GLsizei, subsequentIndex: GLsizei, kerning: number): void {
        const glyph = this._glyphs.get(index);
        if (!glyph || !this.hasGlyph(subsequentIndex)) {
            assert(false, `expected glyph or glyph of subsequent index to exist, \
                given ${index} and ${subsequentIndex} respectively`);
            return;
        }
        glyph.setKerning(subsequentIndex, kerning);
    }


    /**
     * The size of the font in pt. The font size is the measure from the tops of the tallest glyphs (ascenders) to
     * the bottom of the lowest descenders in pt.
     * @returns - The font size in pt.
     */
    set size(size: number) {
        assert(size > 0.0, `expected size to be greater than 0.0, given ${size}`);
        this._size = size;
    }
    get size(): number {
        return this._size;
    }

    /**
     * Set the font's base in pt. The base is the distance from the baseline to the top of the line in pt.
     * @param base - The distance from the baseline to the top of the line in pt.
     */
    set base(base: number) {
        assert(base > 0.0, `expected base to be greater than 0.0, given ${base}`);
        this._base = base;
    }
    get base(): number {
        return this._base;
    }

    /**
     * Set the font's ascent in pt. The ascent is the distance from the baseline to the tops of the tallest glyphs
     * (ascenders) in pt.
     * @param ascent - The distance from the baseline to the topmost ascenders in pt.
     */
    set ascent(ascent: number) {
        assert(ascent > 0.0, `expected ascent to be greater than 0.0, given ${ascent}`);
        this._ascent = ascent;
    }
    get ascent(): number {
        return this._ascent;
    }

    /**
     * Set the font's descent in pt. The descent is the distance from the baseline to the lowest descenders in pt.
     * Please note that this value is usually negative (if the fonts lowest descenders are below the baseline).
     * @param descent - The distance from the baseline to the lowest descenders in pt.
     */
    set descent(descent: number) {
        /* No assert here: there might be fonts with their lowest descender above baseline. */
        // assert(descent < 0.f, ...);
        this._descent = descent;
    }
    get descent(): number {
        return this._descent;
    }

    /**
     * Set the font's leading/linegap in pt. The leading is the distance from the lowest descenders to the topmost
     * ascenders of a subsequent text line in pt.
     * @param lineGap - The gap between two subsequent lines of text in pt.
     */
    set lineGap(lineGap: number) {
        this._lineGap = lineGap;
    }
    get lineGap(): number {
        return this._lineGap;
    }

    /**
     * Set the baseline-to-baseline distance in pt. Negative values will result in negative linegap. The line
     * height is derived as follows: line_height = size + line_gap, or alternatively:
     * line_height = size * line_space
     * @param lineHeight - The line height (baseline-to-baseline distance) in pt.
     */
    set lineHeight(lineHeight: number) {
        assert(this.size > 0, `expected size to be greater than zero to derive line gap from line height`);
        this._lineGap = lineHeight - this.size;
    }
    get lineHeight(): number {
        return this.size + this.lineGap;
    }

    /**
     * Set the relative baseline-to-baseline distance w.r.t. the font's size. The line space is mapped to line gap
     * as follows: line_gap = size * (line_space - 1). A space < 1.0 will result in a negative line gap.
     * @param lineSpace - The relative baseline-to-baseline distance w.r.t. the font's size.
     */
    set lineSpace(lineSpace: number) {
        this._lineGap = this.size * (lineSpace - 1);
    }
    /**
     * The relative baseline-to-baseline distance w.r.t. the font's size. The relative line space is derived as
     * follows: line_space = size / line_height; Note that the descent is usually a negative value.
     * @returns - The relative baseline-to-baseline distance w.r.t. the font's size.
     */
    get lineSpace(): number {
        if (this.lineHeight === 0.0) {
            return this.lineHeight;
        }
        return this.size / this.lineHeight;
    }

    /**
     * Sets the glyph texture atlas extent.
     * @param extent - The texture extent in px
     */
    set glyphTextureExtent(extent: GLsizei2) {
        assert(extent[0] > 0, `expected extent.x to be greater than 0.0, given ${extent[0]}`);
        assert(extent[1] > 0, `expected extent.y to be greater than 0.0, given ${extent[1]}`);
        this._glyphTextureExtent = extent;
    }
    /**
     * The size/extent of the glyph texture in px.
     * @returns - The size/extent of the glyph texture in px.
     */
    get glyphTextureExtent(): GLsizei2 {
        return this._glyphTextureExtent;
    }

    /**
     * The padding applied to every glyph in px. This can only be set via setGlyphTexture.
     * @param padding - CSS style (top, right, bottom, left) padding applied to every glyph within the texture in
     * px.
     */
    set glyphTexturePadding(padding: GLfloat4) {
        assert(padding[0] >= 0.0, `expected padding[0] to be greater than 0.0, given ${padding[0]}`);
        assert(padding[1] >= 0.0, `expected padding[1] to be greater than 0.0, given ${padding[1]}`);
        assert(padding[2] >= 0.0, `expected padding[2] to be greater than 0.0, given ${padding[2]}`);
        assert(padding[3] >= 0.0, `expected padding[3] to be greater than 0.0, given ${padding[3]}`);
        this._glyphTexturePadding = padding;
    }
    get glyphTexturePadding(): GLfloat4 {
        return this._glyphTexturePadding;
    }

    /**
     * The font face's associated glyph atlas. All glyph data is associated to this texture atlas.
     * @param texture - The new texture atlas for all glyphs
     */
    set glyphTexture(texture: Texture2D) {
        this._glyphTexture = texture;
    }
    get glyphTexture(): Texture2D {
        return this._glyphTexture;
    }


}
