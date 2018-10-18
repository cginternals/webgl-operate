
import { clamp } from './gl-matrix-extensions';

import { assert } from './auxiliaries';
import { Color } from './color';
import { fetchJsonAsync } from './fetch';


// /**
//  * Basic color gradient representation that uses color stops, a color at a specific position, to allow for color
//    queries
//  * at arbitrary positions. The gradient provides {@link Color} instances to facilitate the use of various color
//    spaces.
//  * ```
//  * const gradient = new ColorGradient();
//  * gradient.add(new gloperate.Color([0.09, 0.43, 0.58]), 0.2);
//  * gradient.add(new gloperate.Color([0.97, 0.98, 0.98]), 0.8);
//  * ...
//  * gradient.color(0.66).rgb; // [0.7646666765213013, 0.8516666889190674, 0.8866666555404663]
//  * gradient.lerpSpace = ColorGradient.LerpSpace.LAB;
//  * gradient.color(0.66).rgb; // [0.8264121413230896, 0.8263672590255737, 0.8262822031974792]
//  * ```
//  */


export class ColorScale {

    /**
     * Color scale preset file schema.
     */
    private static readonly SCHEMA: any = require('./data/colorscalepresets.schema.json');

    /** @see{@link hint} */
    protected _hint: ColorScale.InterpolationHint;

    /** @ee{@link colors} */
    protected _colors = new Array<Color>();


    /**
     * Returns the stride for interleaved arrays of color components based on the array type.
     * @param type - One of the supported color array types.
     */
    protected static stride(type: ColorScale.ArrayType): number {
        switch (type) {
            default:
            case ColorScale.ArrayType.RGB:
            case ColorScale.ArrayType.RGBf:
                return 3;
            case ColorScale.ArrayType.RGBA:
            case ColorScale.ArrayType.RGBAf:
                return 4;
        }
    }


    /**
     * Fetches a color schema file, and, if successful, picks a preset for the specified number of steps. If the named
     * preset cannot be found, a list of all available presets within the file is logged and undefined is returned. If
     * the preset does not specify exact colors for the requested number of steps, the color array with the most colors
     * and linear interpolation in CIE-LAB is used to generate the scale.
     *
     * The following preset libraries are included within webgl-operate but are required to be loaded dynamically (in
     * order to reduce bundle size and memory use):
     * ```
     * ColorScale.fromPreset('./colorbrewer.json', 'YlGnBu', 7);
     * ColorScale.fromPreset('./smithwalt.json', 'viridis', 16);
     * ```
     * And resolving the promise:
     * ```
     * const scale: ColorScale | undefined = undefined;
     * ColorScale.fromPreset('./data/colorbrewer.json', 'YlGnBu', 5).then((value) => scale = value);
     * ```
     * @param url - Uniform resource locator string referencing a json file complying to the JSON color schema.
     * @param preset - Name of a preset to choose from the json file.
     * @param stepCount - Number of steps to be used for the resulting color scheme.
     * @returns - Undefined if loading and validating the json failed or the preset was not found. Else, a color scale.
     */
    static fromPreset(url: string, preset: string, stepCount: number): Promise<ColorScale> {

        /* This transforms the fetched json data into a color scale. */
        const transform = (data: any): ColorScale | undefined => {

            /* Find named preset. */
            let p: ColorScale.Preset | undefined;
            for (const item of data) {
                if (item.identifier !== preset) {
                    continue;
                }
                p = item as ColorScale.Preset;
                break;
            }
            if (p === undefined) {
                return undefined;
            }

            const type = p.format;
            const stride = ColorScale.stride(type);

            /* Find best color array match for targeted step count. The best match is either the exact number of
            colors or the largest available number. */
            const colorsByStepCount = p.colors;
            let index = colorsByStepCount.length - 1;
            for (let i = 0; i < colorsByStepCount.length; ++i) {
                if (colorsByStepCount[i].length !== stepCount * stride) {
                    continue;
                }
                index = i;
                break;
            }
            const colors = colorsByStepCount[index];

            /* Check if there is a matching positions array to the selected color array. */
            const positionsByStepCount = p.positions;
            if (positionsByStepCount === undefined) {
                return ColorScale.fromArray(colors, type, stepCount, undefined);
            }

            let positions: Array<number> | undefined;
            for (let i = 0; i < positionsByStepCount.length; ++i) {
                if (positionsByStepCount![i].length !== colors.length) {
                    continue;
                }
                positions = positionsByStepCount![i];
            }
            return ColorScale.fromArray(colors, type, stepCount, positions);

        };
        return fetchJsonAsync<ColorScale>(url, transform, ColorScale.SCHEMA.properties);
    }

    /**
     * Creates a color scale from a set of colors and (optional) positions for a specific step count. If no positions
     * are specified, the colors are spread equally. A step count of 1 returns the first color.
     * @param interleavedColorComponents - Interleaved array of color components, e.g., red, green, and blue.
     * @param type - The array type specifying the number of subsequent color components for each color.
     * @param stepCount - Number of colors to be computed from the color scale.
     * @param positions - Interleaved array of positions, matching the length of the color array divided by stride.
     * @returns - A color scale of fixed number and position of colors for index and linear interpolation access.
     */
    static fromArray(interleavedColorComponents: Array<number>, type: ColorScale.ArrayType,
        stepCount: number, positions?: Array<number>): ColorScale {
        if (stepCount === 0 || interleavedColorComponents.length === 0) {
            return new ColorScale();
        }

        const array = interleavedColorComponents; // just a shorter handle
        const stride = ColorScale.stride(type);
        const size = array.length / stride;
        const colors = new Array<Color>(size);

        /* Transform the interleaved array values into instances of Color. */
        for (let i = 0; i < array.length; i += stride) {
            const color = new Color();
            switch (type) {
                case ColorScale.ArrayType.RGB:
                    color.fromUI8(array[i + 0], array[i + 1], array[i + 2]);
                    break;
                case ColorScale.ArrayType.RGBA:
                    color.fromUI8(array[i + 0], array[i + 1], array[i + 2], array[i + 3]);
                    break;
                case ColorScale.ArrayType.RGBf:
                    color.fromF32(array[i + 0], array[i + 1], array[i + 2]);
                    break;
                case ColorScale.ArrayType.RGBAf:
                    color.fromF32(array[i + 0], array[i + 1], array[i + 2], array[i + 3]);
                    break;
                default:
            }
            colors[i / stride] = color;
        }

        const scale = new ColorScale();

        /* No further computation required if colors already match step count and no positions are given. */
        if (positions === undefined && stepCount === size) {
            scale._colors = colors;
            return scale;
        }

        if (stepCount === 1) {
            scale._colors.push(colors[0]);
        }

        /* Note: At this point, stepCount is always > 1. */

        /* Provide equally distributed positions if none are given. */
        if (positions === undefined) {
            positions = new Array(size);
            positions[0] = 0.0;

            for (let i = 1; i < size; ++i) {
                positions[i] = i / (size - 1);
            }
        }
        assert(positions.length === colors.length, `expected number of positions to match number of colors`);

        let lower = 0;
        let upper = lower + 1;
        const last = size - 1;

        /* Compute requested number of colors using linear interpolation of positioned colors. */
        for (let i = 0; i < stepCount; ++i) {
            const position = i === 0 ? 0 : i / (stepCount - 1);

            /* If position is before first or after last stop, return that stop respectively. */
            if (position <= positions[lower]) {
                scale._colors.push(colors[lower]);
                continue;
            } else if (positions[last] <= position) {
                scale._colors.push(colors[last]);
                continue;
            }

            /* There are at least two stops and the position is within these stops ... */

            for (let u = lower + 1; u < size; ++u) {
                if (positions[u] < position) {
                    continue;
                }
                upper = u;
                lower = u - 1;
                break;
            }
            const a = (position - positions[lower]) / (positions[upper] - positions[lower]);
            scale._colors.push(Color.mix(colors[lower], colors[upper], a, Color.Space.LAB));
        }
        return scale;
    }


    /**
     * Queries the color at a given position by identifying the adjacent stops (lower and upper bound) and either
     * interpolating between these or picking the nearest of both. In case no stop exists, a default color will be
     * returned. If only one color exists, this color is always returned no matter the position. If the position is
     * out of bounds, either the first or last stop's color is returned.
     * @param position - Position in [0.0, 1.0] to linear interpolate the color at.
     * @param space - The color space that is to be used for linear interpolation of two colors.
     * @returns - Color, depending on the gradient type either linearly or nearest filtered color.
     */
    lerp(position: number, space: Color.Space = Color.Space.LAB): Color | undefined {

        if (this._colors.length === 0) {
            return undefined;
        }
        if (this._colors.length === 1) {
            return this._colors[0];
        }

        /* Return first or last color if position is 0.0 or 1.0 respectively. */
        const clamped = clamp(position, 0.0, 1.0);
        if (clamped <= 0.0) {
            return this._colors[0];
        } else if (clamped >= 1.0) {
            return this._colors[this._colors.length - 1];
        }

        /* Find lower and upper bound for the given position. */
        const posIndex = position * this._colors.length; // Position in index space.
        const lower = Math.floor(posIndex);
        const upper = lower + 1;
        assert(upper < this._colors.length, `expected upper not exceed maximum color index`);

        if (this._hint === ColorScale.InterpolationHint.Nearest) {
            return this._colors[posIndex - lower > upper - posIndex ? lower : upper];
        }
        return Color.mix(this._colors[lower], this._colors[upper], posIndex - lower, space);
    }

    /**
     * Returns the color with specified index. If the index is out of bounds, undefined is returned. Alternatively, the
     * color array can be used directly @see{@link colors}.
     * @param index - Index of the color to access.
     */
    color(index: number): Color | undefined {
        if (index < 0 || index >= this._colors.length) {
            return undefined;
        }
        return this._colors[index];
    }

    /**
     * Returns the array containing the colors of the color scale.
     */
    get colors(): Array<Color> {
        return this._colors;
    }
    set colors(colors: Array<Color>) {
        this._colors = colors;
    }


    /**
     * The interpolation hint used when accessing a color using interpolation, e.g., @see{@link lerp}.
     */
    set hint(hint: ColorScale.InterpolationHint) {
        this._hint = hint;
    }
    get hint(): ColorScale.InterpolationHint {
        return this._hint;
    }


    /**
     * Converts the color scale into an array of interleaved unsigned int values of the requested color space.
     * @param space - Color space that is to be used for the array.
     * @param alpha - Whether or not alpha is to be included.
     */
    bitsUI8(space: Color.Space = Color.Space.RGB, alpha: boolean = true): Uint8Array {
        const size = this._colors.length;
        const stride = alpha ? 4 : 3;
        const bits = new Uint8Array(size * stride);

        for (let i = 0; i < size; ++i) {
            const color = this._colors[i].tuple(space, alpha);
            bits[i * stride + 0] = color[0] * 255;
            bits[i * stride + 1] = color[1] * 255;
            bits[i * stride + 2] = color[2] * 255;
            if (alpha) {
                bits[i * stride + 3] = color[3] * 255;
            }
        }
        return bits;
    }

    /**
     * Converts the color scale into an array of interleaved float values of the requested color space.
     * @param space - Color space that is to be used for the array.
     * @param alpha - Whether or not alpha is to be included.
     */
    bitsF32(space: Color.Space = Color.Space.RGB, alpha: boolean = true): Float32Array {
        const size = this._colors.length;
        const stride = alpha ? 4 : 3;
        const bits = new Float32Array(size * stride);

        for (let i = 0; i < size; ++i) {
            const color = this._colors[i].tuple(space, alpha);
            bits[i * stride + 0] = color[0];
            bits[i * stride + 1] = color[1];
            bits[i * stride + 2] = color[2];
            if (alpha) {
                bits[i * stride + 3] = color[3];
            }
        }
        return bits;
    }


    /**
     * Provides read access to the number of colors of this scale. This is a shortcut for this.colors.length.
     */
    get length(): number {
        return this._colors.length;
    }

}


export namespace ColorScale {

    /**
     * Color interpolation type for a color scale.
     */
    export enum InterpolationHint {
        Linear = 'linear',
        Nearest = 'nearest',
    }

    export enum ScaleType {
        sequential = 'sequential',
        diverging = 'diverging',
        qualitative = 'qualitative',
    }

    export enum ArrayType {
        RGB = 'rgb',
        RGBf = 'rgbf',
        RGBA = 'rgba',
        RGBAf = 'rgbaf',
    }

    export interface Preset {
        identifier: string;
        type: ScaleType | undefined;
        format: ArrayType;
        colors: Array<Array<number>>;
        positions: Array<Array<number>> | undefined;
    }

}

