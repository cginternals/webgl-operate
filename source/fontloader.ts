
import { log, logIf, LogLevel } from './auxiliaries';

import { Context } from './context';
import { fetchAsync } from './fetch';
import { FontFace } from './fontface';
import { Glyph } from './glyph';
import { GLfloat2, GLfloat4 } from './tuples';

import Path = require('path');


type StringPairs = Map<string, string>;

function stripped(input: string, blacklist: Array<string>): string {
    let result: string = input;

    /* first param for erase: */
    blacklist.forEach((element) => {
        if (result.includes(element)) {
            result = result.replace(RegExp(element, 'g'), '');
        }
    });
    return result;
}


/**
 * Loads the png image that displays the glyph atlas, that was prepared using a Distance Field Transform. It also
 * loads all needed data to use that image from a fnt-file with the same name as the png image. It thus creates
 * a font face (@see {@link FontFace}).
 *
 * Example:
 * ```
 * let fontFace: FontFace = FontLoader.load(this.context, 'font/yourFont.fnt', false, callbackFunction);
 * ```
 */
export class FontLoader {

    /**
     * Parses the info fields for padding values and stores them in the font face
     * @param stream The stream of the 'info' identifier.
     * @param fontFace The font face in which the padding is stored.
     * @returns success
     */
    protected static processInfo(stream: Array<string>, fontFace: FontFace): boolean {

        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['padding'], pairs);

        if (!success) {
            return false;
        }

        const values = pairs.get('padding')!.split(',');

        if (values.length !== 4) {
            log(LogLevel.Error, `expected 4 values for padding, given ${values} (${values.length})`);
            return false;
        }

        const padding: GLfloat4 = [
            /* top */
            parseFloat(values[2]),
            /* right */
            parseFloat(values[1]),
            /* bottom */
            parseFloat(values[3]),
            /* left */
            parseFloat(values[0]),
        ];

        fontFace.glyphTexturePadding = padding;

        return true;
    }

    /**
     * Parses the common fields for lineHeight, base, ascent, descent, scaleW and scaleH to store them
     * in the font face.
     * @param stream The stream of the 'common' identifier.
     * @param fontFace The font face in which the parsed values are stored.
     * @returns success
     */
    protected static processCommon(stream: Array<string>, fontFace: FontFace): boolean {

        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream,
            ['lineHeight', 'base', 'ascent', 'descent', 'scaleW', 'scaleH'], pairs);

        if (!success) {
            return false;
        }

        fontFace.base = parseFloat(pairs.get('base')!);
        fontFace.ascent = parseFloat(pairs.get('ascent')!);
        fontFace.descent = parseFloat(pairs.get('descent')!);

        if (fontFace.size <= 0.0) {
            log(LogLevel.Error, `expected fontFace.size to be greater than 0, given ${fontFace.size}`);
            return false;
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
     * @param stream The stream of the 'page' identifier.
     * @param fontFace The font face in which the loaded glyph texture is stored.
     * @param filename The file name to find the png-file.
     * @returns Promise for handling image load status.
     */
    protected static processPage(
        stream: Array<string>, fontFace: FontFace, filename: string): Promise<void> {

        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['file'], pairs);

        if (!success) {
            log(LogLevel.Error, `Could not read texture filename from fnt file.`);
        }

        const file = stripped(pairs.get('file')!, ['"', '\r']);

        const path = Path.dirname(filename) + `/`;

        /** For multiple pages, the filename should be different.
         * Idea: Provide a name for the font file, and a template for the page file name
         * where the page number is replaced, e.g.:
         * `foo/bar/<fontname>-<page-number>.png`
         */
        const pngPath: string = path + file.split('.')[0] + '.png';

        return fontFace.glyphTexture.load(pngPath);
    }

    /**
     * Parses the char fields for character id, x, y, width, height, xoffset, yoffset, xadvance to
     * store them in the font face. Relies on fontFace.base and fontFace.glyphTextureExtent, so
     * execute processCommon() first.
     * @param stream The stream of the 'char' identifier.
     * @param fontFace The font face in which the loaded glyph texture is stored.
     * @returns success
     */
    protected static processChar(stream: Array<string>, fontFace: FontFace): boolean {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream,
            ['id', 'x', 'y', 'width', 'height', 'xoffset', 'yoffset', 'xadvance'], pairs);

        if (!success) {
            return false;
        }

        const index: number = parseInt(pairs.get('id')!, 10);
        logIf(index <= 0.0, LogLevel.Error,
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
     * @returns success
     */
    protected static processKerning(stream: Array<string>, fontFace: FontFace): boolean {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['first', 'second', 'amount'], pairs);

        if (!success) {
            return false;
        }

        const first: number = parseInt(pairs.get('first')!, 10);
        if (first <= 0.0) {
            log(LogLevel.Error, `expected kerning's first to be greater than 0, given ${first}`);
            return false;
        }

        const second: number = parseInt(pairs.get('second')!, 10);
        if (second <= 0.0) {
            log(LogLevel.Error, `expected kerning's second to be greater than 0, given ${second}`);
            return false;
        }

        const kerning: number = parseFloat(pairs.get('amount')!);

        fontFace.setKerning(first, second, kerning);

        return true;
    }

    /**
     * Parses to find key-value pairs for given mandatory keys.
     * @param stream The stream from which the pairs should be read.
     * @param mandatoryKeys The found pairs are only valid if the mandatory keys are found.
     * @param result key-value pairs, or undefined if not all mandatory keys are found.
     * @returns success
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

        logIf(!valid, LogLevel.Error, `Not all required keys are provided! Mandatory keys: ${mandatoryKeys}`);

        return valid;
    }

    /**
     * Asynchronously loads a fnt-file and a png-file of the same name, to create a font face from them.
     * @param context The WebGL rendering context.
     * @param filename The path to the fnt-file.
     * @param headless Boolean for headless mode.
     * @param onImageLoad Callback is called when the glyph atlas is loaded.
     */
    static async load(context: Context, filename: string, headless: boolean): Promise<FontFace> {
        const fontFace = new FontFace(context);

        let text;
        try {
            text = await fetchAsync(filename, '', (text) => text);
        } catch (e) {
            /* promise rejected */
            log(LogLevel.Error, `Could not load font file. filename is: ${filename}`);
        }

        /* promise fulfilled */
        const lines = text.split('\n');

        const promises = [];
        let valid = true;
        for (const l of lines) {
            if (!valid) {
                break;
            }
            let line = l.split(' ');
            const identifier = line[0];
            line = line.slice(1);

            /* tslint:disable-next-line:switch-default */
            switch (identifier) {
                case 'info':
                    valid = this.processInfo(line, fontFace);
                    break;
                case 'common':
                    valid = this.processCommon(line, fontFace);
                    break;
                case 'page':
                    if (!headless) {
                        promises.push(this.processPage(line, fontFace, filename));
                    }
                    break;
                case 'char':
                    valid = this.processChar(line, fontFace);
                    break;
                case 'kerning':
                    valid = this.processKerning(line, fontFace);
                    break;
            }
        }
        await Promise.all(promises);


        if (valid) {
            return fontFace;
        } else {
            return new FontFace(context, `invalid`);
        }
    }
}
