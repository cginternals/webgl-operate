
/* spellchecker: disable */

import * as chai from 'chai';

const expect = chai.expect;

import { ColorScale } from '../source/colorscale';
import { Color } from '../source/color';

/* spellchecker: enable */


describe('ColorScale', () => {

    let colors: Array<number>;
    let positions: Array<number>;
    let color: Color;
    let emptyColorScale: ColorScale;
    let oneColorScale: ColorScale;
    let defaultColorScale: ColorScale;

    beforeEach(() => {
        color = new Color([255, 0, 255]);
        colors = [255, 0, 255];
        let stepCount = 7;
        oneColorScale = ColorScale.fromArray(colors, ColorScale.ArrayType.RGB, stepCount);
        colors = [255, 0, 128, 121, 12, 42, 21, 0, 90];
        stepCount = 7;
        positions = [2, 0, 1];
        defaultColorScale = ColorScale.fromArray(colors, ColorScale.ArrayType.RGB, stepCount, positions);
        emptyColorScale = ColorScale.fromArray([], ColorScale.ArrayType.RGB, 0);
    });

    it('should be loadable from present', () => {
        ColorScale.fromPreset('../source/data/colorbrewer', 'YlGnBu', 7).
            then((value) => expect(value).to.not.be.undefined);
    });

    it('should be creatable from an array', () => {
        expect(defaultColorScale).to.not.be.undefined;
        expect(defaultColorScale instanceof ColorScale).to.be.true;
    });

    it('should be creatable from an array with positions', () => {
        const colorScale = ColorScale.fromArray(colors, ColorScale.ArrayType.RGB, 2, positions);
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from an array with positions', () => {
        const colorScale = ColorScale.fromArray(colors, ColorScale.ArrayType.RGB, 1, positions);
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from an array with alpha values', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5, 0.2], ColorScale.ArrayType.RGBA, 1);
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from float an array', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5], ColorScale.ArrayType.RGBf, 1);
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from float an array', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5], ColorScale.ArrayType.RGBf, 3);
        expect(colorScale).to.not.be.undefined;
    });


    it('should be creatable from an array with alpha values', () => {
        const colorScale = ColorScale.fromArray([0.5, 0.5, 0.5, 0.2], ColorScale.ArrayType.RGBAf, 1);
        expect(colorScale).to.not.be.undefined;
    });

    it('should be creatable from an array with empty arrays', () => {
        const colorScale = ColorScale.fromArray([], ColorScale.ArrayType.RGB, 0);
        expect(colorScale).to.not.be.undefined;
    });

    it('should be linear interpolate-able with only one color', () => {
        const interpolatedColor = oneColorScale.lerp(1, Color.Space.RGB);
        expect(interpolatedColor).to.not.be.undefined;
        if (interpolatedColor) {
            expect(interpolatedColor.tuple(Color.Space.RGB, false))
                .to.eql(
                    color.tuple(Color.Space.RGB, false));
        }
    });

    it('should be linear interpolate-able', () => {
        const interpolatedColor = defaultColorScale.lerp(-0.1, Color.Space.RGB);
        expect(interpolatedColor).to.not.be.undefined;
        if (interpolatedColor) {
            expect(interpolatedColor.tuple(Color.Space.RGB, false))
                .to.not.eql(
                    color.tuple(Color.Space.RGB, false));
        }
    });

    it('should be linear interpolate-able with nearest', () => {
        defaultColorScale.hint = ColorScale.InterpolationHint.Nearest;
        const interpolatedColor = defaultColorScale.lerp(-0.1, Color.Space.RGB);
        expect(interpolatedColor).to.not.be.undefined;
        if (interpolatedColor) {
            expect(interpolatedColor.tuple(Color.Space.RGB, false))
                .to.not.eql(
                    color.tuple(Color.Space.RGB, false));
        }
    });


    it('should be undefined when calling lerp on ColorScale without colors', () => {
        const interpolatedColor = emptyColorScale.lerp(1, Color.Space.RGB);
        expect(interpolatedColor).to.be.undefined;
    });

    it('should return the colors', () => {
        let color = defaultColorScale.color(0);
        expect(color).not.to.be.undefined;

        color = defaultColorScale.color(1);
        expect(color).not.to.be.undefined;

        color = defaultColorScale.color(2);
        expect(color).not.to.be.undefined;
    });

    it('should return undefined when calling colors on empty ColorScale', () => {
        let color = emptyColorScale.color(0);
        expect(color).to.be.undefined;
    });

    it('should return undefined when calling colors on out of range', () => {
        let color = defaultColorScale.color(defaultColorScale.length + 1);
        expect(color).to.be.undefined;

        color = defaultColorScale.color(-1);
        expect(color).to.be.undefined;
    });

    it('colors should be set and readable', () => {
        const newColors = [new Color(), new Color(), new Color()];
        const colorScale = new ColorScale();
        colorScale.colors = newColors;
        expect(colorScale.colors).to.be.eql(newColors);
    });

    it('colors should be set and readable', () => {
        const colorScale = new ColorScale();
        colorScale.hint = ColorScale.InterpolationHint.Nearest;
        expect(colorScale.hint).to.eq(ColorScale.InterpolationHint.Nearest);

        colorScale.hint = ColorScale.InterpolationHint.Linear;
        expect(colorScale.hint).to.eq(ColorScale.InterpolationHint.Linear);
    });

    it('should be invertible', () => {
        expect(defaultColorScale.inverted).to.be.false;
        defaultColorScale.invert();
        expect(defaultColorScale.inverted).to.be.true;
    });

    it('should be able to turn to UInt8 bits', () => {
        let uint8Array = defaultColorScale.bitsUI8(Color.Space.RGB, false);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 3);

        uint8Array = defaultColorScale.bitsUI8(Color.Space.RGB, true);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 4);

        uint8Array = emptyColorScale.bitsUI8(Color.Space.RGB, false);
        expect(uint8Array.length).to.eq(0);
    });

    it('should be able to turn to float32 bits', () => {
        let uint8Array = defaultColorScale.bitsF32(Color.Space.RGB, false);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 3);

        uint8Array = defaultColorScale.bitsF32(Color.Space.RGB, true);
        expect(uint8Array.length).to.eq(defaultColorScale.length * 4);

        uint8Array = emptyColorScale.bitsF32(Color.Space.RGB, false);
        expect(uint8Array.length).to.eq(0);
    });


});
