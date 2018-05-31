
import { vec4 } from 'gl-matrix';
import { mix } from './gl-matrix-extensions';

import { Color } from './color';
import { tuple4 } from './tuples';

/* tslint:disable:max-classes-per-file */

class ColorGradientStop {
    color: Color;
    position: number;
}

/**
 */
export class ColorGradient {

    protected _stops = new Array<ColorGradientStop>();

    protected _type: ColorGradient.Type;
    protected _lerpSpace: ColorGradient.LerpSpace = ColorGradient.LerpSpace.RGB;

    /**
     * Performs a linear interpolation between x and y using a to weight between them within the gradient's color space.
     * @param x - First color stop for mix/linear interpolation.
     * @param y - Second color stop for mix/linear interpolation.
     * @param a - Specify the value to use to interpolate between x and y.
     */
    protected lerp(x: ColorGradientStop, y: ColorGradientStop, a: number): Color {
        const position = (a - x.position) / (y.position - x.position);

        const result = vec4.create();
        switch (this._lerpSpace) {
            case ColorGradient.LerpSpace.CMYK:
                vec4.lerp(result, x.color.cmyk, y.color.cmyka, position);
                const alpha = mix(x.color.a, y.color.a, position);
                return new Color().fromCMYK(result[0], result[1], result[2], result[3], alpha);

            case ColorGradient.LerpSpace.LAB:
                vec4.lerp(result, x.color.laba, y.color.laba, position);
                return new Color().fromLAB(result[0], result[1], result[2], result[3]);

            case ColorGradient.LerpSpace.HSL:
                vec4.lerp(result, x.color.hsla, y.color.hsla, position);
                return new Color().fromHSL(result[0], result[1], result[2], result[3]);

            case ColorGradient.LerpSpace.RGB:
            default:
                vec4.lerp(result, x.color.rgba, y.color.rgba, position);
                return new Color(tuple4<GLfloat>(result));
        }
    }

    /**
     * Queries the color at a given position by identifying the adjacent stops (lower and upper bound) and either
     * interpolating between these or picking the nearest of both. In case no stop exists, a default color will be
     * returned. If only one color exists, this color is always returned no matter the position. If the position is
     * out of bounds, either the first or last stop's color is returned.
     * @param position - Position to query the color at.
     * @returns - Color, depending on the gradient type either linearly or nearest filtered color.
     */
    color(position: number): Color | undefined {
        if (this._stops.length === 0) {
            return undefined;
        }
        if (this._stops.length === 1) {
            return this._stops[0].color;
        }

        let lowerBound: ColorGradientStop = this._stops[0];
        let upperBound: ColorGradientStop = this._stops[this._stops.length - 1];

        /* If position is before first or after last stop, return that stop respectively. */
        if (position <= lowerBound.position) {
            return lowerBound.color;
        } else if (upperBound.position <= position) {
            return upperBound.color;
        }

        /* There are at least two stops and the position is within these stops ... */

        /* tslint:disable-next-line:prefer-for-of */
        for (let i = 1; i < this._stops.length; ++i) {
            if (this._stops[i].position < position) {
                continue;
            }
            upperBound = this._stops[i];
            lowerBound = this._stops[i - 1];
            break;
        }

        if (this._type === ColorGradient.Type.Nearest) {
            const midpoint = (upperBound.position - lowerBound.position) * 0.5;
            return midpoint > position ? lowerBound.color : upperBound.color;
        }
        return this.lerp(lowerBound, upperBound, position);
    }

    bitsRgbaUI8(length?: number): Uint8Array {
        const size = length === undefined ? this._stops.length : length;
        const bits = new Uint8Array(size * 4);

        for (let i = 0; i < size; ++i) {
            const color = (this.color(i / size) as Color).rgbaUI8;
            bits[i * 4 + 0] = color[0];
            bits[i * 4 + 1] = color[1];
            bits[i * 4 + 2] = color[2];
            bits[i * 4 + 3] = color[3];
        }
        return bits;
    }

    bitsRgbaF32(length?: number): Float32Array {
        const size = length === undefined ? this._stops.length : length;
        const bits = new Float32Array(size * 4);

        for (let i = 0; i < size; ++i) {
            const color = (this.color(i / size) as Color).rgbaF32;
            bits[i * 4 + 0] = color[0];
            bits[i * 4 + 1] = color[1];
            bits[i * 4 + 2] = color[2];
            bits[i * 4 + 3] = color[3];
        }
        return bits;
    }

    add(color: Color, position: number): void {
        let index = 0;
        while (index < this._stops.length && this._stops[index].position < position) {
            index++;
        }

        const stop = new ColorGradientStop();
        stop.color = color;
        stop.position = position;

        this._stops.splice(index, 0, stop);
    }


    get colors(): Array<Color> {
        const colors = new Array<Color>(this._stops.length);
        for (const index in this._stops) {
            colors[index] = this._stops[index].color;
        }
        return colors;
    }

    get positions(): Array<number> {
        const positions = new Array<number>(this._stops.length);
        for (const index in this._stops) {
            positions[index] = this._stops[index].position;
        }
        return positions;
    }


    set type(type: ColorGradient.Type) {
        this._type = type;
    }

    get type(): ColorGradient.Type {
        return this._type;
    }


    set lerpSpace(space: ColorGradient.LerpSpace) {
        this._lerpSpace = space;
    }

    get lerpSpace(): ColorGradient.LerpSpace {
        return this._lerpSpace;
    }

}

export namespace ColorGradient {

    export enum Type {
        Linear = 'linear',
        Nearest = 'nearest',
    }

    export enum LerpSpace {
        RGB,
        HSL,
        LAB,
        CMYK,
    }

}
