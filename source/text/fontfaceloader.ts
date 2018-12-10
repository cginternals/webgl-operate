
/* spellchecker: disable */

import { log, logIf, LogLevel } from '../auxiliaries';
import { GLfloat2, GLfloat4 } from '../tuples';

import { FontFace } from './fontface';
import { Glyph } from './glyph';

/* spellchecker: enable */


/** @todo replace path */
import Path = require('path');


type StringPairs = Map<string, string>;

/**
 * Transforms input raw data of a text-based font file to a font face (@see {@link FontFace}) specification. All
 * referenced pages/glyph atlases will be loaded and setup as well. This is intended to be used directly by the
 * FontFace and is not required to be exposed to webgl-operates public API.
 */
export class FontFaceLoader {

    /**
     * Parses the info fields for padding values and stores them in the font face
     * @param stream - The stream of the 'info' identifier.
     * @param fontFace - The font face in which the padding is stored.
     */
    protected static processInfo(stream: Array<string>, fontFace: FontFace): boolean {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream,
            ['size', 'padding'], pairs);
        if (!success) {
            return false;
        }

        fontFace.size = parseFloat(pairs.get('size')!);

        const values = pairs.get('padding')!.split(',');
        if (values.length !== 4) {
            log(LogLevel.Warning, `expected 4 values for padding, given ${values} (${values.length})`);
            return false;
        }

        const padding: GLfloat4 = [
            parseFloat(values[0]), /* top */
            parseFloat(values[1]), /* right */
            parseFloat(values[2]), /* bottom */
            parseFloat(values[3]), /* left */
        ];
        fontFace.glyphTexturePadding = padding;

        return true;
    }

    /**
     * Parses the common fields for lineHeight, base, ascent, descent, scaleW and scaleH to store them
     * in the font face. If ascent and/or descent are not available, they can be computed using the largest y-offset
     * (ascent = baseline - max_yoffset) and descent can be derived as well (descent = - fontsize + ascent).
     * @param stream - The stream of the 'common' identifier.
     * @param fontFace - The font face in which the parsed values are stored.
     */
    protected static processCommon(stream: Array<string>, fontFace: FontFace): boolean {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream,
            ['lineHeight', 'base', 'scaleW', 'scaleH'], pairs);
        if (!success) {
            return false;
        }

        fontFace.base = parseFloat(pairs.get('base')!);
        if (pairs.has('ascent')) {
            fontFace.ascent = parseFloat(pairs.get('ascent')!);
        }
        if (pairs.has('descent')) {
            fontFace.descent = parseFloat(pairs.get('descent')!);
        }

        fontFace.lineHeight = parseFloat(pairs.get('lineHeight')!);

        fontFace.glyphTextureExtent = [
            parseFloat(pairs.get('scaleW')!),
            parseFloat(pairs.get('scaleH')!),
        ];

        return true;
    }

    /**
     * Parses a page to load the associated png-file, i.e., the glyph atlas.
     * @param stream - The stream of the 'page' identifier.
     * @param fontFace - The font face in which the loaded glyph texture is stored.
     * @param url - Uniform resource locator string referencing the fnt-file (used for base path retrieval).
     * @returns - Promise for handling image load status.
     */
    protected static processPage(stream: Array<string>, fontFace: FontFace, url: string): Promise<void> | undefined {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['file'], pairs);
        if (!success) {
            return undefined;
        }

        const path = Path.dirname(url);
        let page = pairs.get('file')!;
        page = page.replace(/['"]+/g, ''); /* remove quotes */

        return fontFace.glyphTexture.load(`${path}/${page}`)
            .catch(() => Promise.reject(`page '${page}' referenced in font file '${url}' was not found`));
    }

    /**
     * Parses the char fields for character id (code point), x, y, width, height, xoffset, yoffset, xadvance to
     * store them in the font face as instances of Glyph.
     * This relies on fontFace.base and fontFace.glyphTextureExtent, so execute processCommon() first.
     * @param stream - The stream of the 'char' identifier.
     * @param fontFace - The font face in which the loaded glyph texture is stored.
     */
    protected static processChar(stream: Array<string>, fontFace: FontFace): boolean {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream,
            ['id', 'x', 'y', 'width', 'height', 'xoffset', 'yoffset', 'xadvance'], pairs);
        if (!success) {
            return false;
        }

        const index: number = parseInt(pairs.get('id')!, 10);
        logIf(index <= 0.0, LogLevel.Warning,
            `expected glyph index to be greater than 0, given ${index}`);

        const glyph = new Glyph();
        glyph.index = index;

        const extentScale: GLfloat2 = [
            1.0 / fontFace.glyphTextureExtent[0],
            1.0 / fontFace.glyphTextureExtent[1],
        ];
        const extent: GLfloat2 = [
            parseFloat(pairs.get('width')!),
            parseFloat(pairs.get('height')!),
        ];

        glyph.subTextureOrigin = [
            parseFloat(pairs.get('x')!) * extentScale[0],
            1.0 - (parseFloat(pairs.get('y')!) + extent[1]) * extentScale[1],
        ];

        glyph.extent = extent;

        glyph.subTextureExtent[0] = extent[0] * extentScale[0];
        glyph.subTextureExtent[1] = extent[1] * extentScale[1];

        glyph.bearingFromFontBaseAndOffset(fontFace.base,
            parseFloat(pairs.get('xoffset')!),
            parseFloat(pairs.get('yoffset')!),
        );

        glyph.advance = parseFloat(pairs.get('xadvance')!);

        fontFace.addGlyph(glyph);
        return true;
    }

    /**
     * Parses the kerning fields for first and second character and the amount, to store them in the font face.
     * @param stream The stream of the 'kerning' identifier.
     * @param fontFace The font face in which the kerning tuples are stored.
     */
    protected static processKerning(stream: Array<string>, fontFace: FontFace): boolean {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['first', 'second', 'amount'], pairs);
        if (!success) {
            return false;
        }

        const first: number = parseInt(pairs.get('first')!, 10);
        if (first <= 0.0) {
            log(LogLevel.Warning, `expected kerning's first to be greater than 0, given ${first}`);
            return false;
        }

        const second: number = parseInt(pairs.get('second')!, 10);
        if (second <= 0.0) {
            log(LogLevel.Warning, `expected kerning's second to be greater than 0, given ${second}`);
            return false;
        }

        const kerning: number = parseFloat(pairs.get('amount')!);
        fontFace.setKerning(first, second, kerning);

        return true;
    }

    /**
     * Parses to find key-value pairs for given mandatory keys.
     * @param stream - The stream from which the pairs should be read.
     * @param mandatoryKeys - The found pairs are only valid if the mandatory keys are found.
     * @param result - key-value pairs, or undefined if not all mandatory keys are found.
     * @returns - success
     */
    protected static readKeyValuePairs(stream: Array<string>, mandatoryKeys: Array<string>,
        resultPairs: StringPairs): boolean {

        let key: string;
        let value: string;

        for (const s of stream) {
            const pair = s.split('=');
            key = pair[0];
            value = pair[1];
            resultPairs.set(key, value);
        }

        /* check if all required keys are provided */
        let valid = true;
        mandatoryKeys.forEach((key) => valid = valid && resultPairs.has(key));
        if (!valid) {
            log(LogLevel.Warning, `Not all required keys are provided! Mandatory keys: ${mandatoryKeys}`);
        }
        return valid;
    }

    /**
     * Derives ascent and descent data for the font face. Since the computation is based on the available glyphs and
     * not all of the font's glyphs might be included in the font face, the ascent/descent might be off (based on
     * minimum y-offset).
     * @param fontFace - Font face to find ascent and/or descent for (if missing).
     * @param size - Suggested size of the font face as read from the font file. Note that the actual size of the font
     * face is determined by the sum of ascent and descent (which should equal the font files info size).
     */
    protected static findAscentAndDescentIfNoneProvided(fontFace: FontFace, size: number): void {
        if (fontFace.ascent > 0.0 && fontFace.descent < 0.0) {
            return;
        }

        if (fontFace.ascent > 0.0) {
            fontFace.descent = fontFace.ascent - size;
        }

        if (fontFace.descent < 0.0) {
            fontFace.ascent = fontFace.descent - size;
        }

        let maximumYBearing = Number.MIN_VALUE;
        for (const i of fontFace.arrayOfGlyphIndices()) {
            if (fontFace.glyph(i).extent[1] === 0.0) {
                continue;
            }
            maximumYBearing = Math.max(fontFace.glyph(i).bearing[1], maximumYBearing);
        }
        fontFace.ascent = maximumYBearing;
        fontFace.descent = fontFace.ascent - size;
        log(LogLevel.Debug, `ascent not specified, derived ${fontFace.ascent} from maximum y-offset`);
    }

    /**
     * Asynchronously loads a fnt-file and referenced pages to create a font face from them.
     * @param fontFace - Font face object to transform data into.
     * @param data - Font face data, probably fetched from an URL.
     * @param url - Uniform resource locator string referencing the fnt-file that was loaded.
     * @param headless - Whether or not to enable headless mode. If enabled, pages are not loaded.
     */
    static process(fontFace: FontFace, data: string, url: string, headless: boolean = false):
        Promise<FontFace | undefined> {

        const lines = data.split('\n');

        const promises = new Array<Promise<void>>();
        let status = true;
        for (const line of lines) {
            let attributes = line.split(' ');
            const identifier = attributes[0];
            attributes = attributes.slice(1);

            switch (identifier) {
                case 'info':
                    status = this.processInfo(attributes, fontFace);
                    break;

                case 'common':
                    status = this.processCommon(attributes, fontFace);
                    break;

                case 'page':
                    if (headless) {
                        break;
                    }
                    const promise: Promise<void> | undefined = this.processPage(attributes, fontFace, url);
                    if (promise !== undefined) {
                        promises.push(promise);
                    }
                    break;

                case 'char':
                    status = this.processChar(attributes, fontFace);
                    break;

                case 'kerning':
                    this.processKerning(attributes, fontFace);
                    break;

                default:
                    break;
            }

            if (status === false) {
                break;
            }
        }

        FontFaceLoader.findAscentAndDescentIfNoneProvided(fontFace, fontFace.size);
        if (fontFace.size <= 0.0) {
            log(LogLevel.Warning, `expected fontFace.size to be greater than 0, given ${fontFace.size}`);
        }

        /* Multiple promises might be invoked (one per page due to async texture2D load). Since this is a non async
        transform intended to be used in a async fetch, waiting on all promises here. */
        return Promise.all(promises).then(() => fontFace);
    }


}
