
import { log, logIf, LogLevel } from '../auxiliaries';
import { GLfloat2, GLfloat4 } from '../tuples';

import { Context } from '../context';
import { fetchAsync } from '../fetch';

import { FontFace } from './fontface';
import { Glyph } from './glyph';


/** @todo replace path */
import Path = require('path');


type StringPairs = Map<string, string>;

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
     * False when the current loading process gets invalid.
     */
    protected static _valid: boolean;

    /**
     * Parses the info fields for padding values and stores them in the font face
     * @param stream - The stream of the 'info' identifier.
     * @param fontFace - The font face in which the padding is stored.
     */
    protected static processInfo(stream: Array<string>, fontFace: FontFace): void {

        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['padding'], pairs);

        if (!success) {
            this._valid = false;
            return;
        }

        const values = pairs.get('padding')!.split(',');

        if (values.length !== 4) {
            log(LogLevel.Warning, `expected 4 values for padding, given ${values} (${values.length})`);
            this._valid = false;
            return;
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
    }

    /**
     * Parses the common fields for lineHeight, base, ascent, descent, scaleW and scaleH to store them
     * in the font face.
     * @param stream - The stream of the 'common' identifier.
     * @param fontFace - The font face in which the parsed values are stored.
     */
    protected static processCommon(stream: Array<string>, fontFace: FontFace): void {

        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream,
            ['lineHeight', 'base', 'ascent', 'descent', 'scaleW', 'scaleH'], pairs);

        if (!success) {
            this._valid = false;
            return;
        }

        fontFace.base = parseFloat(pairs.get('base')!);
        fontFace.ascent = parseFloat(pairs.get('ascent')!);
        fontFace.descent = parseFloat(pairs.get('descent')!);

        if (fontFace.size <= 0.0) {
            log(LogLevel.Warning, `expected fontFace.size to be greater than 0, given ${fontFace.size}`);
            this._valid = false;
            return;
        }

        fontFace.lineHeight = parseFloat(pairs.get('lineHeight')!);

        fontFace.glyphTextureExtent = [
            parseFloat(pairs.get('scaleW')!),
            parseFloat(pairs.get('scaleH')!),
        ];
    }

    /**
     * Parses a page to load the associated png-file, i.e., the glyph atlas.
     * @param stream - The stream of the 'page' identifier.
     * @param fontFace - The font face in which the loaded glyph texture is stored.
     * @param filename - The file name to find the png-file.
     * @returns - Promise for handling image load status.
     */
    protected static processPage(
        stream: Array<string>, fontFace: FontFace, filePath: string): Promise<void> {

        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['file'], pairs);

        if (!success) {
            log(LogLevel.Warning, `Could not read texture filename from fnt file.`);
            this._valid = false;
        }

        const path = Path.dirname(filePath) + `/`;
        const filename = Path.basename(filePath, `.fnt`);

        const pngPath: string = path + filename + `.png`;

        return fontFace.glyphTexture.load(pngPath).catch((error) => {
            log(LogLevel.Warning, `${error}. Could not load glyphTexture: ${pngPath}`);
            this._valid = false;
        });
    }

    /**
     * Parses the char fields for character id (codepoint), x, y, width, height, xoffset, yoffset, xadvance to
     * store them in the font face as instances of Glyph.
     * This relies on fontFace.base and fontFace.glyphTextureExtent, so execute processCommon() first.
     * @param stream - The stream of the 'char' identifier.
     * @param fontFace - The font face in which the loaded glyph texture is stored.
     */
    protected static processChar(stream: Array<string>, fontFace: FontFace): void {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream,
            ['id', 'x', 'y', 'width', 'height', 'xoffset', 'yoffset', 'xadvance'], pairs);

        if (!success) {
            this._valid = false;
            return;
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
    }

    /**
     * Parses the kerning fields for first and second character and the amount, to store them in the font face.
     * @param stream The stream of the 'kerning' identifier.
     * @param fontFace The font face in which the kerning tuples are stored.
     */
    protected static processKerning(stream: Array<string>, fontFace: FontFace): void {
        const pairs: StringPairs = new Map<string, string>();
        const success = this.readKeyValuePairs(stream, ['first', 'second', 'amount'], pairs);

        if (!success) {
            this._valid = false;
            return;
        }

        const first: number = parseInt(pairs.get('first')!, 10);
        if (first <= 0.0) {
            log(LogLevel.Warning, `expected kerning's first to be greater than 0, given ${first}`);
            this._valid = false;
            return;
        }

        const second: number = parseInt(pairs.get('second')!, 10);
        if (second <= 0.0) {
            log(LogLevel.Warning, `expected kerning's second to be greater than 0, given ${second}`);
            this._valid = false;
            return;
        }

        const kerning: number = parseFloat(pairs.get('amount')!);

        fontFace.setKerning(first, second, kerning);

        return;
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
     * Asynchronously loads a fnt-file and referenced pages to create a font face from them.
     * @param context - Valid context to create the object for.
     * @param uri - URI linking the fnt-file that should be loaded. Data URI not yet supported.
     * @param headless - Boolean for headless mode.
     * @param onImageLoad - Callback is called when the glyph atlas is loaded.
     */
    static async load(context: Context, uri: string, headless: boolean): Promise<FontFace> {
        const fontFace = new FontFace(context);

        this._valid = true;

        let text;
        try {
            text = await fetchAsync(uri, '', (text) => text);
        } catch (e) {
            /* promise rejected */
            log(LogLevel.Warning, `loading font file '${uri}' failed`);
            this._valid = false;
        }

        /* promise fulfilled */
        const lines = text.split('\n');

        const promises = [];
        for (const line of lines) {
            if (!this._valid) {
                break;
            }
            let values = line.split(' ');
            const identifier = values[0];
            values = values.slice(1);

            /* tslint:disable-next-line:switch-default */
            switch (identifier) {
                case 'info':
                    this.processInfo(values, fontFace);
                    break;
                case 'common':
                    this.processCommon(values, fontFace);
                    break;
                case 'page':
                    if (!headless) {
                        promises.push(this.processPage(values, fontFace, uri));
                    }
                    break;
                case 'char':
                    this.processChar(values, fontFace);
                    break;
                case 'kerning':
                    this.processKerning(values, fontFace);
                    break;
            }
        }

        await Promise.all(promises);

        if (this._valid) {
            return fontFace;
        } else {
            log(LogLevel.Warning, `no valid FontFace created`);
            return new FontFace(context, `invalid`);
        }
    }

}
