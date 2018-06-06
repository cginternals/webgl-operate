
import { assert } from './auxiliaries';

import { Context } from './context';
import { FontFace } from './fontface';
import { Glyph } from './glyph';
import { GLfloat2, GLfloat4 } from './tuples';


type StringPairs = Map<string, string>;

function directoryPath(path: string): string {
    const pos = path.lastIndexOf('/');

    if (pos < 0) {
        return '';
    }

    return path.substr(0, pos + 1); // Add trailing slash
}

function stripped(input: string, blacklist: Array<string>): string {
    let result: string = input;

    // first param for erase:
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
 * let loader = new FontLoader();
 * let fontFace: FontFace = loader.load(this.context, 'font/opensansr144/opensansr144.fnt', false, callbackFunction);
 * ```
 */
export class FontLoader {

    constructor() {
    }

    // fontface: Objects and arrays are passed by reference
    protected handleInfo(stream: Array<string>, fontFace: FontFace): void {
        const pairs = this.readKeyValuePairs(stream, ['padding']);

        const values = pairs.get('padding')!.split(',');

        assert(values.length === 4, `handleInfo: expected 4 values for padding`);

        const padding: GLfloat4 = [
            parseFloat(values[2]), // top
            parseFloat(values[1]), // right
            parseFloat(values[3]), // bottom
            parseFloat(values[0]), // left
        ];

        fontFace.glyphTexturePadding = padding;
    }

    protected handleCommon(stream: Array<string>, fontFace: FontFace): void {
        const pairs = this.readKeyValuePairs(stream, ['lineHeight', 'base', 'ascent', 'descent', 'scaleW', 'scaleH']);

        fontFace.base = parseFloat(pairs.get('base')!);
        fontFace.ascent = parseFloat(pairs.get('ascent')!);
        fontFace.descent = parseFloat(pairs.get('descent')!);

        assert(fontFace.size > 0.0, `fontFace.size is not greater than 0.`);
        fontFace.lineHeight = parseFloat(pairs.get('lineHeight')!);

        fontFace.glyphTextureExtent = [
            parseFloat(pairs.get('scaleW')!),
            parseFloat(pairs.get('scaleH')!),
        ];
    }

    protected handlePage(
        stream: Array<string>, fontFace: FontFace, filename: string, context: Context
        , onImageLoad: (() => void)): void {

        const pairs = this.readKeyValuePairs(stream, ['file']);

        const path = directoryPath(filename);
        const file = stripped(pairs.get('file')!, ['"', '\r']);

        const pngPath: string = path + file.split('.')[0] + '.png';

        const img = new Image();
        img.src = pngPath;

        img.onload = () => {
            onImageLoad();

            const gl = context.gl;

            fontFace.glyphTexture.bind();

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

            const w: number = img.naturalWidth;
            const h: number = img.naturalHeight;

            fontFace.glyphTexture.reformat(gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            fontFace.glyphTexture.resize(w, h);
            fontFace.glyphTexture.data(img);

            /**
             * mipmaps are usually a good idea, but: using Fonts based on Distance Fields and super sampling
             * (accumulation frames), the rendered Glyph looks more readable when not using mipmaps.
             * Maybe manually provide mipmaps; smaller than 8x8 could be blank (can't render glyphs that small?)
             */
            fontFace.glyphTexture.filter(gl.LINEAR, gl.LINEAR, true);
            fontFace.glyphTexture.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, true);

            fontFace.glyphTexture.unbind();

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        };
    }

    protected handleChar(stream: Array<string>, fontFace: FontFace): void {
        const pairs = this.readKeyValuePairs(stream,
            ['id', 'x', 'y', 'width', 'height', 'xoffset', 'yoffset', 'xadvance']);

        const index: number = parseInt(pairs.get('id')!, 10);
        assert(index > 0, `handleChar: glyph index is not greater than 0.`);

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

        glyph.setBearing(fontFace.base,
            parseFloat(pairs.get('xoffset')!),
            parseFloat(pairs.get('yoffset')!),
        );

        glyph.advance = parseFloat(pairs.get('xadvance')!);

        fontFace.addGlyph(glyph);
    }

    protected handleKerning(stream: Array<string>, fontFace: FontFace): void {
        const pairs = this.readKeyValuePairs(stream, ['first', 'second', 'amount']);

        const first: number = parseInt(pairs.get('first')!, 10);
        assert(first > 0, `handleKerning: first is not greater than 0.`);

        const second: number = parseInt(pairs.get('second')!, 10);
        assert(second > 0, `handleKerning: second is not greater than 0.`);

        const kerning: number = parseFloat(pairs.get('amount')!);

        fontFace.setKerning(first, second, kerning);
    }

    protected readKeyValuePairs(stream: Array<string>, mandatoryKeys: Array<string>): StringPairs {

        let key: string;
        let value: string;

        const pairs: StringPairs = new Map<string, string>();

        for (const s of stream) {
            const pair = s.split('=');
            key = pair[0];
            value = pair[1];
            pairs.set(key, value);
        }

        // check if all required keys are provided
        let valid = true;
        for (const mandatoryKey of mandatoryKeys) {
            valid = valid && pairs.has(mandatoryKey);
        }

        if (!valid) {
            return new Map<string, string>(); // typescript does not allow writing `new StringPairs()`
        } else {
            return pairs;
        }
    }

    /**
     * @param context
     * @param filename path to a .fnt file
     * @param headless
     * @param onImageLoad Callback is called when the glyph atlas is loaded.
     */
    load(context: Context, filename: string, headless: boolean, onImageLoad: (() => void)): FontFace {
        const xmlhttp = new XMLHttpRequest();

        // fontface: Objects and arrays are passed by reference (JS)
        const fontFace = new FontFace(context);

        // asynchronous loading
        xmlhttp.open('GET', filename, true);
        xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status === 200 || xmlhttp.status === 0) {
                    const text = xmlhttp.responseText;

                    const lines = text.split('\n');

                    for (const l of lines) {
                        let line = l.split(' ');
                        const identifier = line[0];
                        line = line.slice(1);

                        if (identifier === 'info') {
                            this.handleInfo(line, fontFace);
                        } else if (identifier === 'common') {
                            this.handleCommon(line, fontFace);
                        } else if (identifier === 'page' && !headless) {
                            this.handlePage(line, fontFace, filename, context, onImageLoad);
                        } else if (identifier === 'char') {
                            this.handleChar(line, fontFace);
                        } else if (identifier === 'kerning') {
                            this.handleKerning(line, fontFace);
                        }
                    }
                }
            }
        };
        xmlhttp.send();

        // TODO: assert? throw exception?
        // if (headless || fontFace.glyphTexture) {
        return fontFace;
        // } else {
        //     return null;
        // }
    }
}
