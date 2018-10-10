
import { log, logIf, LogLevel } from './auxiliaries';

import { Context } from './context';
import { fetchAsync } from './fetch';
import { FontFace } from './fontface';
import { Glyph } from './glyph';
import { GLfloat2, GLfloat4 } from './tuples';


type StringPairs = Map<string, string>;

function directoryPath(path: string): string {
    const pos = path.lastIndexOf('/');

    if (pos < 0) {
        return '';
    }

    /* Add trailing slash */
    return path.substr(0, pos + 1);
}

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
     */
    protected static processInfo(stream: Array<string>, fontFace: FontFace): void {
        const pairs = this.readKeyValuePairs(stream, ['padding']);

        const values = pairs.get('padding')!.split(',');

        logIf(values.length !== 4, LogLevel.Error,
            `expected 4 values for padding, given ${values} (${values.length})`);

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
     * @param stream The stream of the 'common' identifier.
     * @param fontFace The font face in which the parsed values are stored.
     */
    protected static processCommon(stream: Array<string>, fontFace: FontFace): void {
        const pairs = this.readKeyValuePairs(stream, ['lineHeight', 'base', 'ascent', 'descent', 'scaleW', 'scaleH']);

        fontFace.base = parseFloat(pairs.get('base')!);
        fontFace.ascent = parseFloat(pairs.get('ascent')!);
        fontFace.descent = parseFloat(pairs.get('descent')!);

        logIf(fontFace.size > 0.0, LogLevel.Error,
            `expected fontFace.size to be greater than 0, given ${fontFace.size}`);

        fontFace.lineHeight = parseFloat(pairs.get('lineHeight')!);

        fontFace.glyphTextureExtent = [
            parseFloat(pairs.get('scaleW')!),
            parseFloat(pairs.get('scaleH')!),
        ];
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

        const pairs = this.readKeyValuePairs(stream, ['file']);

        const path = directoryPath(filename);
        const file = stripped(pairs.get('file')!, ['"', '\r']);

        const pngPath: string = path + file.split('.')[0] + '.png';

        return fontFace.glyphTexture.load(pngPath);
    }

    /**
     * Parses the char fields for character id, x, y, width, height, xoffset, yoffset, xadvance to
     * store them in the font face. Relies on fontFace.base and fontFace.glyphTextureExtent, so
     * execute processCommon() first.
     * @param stream The stream of the 'char' identifier.
     * @param fontFace The font face in which the loaded glyph texture is stored.
     */
    protected static processChar(stream: Array<string>, fontFace: FontFace): void {
        const pairs = this.readKeyValuePairs(stream,
            ['id', 'x', 'y', 'width', 'height', 'xoffset', 'yoffset', 'xadvance']);

        const index: number = parseInt(pairs.get('id')!, 10);
        logIf(index > 0.0, LogLevel.Error,
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
        const pairs = this.readKeyValuePairs(stream, ['first', 'second', 'amount']);

        const first: number = parseInt(pairs.get('first')!, 10);
        logIf(first > 0.0, LogLevel.Error,
            `expected kerning's first to be greater than 0, given ${first}`);

        const second: number = parseInt(pairs.get('second')!, 10);
        logIf(second > 0.0, LogLevel.Error,
            `expected kerning's first to be greater than 0, given ${second}`);

        const kerning: number = parseFloat(pairs.get('amount')!);

        fontFace.setKerning(first, second, kerning);
    }

    /**
     * Parses to find key-value pairs for given mandatory keys.
     * @param stream The stream from which the pairs should be read.
     * @param mandatoryKeys The found pairs are only valid if the mandatory keys are found.
     * @returns key-value pairs, or an empty map if not all mandatory keys are found.
     */
    protected static readKeyValuePairs(stream: Array<string>, mandatoryKeys: Array<string>): StringPairs {

        let key: string;
        let value: string;

        const pairs: StringPairs = new Map<string, string>();

        for (const s of stream) {
            const pair = s.split('=');
            key = pair[0];
            value = pair[1];
            pairs.set(key, value);
        }

        /* check if all required keys are provided */
        let valid = true;
        for (const mandatoryKey of mandatoryKeys) {
            valid = valid && pairs.has(mandatoryKey);
        }

        if (!valid) {
            log(LogLevel.Warning, `Not all required keys are provided! Mandatory keys: ${mandatoryKeys}`);
            /* typescript does not allow writing `new StringPairs()` */
            return new Map<string, string>();
        } else {
            return pairs;
        }
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

        try {
            const text = await fetchAsync(filename, '', (text) => text);

            /* promise fulfilled */
            const lines = text.split('\n');

            const promises = [];
            for (const l of lines) {
                let line = l.split(' ');
                const identifier = line[0];
                line = line.slice(1);

                switch (identifier) {
                    case 'info': {
                        this.processInfo(line, fontFace);
                        break;
                    }
                    case 'common': {
                        this.processCommon(line, fontFace);
                        break;
                    }
                    case 'page': {
                        if (!headless) {
                            promises.push(this.processPage(line, fontFace, filename));
                        }
                        break;
                    }
                    case 'char': {
                        this.processChar(line, fontFace);
                        break;
                    }
                    case 'kerning': {
                        this.processKerning(line, fontFace);
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
            await Promise.all(promises);

        } catch (e) {
            /* promise rejected */
            log(LogLevel.Error, `Could not load font file. filename is: ${filename}`);
        }

        // TODO: assert? throw exception?
        // if (headless || fontFace.glyphTexture) {
        return fontFace;
        // } else {
        //     return null;
        // }
    }
}
