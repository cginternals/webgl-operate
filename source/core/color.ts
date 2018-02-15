
import { assert } from './common';


enum GrayscaleAlgorithm {
    Average,
    LinearLuminance, /* CIE1931 */
    LeastSaturatedVariant,
    MinimumDecomposition,
    MaximumDecomposition,
}

type GLclampf3 = [GLclampf, GLclampf, GLclampf];
type GLclampf4 = [GLclampf, GLclampf, GLclampf, GLclampf];
type GLclampf5 = [GLclampf, GLclampf, GLclampf, GLclampf, GLclampf];


/**
 * Color that allows for specification and conversion of colors in various color spaces. Please not that most of the
 * color conversion math is based on  {@link https://www.easyrgb.com/en/math.php}.
 */
export class Color {

    protected _rgba: GLclampf4 = [0.0, 0.0, 0.0, 1.0];

    /**
     * Converts a hue value into an rgb value.
     */
    protected static hue2rgb(p: GLfloat, q: GLfloat, t: GLfloat) {

        if (t < 0.0) {
            t += 1.0;
        } else if (t > 1.0) {
            t -= 1.0;
        }

        if ((6.0 * t) < 1.0) {
            return p + (q - p) * 6.0 * t;
        }
        if ((2.0 * t) < 1.0) {
            return q;
        }
        if ((3.0 * t) < 2.0) {
            return p + (q - p) * 6.0 * (2.0 / 3.0 - t);
        }
        return p;
    }

    /**
     * Converts a color from HSL space to RGB space.
     * @param hsl - HSL color tuple: hue, saturation, and lightness, each in [0.0, 1.0].
     * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0].
     */
    static hsl2rgb(hsl: GLclampf3): GLclampf3 {
        const rgb: GLclampf3 = [0.0, 0.0, 0.0];

        if (hsl[1] === 0.0) {
            rgb[0] = hsl[2];
            rgb[1] = hsl[2];
            rgb[2] = hsl[2];

        } else {
            const q = hsl[2] < 0.5 ? hsl[2] * (1.0 + hsl[2]) : (hsl[2] + hsl[1]) - (hsl[1] * hsl[2]);
            const p = 2.0 * hsl[2] - q;

            rgb[0] = Color.hue2rgb(p, q, hsl[0] + (1.0 / 3.0));
            rgb[1] = Color.hue2rgb(p, q, hsl[0]);
            rgb[2] = Color.hue2rgb(p, q, hsl[0] - (1.0 / 3.0));
        }
        return rgb;
    }

    /**
     * Converts a color from HSL space to RGB space.
     * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0].
     * @returns - HSL color tuple: hue, saturation, and lightness, each in [0.0, 1.0].
     */
    static rgb2hsl(rgb: GLclampf3): GLclampf3 {
        const hsl: GLclampf3 = [0.0, 0.0, 0.0];

        const min = Math.min(rgb[0], rgb[1], rgb[2]);
        const max = Math.max(rgb[0], rgb[1], rgb[2]);
        const delta = max - min;

        hsl[2] = (max + min) * 0.5;

        if (delta === 0.0) {
            return hsl;
        }

        hsl[1] = hsl[2] < 0.5 ? delta / (max + min) : delta / (2.0 - max - min);

        const deltaR = (((max - rgb[0]) / 6.0) + (delta / 2.0)) / delta;
        const deltaG = (((max - rgb[1]) / 6.0) + (delta / 2.0)) / delta;
        const deltaB = (((max - rgb[2]) / 6.0) + (delta / 2.0)) / delta;

        if (rgb[0] === max) {
            hsl[0] = deltaB - deltaG;
        } else if (rgb[1] === max) {
            hsl[0] = deltaR - deltaB + (1.0 / 3.0);
        } else if (rgb[2] === max) {
            hsl[0] = deltaG - deltaR + (2.0 / 3.0);
        }

        if (hsl[0] < 0.0) {
            hsl[0] += 1.0;
        } else if (hsl[0] > 1.0) {
            hsl[0] -= 1.0;
        }
        return hsl;
    }


    /**
     * Converts a color from LAB space to XYZ space.
     * @param lab - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
     * @returns - XYZ color tuple: x, y, and z, each in [0.0, 1.0] @todo check this.
     */
    static lab2xyz(lab: GLclampf3): GLclampf3 {

        const yr = (lab[0] + 16.0) / 116.0;
        const xr = lab[1] / 500.0 + yr;
        const zr = yr - lab[2] / 200.0;

        const yr3 = yr * yr * yr;
        const xr3 = xr * xr * xr;
        const zr3 = zr * zr * zr;

        /* white reference for XYZ conversion */
        const y = 0.01 * (yr3 > 0.008856 ? yr3 : (yr - 16.0 / 116.0) / 7.787);
        const x = 0.01 * (xr3 > 0.008856 ? xr3 : (xr - 16.0 / 116.0) / 7.787);
        const z = 0.01 * (zr3 > 0.008856 ? zr3 : (zr - 16.0 / 116.0) / 7.787);

        /* implicit illuminant of [1.0, 1.0, 1.0] assumed */
        return [x, y, z];
    }

    /**
     * Converts a color from XYZ space to LAB space.
     * @param xyz- XYZ color tuple: x, y, and z, each in [0.0, 1.0] @todo check this.
     * @returns - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
     */
    static xyz2lab(xyz: GLclampf3): GLclampf3 {
        /* implicit illuminant of [1.0, 1.0, 1.0] assumed */
        const x = xyz[0] > 0.008856 ? xyz[0] ^ (1.0 / 3.0) : (7.787 * xyz[0]) + (16.0 / 116.0);
        const y = xyz[1] > 0.008856 ? xyz[1] ^ (1.0 / 3.0) : (7.787 * xyz[1]) + (16.0 / 116.0);
        const z = xyz[2] > 0.008856 ? xyz[2] ^ (1.0 / 3.0) : (7.787 * xyz[2]) + (16.0 / 116.0);
        return [116.0 * y - 16.0, 500.0 * (x - y), 200.0 * (y - z)];
    }


    /**
     * Converts a color from XYZ space to Adobe-RGB space.
     * @param xyz - XYZ color tuple: x, y, and z, each in [0.0, 1.0].
     * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     */
    static xyz2rgb(xyz: GLclampf3): GLclampf3 {
        const r = xyz[0] * -2.04159 + xyz[1] * -0.56501 + xyz[2] * -0.34473;
        const g = xyz[0] * -0.96924 + xyz[1] * +1.87597 + xyz[2] * +0.03342;
        const b = xyz[0] * -0.01344 + xyz[1] * -0.11836 + xyz[2] * +1.34926;
        return [Math.pow(r, 1.0 / 2.19921875), Math.pow(g, 1.0 / 2.19921875), Math.pow(b, 1.0 / 2.19921875)];
    }

    /**
     * Converts a color from Adobe-RGB space to XYZ space.
     * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     * @returns - XYZ color tuple: x, y, and z, each in [0.0, 1.0].
     */
    static rgb2xyz(rgb: GLclampf3): GLclampf3 {
        const r = Math.pow(rgb[0], 2.19921875) * 100.0;
        const g = Math.pow(rgb[1], 2.19921875) * 100.0;
        const b = Math.pow(rgb[2], 2.19921875) * 100.0;

        const x = r * 0.57667 + g * 0.18556 + b * 0.18823;
        const y = r * 0.29734 + g * 0.62736 + b * 0.07529;
        const z = r * 0.02703 + g * 0.07069 + b * 0.99134;
        return [x, y, z];
    }


    /**
     * Converts a color from LAB space to RGB space.
     * @param lab - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
     * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     */
    static lab2rgb(lab: GLclampf3): GLclampf3 {
        return Color.xyz2rgb(Color.lab2xyz(lab));
    }

    /**
     * Converts a color from RGB space to LAB space.
     * @param lab - LAB color tuple: lightness, greenRed, and blueYellow, each in [0.0, 1.0].
     * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     */
    static rgb2lab(rgb: GLclampf3): GLclampf3 {
        return Color.xyz2lab(Color.rgb2xyz(rgb));
    }


    /**
     * Converts a color from CMYK space to RGB space.
     * @param cmyk - CMYK color tuple: cyan, magenta, yellow, and key, each in [0.0, 1.0].
     * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     */
    static cmyk2rgb(cmyk: GLclampf4): GLclampf3 {
        const k = 1.0 - cmyk[3];
        return [(1.0 - cmyk[0]) * k, (1.0 - cmyk[1]) * k, (1.0 - cmyk[2]) * k];
    }

    /**
     * Converts a color from RGB space to CMYK space.
     * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     * @returns - CMYK color tuple: cyan, magenta, yellow, and key, each in [0.0, 1.0].
     */
    static rgb2cmyk(rgb: GLclampf3): GLclampf4 {
        const k1 = 1.0 - Math.max(rgb[0], rgb[1], rgb[2]);
        const k2 = 1.0 - k1;
        const k3 = 1.0 / k2;
        return [(k2 - rgb[0]) * k3, (k2 - rgb[1]) * k3, (k2 - rgb[2]) * k3, k1];
    }


    /**
     * Converts a color from HEX string to RGB space. The hex string can start with '#' or '0x' or neither of these.
     * @param hex - Hexadecimal color string: red, green, and blue, each in ['00', 'ff'].
     * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     */
    static hex2rgb(hex: string): GLclampf3 {
        const offset = hex.startsWith('0x') ? 2 : hex.startsWith('#') ? 1 : 0;
        const r = hex.substr(offset + 0, 2).toLowerCase();
        const g = hex.substr(offset + 2, 2).toLowerCase();
        const b = hex.substr(offset + 4, 2).toLowerCase();
        return [parseInt(r, 16) / 255.0, parseInt(b, 16) / 255.0, parseInt(b, 16) / 255.0];
    }

    /**
     * Converts a color from RGB space to HEX string.
     * @param rgb - RGB color tuple: red, green, and blue, each in [0.0, 1.0]
     * @returns - Hexadecimal color string: red, green, and blue, each in ['00', 'ff'], no prefix.
     */
    static rgb2hex(rgb: GLclampf3): string {
        const r = (rgb[0] * 255) & 0xff;
        const g = (rgb[1] * 255) & 0xff;
        const b = (rgb[2] * 255) & 0xff;
        return r.toString(16) + g.toString(16) + b.toString(16);
    }

    /**
     * Converts a color from HEX string to RGBA space. The hex string can start with '#' or '0x' or neither of these.
     * @param hex - Hexadecimal color string: red, green, and blue, each in ['00', 'ff'].
     * @returns - RGBA color tuple: red, green, blue, and alpha, each in [0.0, 1.0]
     */
    static hex2rgba(hex: string): GLclampf4 {
        const offset = hex.startsWith('0x') ? 2 : hex.startsWith('#') ? 1 : 0;
        const r = hex.substr(offset + 0, 2).toLowerCase();
        const g = hex.substr(offset + 2, 2).toLowerCase();
        const b = hex.substr(offset + 4, 2).toLowerCase();
        const a = hex.substr(offset + 6, 2).toLowerCase();
        return [parseInt(r, 16) / 255.0, parseInt(b, 16) / 255.0, parseInt(b, 16) / 255.0, parseInt(a, 16) / 255.0];
    }

    /**
     * Converts a color from RGBA space to HEX string.
     * @param rgba - RGBA color tuple: red, green, blue, and alpha, each in [0.0, 1.0]
     * @returns - Hexadecimal color string: red, green, blue, and alpha, each in ['00', 'ff'], no prefix.
     */
    static rgba2hex(rgba: GLclampf4): string {
        const r = (rgba[0] * 255) & 0xff;
        const g = (rgba[1] * 255) & 0xff;
        const b = (rgba[2] * 255) & 0xff;
        const a = (rgba[3] * 255) & 0xff;
        return r.toString(16) + g.toString(16) + b.toString(16) + a.toString(16);
    }


    /**
     * Specifies the internal rgba store using a color in HSL color space.
     * @param hue - Hue color component in [0.0, 1.0]
     * @param saturation - Saturation color component in [0.0, 1.0]
     * @param lightness - Lightness color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     */
    fromHSL(hue: GLclampf, saturation: GLclampf, lightness: GLclampf
        , alpha: GLclampf = 1.0): void {
        const rgb = Color.hsl2rgb([hue, saturation, lightness]);
        this._rgba = [rgb[0], rgb[1], rgb[2], alpha];
    }

    /**
     * Specifies the internal rgba store using a color in CIE-Lab color space.
     * @param lightness - Lightness color component in [0.0, 1.0]
     * @param greenRed - Green-Red/a color component in [0.0, 1.0]
     * @param blueYellow - Blue-Yellow/b color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     */
    fromLab(lightness: GLclampf, greenRed: GLclampf, blueYellow: GLclampf
        , alpha: GLclampf = 1.0): void {
        const rgb = Color.lab2rgb([lightness, greenRed, blueYellow]);
        this._rgba = [rgb[0], rgb[1], rgb[2], alpha];
    }

    /**
     * Specifies the internal rgba store using a color in CMYK color space.
     * @param cyan - Cyan color component in [0.0, 1.0]
     * @param magenta - Magenta color component in [0.0, 1.0]
     * @param yellow - Yellow color component in [0.0, 1.0]
     * @param key - Key/Black color component in [0.0, 1.0]
     * @param alpha - Alpha color component in [0.0, 1.0]
     */
    fromCMYK(cyan: GLclampf, magenta: GLclampf, yellow: GLclampf, key: GLclampf
        , alpha: GLclampf = 1.0): void {
        const rgb = Color.cmyk2rgb([cyan, magenta, yellow, key]);
        this._rgba = [rgb[0], rgb[1], rgb[2], alpha];
    }

    /**
     * Specifies the internal rgba store using a hexadecimal color string.
     * @param hex - Hexadecimal color string: red, green, and blue, each in ['00', 'ff'].
     * @param alpha - Alpha color component in [0.0, 1.0]
     */
    fromHexRGB(hex: string, alpha: GLclampf = 1.0): void {
        const rgb = Color.hex2rgb(hex);
        this._rgba = [rgb[0], rgb[1], rgb[2], alpha];
    }

    /**
     * Specifies the internal rgba store using a hexadecimal rgba color string.
     * @param hex - Hexadecimal color string: red, green, blue, and alpha, each in ['00', 'ff'].
     */
    fromHexRGBA(hex: string): void {
        this._rgba = Color.hex2rgba(hex);
    }


    gray(algorithm: GrayscaleAlgorithm = GrayscaleAlgorithm.LinearLuminance): GLclampf {

        switch (algorithm) {

            /* does not represent shades of grayscale w.r.t. human perception of luminosity. */
            case GrayscaleAlgorithm.Average:
                return (this._rgba[0] + this._rgba[1] + this._rgba[2]) / 3.0;

            /* flat (reduced contrast) and dark grayscale */
            case GrayscaleAlgorithm.LeastSaturatedVariant:
                return (Math.max(this._rgba[0], this._rgba[1], this._rgba[2])
                    - Math.min(this._rgba[0], this._rgba[1], this._rgba[2])) * 0.5;

            /* provides a darker grayscale */
            case GrayscaleAlgorithm.MinimumDecomposition:
                return Math.min(this._rgba[0], this._rgba[1], this._rgba[2]);

            /* provides a brighter grayscale */
            case GrayscaleAlgorithm.MaximumDecomposition:
                return Math.max(this._rgba[0], this._rgba[1], this._rgba[2]);

            case GrayscaleAlgorithm.LinearLuminance:
            default:
                return this._rgba[0] * 0.2126 + this._rgba[1] * 0.7152 + this._rgba[2] * 0.0722;
        }
    }


    get rgb(): GLclampf3 {
        return [this._rgba[0], this._rgba[1], this._rgba[2]];
    }

    get rgbf(): Float32Array {
        const rgbf = new Float32Array(3);
        rgbf[0] = this._rgba[0];
        rgbf[1] = this._rgba[1];
        rgbf[2] = this._rgba[2];
        return rgbf;
    }

    get rgba(): GLclampf4 {
        return this._rgba;
    }

    get rgbaf(): Float32Array {
        const rgbaf = new Float32Array(4);
        rgbaf[0] = this._rgba[0];
        rgbaf[1] = this._rgba[1];
        rgbaf[2] = this._rgba[2];
        rgbaf[3] = this._rgba[3];
        return rgbaf;
    }


    get r(): GLclampf {
        return this._rgba[0];
    }

    get g(): GLclampf {
        return this._rgba[1];
    }

    get b(): GLclampf {
        return this._rgba[2];
    }

    get a(): GLclampf {
        return this._rgba[3];
    }


    get hexRGB(): string {
        return Color.rgb2hex(this.rgb);
    }

    get hexRGBA(): string {
        return Color.rgba2hex(this._rgba);
    }


    get hsl(): GLclampf3 {
        return Color.rgb2hsl(this.rgb);
    }

    get hsla(): GLclampf4 {
        const hsl = Color.rgb2hsl(this.rgb);
        return [hsl[0], hsl[1], hsl[2], this._rgba[3]];
    }


    get lab(): GLclampf3 {
        return Color.rgb2lab(this.rgb);
    }

    get laba(): GLclampf4 {
        const lab = Color.rgb2lab(this.rgb);
        return [lab[0], lab[1], lab[2], this._rgba[3]];
    }


    get cmyk(): GLclampf4 {
        return Color.rgb2cmyk(this.rgb);
    }

    get cmyka(): GLclampf5 {
        const cmyk = Color.rgb2cmyk(this.rgb);
        return [cmyk[0], cmyk[1], cmyk[2], cmyk[3], this._rgba[3]];
    }

}
