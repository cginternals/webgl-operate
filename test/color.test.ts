
/* spellchecker: disable */

import * as chai from 'chai';
import * as sinon from 'sinon';

const expect = chai.expect;
const stub = sinon.stub;

import { Color } from '../source/color';

/* spellchecker: enable */


/* tslint:disable:no-unused-expression */

describe('Color', () => {

    it('should default to [0.0, 0.0, 0.0, 1.0]', () => {
        const color = new Color();
        expect(color.rgba).to.deep.equal([0.0, 0.0, 0.0, 1.0]);
    });

    it('should scale and round unsigned int (8bit) values', () => {
        let color = new Color([0.1, 0.2, 0.3]);
        expect(Array.from(color.rgbUI8)).to.deep.equal([26, 51, 77]);
        color = new Color([0.1, 0.2, 0.3, 0.4]);
        expect(Array.from(color.rgbaUI8)).to.deep.equal([26, 51, 77, 102]);
    });

    it('should provide RGBA UI8 setter', () => {
        const color = new Color();
        color.fromUI8(26, 51, 77);
        expect(color.r).to.be.closeTo(0.1020, 1e-4);
        expect(color.g).to.be.closeTo(0.2000, 1e-4);
        expect(color.b).to.be.closeTo(0.3020, 1e-4);
        expect(color.a).to.be.closeTo(1.0000, 1e-4);

        color.fromUI8(26, 51, 77, 102);
        expect(color.r).to.be.closeTo(0.1020, 1e-4);
        expect(color.g).to.be.closeTo(0.2000, 1e-4);
        expect(color.b).to.be.closeTo(0.3020, 1e-4);
        expect(color.a).to.be.closeTo(0.4000, 1e-4);
    });


    it('should provide RGBA component getter', () => {
        const color = new Color([0.1, 0.2, 0.3, 0.4]);
        expect(color.r).to.be.closeTo(0.1, 1e-6);
        expect(color.g).to.be.closeTo(0.2, 1e-6);
        expect(color.b).to.be.closeTo(0.3, 1e-6);
        expect(color.a).to.be.closeTo(0.4, 1e-6);
    });

    it('should not scale float (32bit) values', () => {
        const color = new Color([0.1, 0.2, 0.3], 0.4);

        expect(color.rgba).to.deep.equal([0.1, 0.2, 0.3, 0.4]);
        const rgbaF32 = Array.from(color.rgbaF32);
        expect(rgbaF32[0]).to.be.closeTo(0.1, 1e-6);
        expect(rgbaF32[1]).to.be.closeTo(0.2, 1e-6);
        expect(rgbaF32[2]).to.be.closeTo(0.3, 1e-6);
        expect(rgbaF32[3]).to.be.closeTo(0.4, 1e-6);

        expect(color.rgb).to.deep.equal([0.1, 0.2, 0.3]);
        const rgbF32 = Array.from(color.rgbF32);
        expect(rgbaF32[0]).to.be.equal(rgbF32[0]);
        expect(rgbaF32[1]).to.be.equal(rgbF32[1]);
        expect(rgbaF32[2]).to.be.equal(rgbF32[2]);
    });


    it('should convert hex color string to RGB(A) color', () => {
        const color = new Color();

        expect(Array.from(color.fromHex('000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 255]);
        expect(Array.from(color.fromHex('000000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 255]);

        expect(Array.from(color.fromHex('248').rgbaUI8)).to.have.ordered.members([34, 68, 136, 255]);
        expect(Array.from(color.fromHex('224488').rgbaUI8)).to.have.ordered.members([34, 68, 136, 255]);

        expect(Array.from(color.fromHex('010101').rgbaUI8)).to.have.ordered.members([1, 1, 1, 255]);
        expect(Array.from(color.fromHex('ffffff').rgbaUI8)).to.have.ordered.members([255, 255, 255, 255]);

        expect(Array.from(color.fromHex('0000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 0]);
        expect(Array.from(color.fromHex('00000000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 0]);

        expect(Array.from(color.fromHex('37be').rgbaUI8)).to.have.ordered.members([51, 119, 187, 238]);
        expect(Array.from(color.fromHex('3377bbee').rgbaUI8)).to.have.ordered.members([51, 119, 187, 238]);

        expect(Array.from(color.fromHex('01010101').rgbaUI8)).to.have.ordered.members([1, 1, 1, 1]);
        expect(Array.from(color.fromHex('ffffffff').rgbaUI8)).to.have.ordered.members([255, 255, 255, 255]);
    });

    it('should support optional \'0x\' and \'#\' prefixes for hex color string to RGB(A) conversion', () => {
        const color = new Color();

        expect(Array.from(color.fromHex('#000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 255]);
        expect(Array.from(color.fromHex('#0000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 0]);
        expect(Array.from(color.fromHex('#000000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 255]);
        expect(Array.from(color.fromHex('#00000000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 0]);

        expect(Array.from(color.fromHex('0x000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 255]);
        expect(Array.from(color.fromHex('0x0000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 0]);
        expect(Array.from(color.fromHex('0x000000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 255]);
        expect(Array.from(color.fromHex('0x00000000').rgbaUI8)).to.have.ordered.members([0, 0, 0, 0]);
    });

    it('should log and default on malformed hex color string to RGB(A) conversion', () => {
        const consoleLogStub = stub(console, 'log');
        const malformed: Array<string> = ['#', '0x', '', '#0', '0x0', '0', '#00', '0x00', '00', '#00000', '0x00000',
            '00000', '#0000000', '0x0000000', '0000000', '#000000000', '0x000000000', '000000000', 'efg', 'xyz'];

        const color = new Color();
        malformed.forEach((value) => color.fromHex(value));
        expect(Array.from(color.rgbaUI8)).to.have.ordered.members([0, 0, 0, 255]);

        expect(consoleLogStub.callCount).to.equal(malformed.length);
        consoleLogStub.restore();
    });

    it('should convert RGB(A) color to hex color string', () => {
        const color = new Color();

        expect(color.fromUI8(0, 0, 0).hexRGB).to.equal('#000000');
        expect(color.fromUI8(0, 0, 0, 255).hexRGBA).to.equal('#000000ff');

        expect(color.fromUI8(34, 68, 136).hexRGB).to.equal('#224488');

        expect(color.fromUI8(1, 1, 1).hexRGB).to.equal('#010101');
        expect(color.fromUI8(1, 1, 1, 1).hexRGBA).to.equal('#01010101');

        expect(color.fromUI8(255, 255, 255).hexRGB).to.equal('#ffffff');
        expect(color.fromUI8(255, 255, 255, 255).hexRGBA).to.equal('#ffffffff');

        expect(color.fromUI8(51, 119, 187, 238).hexRGBA).to.equal('#3377bbee');
    });


    it('should convert CMYK color to RGB color', () => {
        const color = new Color();

        expect(Array.from(color.fromCMYK(0.0, 0.0, 0.0, 1.0).rgbUI8)).to.have.ordered.members([0, 0, 0]);
        expect(Array.from(color.fromCMYK(0.0, 0.0, 0.0, 0.0).rgbUI8)).to.have.ordered.members([255, 255, 255]);
        expect(Array.from(color.fromCMYK(0.0, 0.0, 0.0, 1.0, 0.5).rgbaUI8)).to.have.ordered.members([0, 0, 0, 128]);

        expect(Array.from(color.fromCMYK(0.1, 0.2, 0.3, 0.4).rgbUI8)).to.have.ordered.members([138, 122, 107]);
        expect(Array.from(color.fromCMYK(0.8, 0.7, 0.6, 0.5).rgbUI8)).to.have.ordered.members([25, 38, 51]);
    });

    it('should log and clamp on out of range CMYK components to RGB conversion', () => {
        const color = new Color();
        const consoleLogStub = stub(console, 'log');

        expect(Array.from(color.fromCMYK(-0.1, -0.1, -0.1, -1.0).rgbUI8)).to.have.ordered.members([255, 255, 255]);
        expect(Array.from(color.fromCMYK(+1.1, +0.0, +0.0, +0.0).rgbUI8)).to.have.ordered.members([0, 255, 255]);
        expect(Array.from(color.fromCMYK(+0.0, +1.1, +0.0, +0.0).rgbUI8)).to.have.ordered.members([255, 0, 255]);
        expect(Array.from(color.fromCMYK(+0.0, +0.0, +1.1, +0.0).rgbUI8)).to.have.ordered.members([255, 255, 0]);

        expect(consoleLogStub.callCount).to.equal(4);
        consoleLogStub.restore();
    });

    it('should convert RGB color to CMYK color', () => {
        const color = new Color();

        expect(Array.from(color.fromUI8(0, 0, 0).cmyk)).to.have.ordered.members([0.0, 0.0, 0.0, 1.0]);
        expect(Array.from(color.fromUI8(255, 255, 255).cmyk)).to.have.ordered.members([0.0, 0.0, 0.0, 0.0]);

        let cmyka = color.fromUI8(0, 0, 0, 128).cmyka;
        expect(cmyka[0]).to.be.closeTo(0.0000, 1e-4);
        expect(cmyka[1]).to.be.closeTo(0.0000, 1e-4);
        expect(cmyka[2]).to.be.closeTo(0.0000, 1e-4);
        expect(cmyka[3]).to.be.closeTo(1.0000, 1e-4);
        expect(cmyka[4]).to.be.closeTo(0.5020, 1e-4);

        cmyka = color.fromUI8(138, 122, 107).cmyka;
        expect(cmyka[0]).to.be.closeTo(0.0000, 1e-4);
        expect(cmyka[1]).to.be.closeTo(0.1159, 1e-4);
        expect(cmyka[2]).to.be.closeTo(0.2246, 1e-4);
        expect(cmyka[3]).to.be.closeTo(0.4588, 1e-4);

        cmyka = color.fromUI8(25, 38, 51).cmyka;
        expect(cmyka[0]).to.be.closeTo(0.5098, 1e-4);
        expect(cmyka[1]).to.be.closeTo(0.2549, 1e-4);
        expect(cmyka[2]).to.be.closeTo(0.0000, 1e-4);
        expect(cmyka[3]).to.be.closeTo(0.8000, 1e-4);
    });


    it('should convert HSL color to RGB color', () => {
        const color = new Color();

        expect(Array.from(color.fromHSL(0.0, 0.0, 0.0).rgbUI8)).to.have.ordered.members([0, 0, 0]);
        expect(Array.from(color.fromHSL(0.0, 1.0, 0.0).rgbUI8)).to.have.ordered.members([0, 0, 0]);
        expect(Array.from(color.fromHSL(0.0, 0.0, 1.0).rgbUI8)).to.have.ordered.members([255, 255, 255]);
        expect(Array.from(color.fromHSL(0.0, 1.0, 1.0).rgbUI8)).to.have.ordered.members([255, 255, 255]);

        expect(Array.from(color.fromHSL(0.0000, 1.0, 0.5).rgbUI8)).to.have.ordered.members([255, 0, 0]);
        expect(Array.from(color.fromHSL(0.3333, 1.0, 0.5).rgbUI8)).to.have.ordered.members([0, 255, 0]);
        expect(Array.from(color.fromHSL(0.6666, 1.0, 0.5).rgbUI8)).to.have.ordered.members([0, 0, 255]);
        expect(Array.from(color.fromHSL(1.0000, 1.0, 0.5).rgbUI8)).to.have.ordered.members([255, 0, 0]);

        expect(Array.from(color.fromHSL(0.125, 0.75, 0.5, 0.25).rgbaUI8)).to.have.ordered.members([223, 175, 32, 64]);
    });

    it('should log and clamp on out of range HSL components to RGB conversion', () => {
        const color = new Color();
        const consoleLogStub = stub(console, 'log');

        expect(Array.from(color.fromHSL(-0.1, -0.1, -0.1).rgbUI8)).to.have.ordered.members([0, 0, 0]);
        expect(Array.from(color.fromHSL(+1.1, +0.1, +0.1).rgbUI8)).to.have.ordered.members([28, 23, 23]);
        expect(Array.from(color.fromHSL(+0.1, +0.1, +1.1).rgbUI8)).to.have.ordered.members([255, 255, 255]);
        expect(Array.from(color.fromHSL(+0.1, +1.1, +0.1).rgbUI8)).to.have.ordered.members([51, 31, 0]);

        expect(consoleLogStub.callCount).to.equal(4);
        consoleLogStub.restore();
    });

    it('should convert RGB color to HSL color', () => {
        const color = new Color();

        expect(Array.from(color.fromUI8(0, 0, 0).hsl)).to.have.ordered.members([0.0, 0.0, 0.0]);
        expect(Array.from(color.fromUI8(255, 255, 255).hsl)).to.have.ordered.members([0.0, 0.0, 1.0]);

        let hsla = color.fromUI8(255, 0, 0).hsla;
        expect(hsla[0]).to.be.closeTo(0.0000, 1e-4);
        expect(hsla[1]).to.be.closeTo(1.0000, 1e-4);
        expect(hsla[2]).to.be.closeTo(0.5000, 1e-4);

        hsla = color.fromUI8(0, 255, 0).hsla;
        expect(hsla[0]).to.be.closeTo(0.3333, 1e-4);
        expect(hsla[1]).to.be.closeTo(1.0000, 1e-4);
        expect(hsla[2]).to.be.closeTo(0.5000, 1e-4);

        hsla = color.fromUI8(0, 0, 255).hsla;
        expect(hsla[0]).to.be.closeTo(0.6666, 1e-4);
        expect(hsla[1]).to.be.closeTo(1.0000, 1e-4);
        expect(hsla[2]).to.be.closeTo(0.5000, 1e-4);

        hsla = color.fromUI8(223, 175, 32, 64).hsla;
        expect(hsla[0]).to.be.closeTo(0.1248, 1e-4);
        expect(hsla[1]).to.be.closeTo(0.7490, 1e-4);
        expect(hsla[2]).to.be.closeTo(0.5000, 1e-4);
        expect(hsla[3]).to.be.closeTo(0.2510, 1e-4);

        hsla = color.fromUI8(48, 56, 64).hsla;
        expect(hsla[0]).to.be.closeTo(0.5833, 1e-4);
        expect(hsla[1]).to.be.closeTo(0.1429, 1e-4);
        expect(hsla[2]).to.be.closeTo(0.2196, 1e-4);

        hsla = color.fromUI8(48, 64, 56).hsla;
        expect(hsla[0]).to.be.closeTo(0.4167, 1e-4);
        expect(hsla[1]).to.be.closeTo(0.1429, 1e-4);
        expect(hsla[2]).to.be.closeTo(0.2196, 1e-4);
    });


    it('should convert LAB color to RGB color', () => {
        const color = new Color();

        expect(Array.from(color.fromLAB(0.0, 0.5, 0.5).rgbUI8)).to.have.ordered.members([0, 0, 0]);
        expect(Array.from(color.fromLAB(0.5, 0.5, 0.5).rgbUI8)).to.have.ordered.members([118, 118, 118]);
        expect(Array.from(color.fromLAB(1.0, 0.5, 0.5).rgbUI8)).to.have.ordered.members([255, 255, 255]);

        expect(Array.from(color.fromLAB(0.5, 0.5, 0.5, 0.25).rgbaUI8)).to.have.ordered.members([118, 118, 118, 64]);

        expect(Array.from(color.fromLAB(1.0, 0.0, 0.0).rgbUI8)).to.have.ordered.members([0, 255, 255]);
        expect(Array.from(color.fromLAB(1.0, 0.0, 0.5).rgbUI8)).to.have.ordered.members([0, 255, 254]);
        expect(Array.from(color.fromLAB(1.0, 0.0, 1.0).rgbUI8)).to.have.ordered.members([127, 255, 0]);
        expect(Array.from(color.fromLAB(1.0, 0.5, 0.0).rgbUI8)).to.have.ordered.members([0, 255, 255]);
        expect(Array.from(color.fromLAB(1.0, 0.5, 1.0).rgbUI8)).to.have.ordered.members([255, 250, 0]);
        expect(Array.from(color.fromLAB(1.0, 1.0, 0.0).rgbUI8)).to.have.ordered.members([255, 136, 255]);
        expect(Array.from(color.fromLAB(1.0, 1.0, 0.5).rgbUI8)).to.have.ordered.members([255, 88, 255]);
        expect(Array.from(color.fromLAB(1.0, 1.0, 1.0).rgbUI8)).to.have.ordered.members([255, 67, 0]);

        expect(Array.from(color.fromLAB(0.0, 0.0, 0.0).rgbUI8)).to.have.ordered.members([0, 66, 189]);
        // next line: some converters result in [0,0,0] or [0, 49, 0] here?! so this is debatable here
        expect(Array.from(color.fromLAB(0.0, 0.0, 0.5).rgbUI8)).to.have.ordered.members([0, 52, 0]);
        expect(Array.from(color.fromLAB(0.0, 0.0, 1.0).rgbUI8)).to.have.ordered.members([0, 49, 0]);
        expect(Array.from(color.fromLAB(0.0, 0.5, 0.0).rgbUI8)).to.have.ordered.members([0, 44, 189]);
        expect(Array.from(color.fromLAB(0.0, 0.5, 1.0).rgbUI8)).to.have.ordered.members([52, 0, 0]);
        expect(Array.from(color.fromLAB(0.0, 1.0, 0.0).rgbUI8)).to.have.ordered.members([0, 0, 190]);
        expect(Array.from(color.fromLAB(0.0, 1.0, 0.5).rgbUI8)).to.have.ordered.members([97, 0, 10]);
        // next line: some converters result in [0,0,0] or [133,0,0] here?! so this is debatable:
        expect(Array.from(color.fromLAB(0.0, 1.0, 1.0).rgbUI8)).to.have.ordered.members([107, 0, 0]);

        expect(Array.from(color.fromLAB(0.5, 0.0, 0.0).rgbUI8)).to.have.ordered.members([0, 168, 255]);
        expect(Array.from(color.fromLAB(0.5, 0.0, 0.5).rgbUI8)).to.have.ordered.members([0, 153, 118]);
        expect(Array.from(color.fromLAB(0.5, 0.0, 1.0).rgbUI8)).to.have.ordered.members([0, 151, 0]);
        expect(Array.from(color.fromLAB(0.5, 0.5, 0.0).rgbUI8)).to.have.ordered.members([0, 137, 255]);
        // next line: some converters result in [149, 116, 0], but RGB Adobe 98 is [139, 115, 0]
        expect(Array.from(color.fromLAB(0.5, 0.5, 1.0).rgbUI8)).to.have.ordered.members([139, 115, 0]);
        // next line: some converters result in [185, 0, 255], but RGB Adobe 98 is [152, 0, 255]
        expect(Array.from(color.fromLAB(0.5, 1.0, 0.0).rgbUI8)).to.have.ordered.members([152, 0, 255]);
        // next line: some converters result in [255, 0, 125], but RGB Adobe 98 is [245, 0, 119]
        expect(Array.from(color.fromLAB(0.5, 1.0, 0.5).rgbUI8)).to.have.ordered.members([245, 0, 120]);
        expect(Array.from(color.fromLAB(0.5, 1.0, 1.0).rgbUI8)).to.have.ordered.members([254, 0, 0]);

        // some random values

        expect(Array.from(color.fromLAB(0.8, 0.4, 0.2).rgbUI8)).to.have.ordered.members([0, 219, 255]);
        expect(Array.from(color.fromLAB(0.8, 0.2, 0.4).rgbUI8)).to.have.ordered.members([0, 233, 243]);
        expect(Array.from(color.fromLAB(0.2, 0.4, 0.8).rgbUI8)).to.have.ordered.members([49, 58, 0]);
        // next line: some converters result in [141, 10, 223], but RGB Adobe 98 is [120, 19, 218]
        expect(Array.from(color.fromLAB(0.4, 0.8, 0.2).rgbUI8)).to.have.ordered.members([120, 19, 218]);
        // next line: some converters result in [150, 40, 0], but RGB Adobe 98 is [129, 44, 0]
        expect(Array.from(color.fromLAB(0.33, 0.66, 0.99).rgbUI8)).to.have.ordered.members([129, 44, 0]);
    });

    it('should log and clamp on out of range LAB components to RGB conversion', () => {
        const color = new Color();
        const consoleLogStub = stub(console, 'log');

        expect(Array.from(color.fromLAB(-0.1, -0.1, -0.1).rgbUI8)).to.have.ordered.members([0, 66, 189]);
        expect(Array.from(color.fromLAB(+1.1, +0.1, +0.1).rgbUI8)).to.have.ordered.members([0, 255, 255]);
        expect(Array.from(color.fromLAB(+1.0, +1.1, +0.1).rgbUI8)).to.have.ordered.members([255, 125, 255]);
        expect(Array.from(color.fromLAB(+1.0, +0.1, +1.1).rgbUI8)).to.have.ordered.members([167, 255, 0]);

        expect(consoleLogStub.callCount).to.equal(4);
        consoleLogStub.restore();
    });

    it('should convert RGB color to LAB color', () => {
        const color = new Color();

        expect(Array.from(color.fromUI8(0, 0, 0).lab)).to.have.ordered.members([0.0, 0.5, 0.5]);
        let laba = color.fromUI8(255, 255, 255).laba;
        expect(laba[0]).to.be.closeTo(1.0000, 1e-4);
        expect(laba[1]).to.be.closeTo(0.5000, 1e-4);
        expect(laba[2]).to.be.closeTo(0.5000, 1e-4);

        laba = color.fromUI8(118, 118, 118).laba;
        expect(laba[0]).to.be.closeTo(0.4994, 1e-4);
        expect(laba[1]).to.be.closeTo(0.5000, 1e-4);
        expect(laba[2]).to.be.closeTo(0.5000, 1e-4);

        laba = color.fromUI8(170, 80, 119).laba;
        expect(laba[0]).to.be.closeTo(0.5010, 1e-4);
        expect(laba[1]).to.be.closeTo(0.6960, 1e-4);
        expect(laba[2]).to.be.closeTo(0.4996, 1e-4);

        laba = color.fromUI8(134, 116, 39).laba;
        expect(laba[0]).to.be.closeTo(0.5003, 1e-4);
        expect(laba[1]).to.be.closeTo(0.5014, 1e-4);
        expect(laba[2]).to.be.closeTo(0.6962, 1e-4);

        laba = color.fromUI8(253, 167, 162, 64).laba;
        expect(laba[0]).to.be.closeTo(0.8003, 1e-4);
        expect(laba[1]).to.be.closeTo(0.6547, 1e-4);
        expect(laba[2]).to.be.closeTo(0.5781, 1e-4);
        expect(laba[3]).to.be.closeTo(0.2510, 1e-4);
    });


    it('should compute various grayscales', () => {
        const color = new Color();
        color.fromUI8(48, 96, 192);

        expect(color.gray(Color.GrayscaleAlgorithm.Average)).to.be.closeTo(0.4392, 1e-4);
        expect(color.gray(Color.GrayscaleAlgorithm.LeastSaturatedVariant)).to.be.closeTo(0.2824, 1e-4);
        expect(color.gray(Color.GrayscaleAlgorithm.LinearLuminance)).to.be.closeTo(0.3636, 1e-4);
        expect(color.gray(Color.GrayscaleAlgorithm.MaximumDecomposition)).to.be.closeTo(0.7529, 1e-4);
        expect(color.gray(Color.GrayscaleAlgorithm.MinimumDecomposition)).to.be.closeTo(0.1882, 1e-4);

        expect(color.gray()).to.be.closeTo(0.3636, 1e-4);
    });


    it('should track alterations', () => {
        const color = new Color();
        expect(color.altered).to.be.false;

        color.fromUI8(48, 96, 192);
        expect(color.altered).to.be.true;

        color.altered = false;
        expect(color.altered).to.be.false;

        color.fromHex('#250285');
        expect(color.altered).to.be.true;
        color.altered = false;
        color.fromHex('#250285');
        expect(color.altered).to.be.false;
    });


    it('should support check for equality', () => {
        const color0 = new Color();
        color0.fromUI8(48, 96, 192);

        const color1 = new Color();
        color1.fromUI8(48, 96, 192);

        expect(color0.equals(color1)).to.be.true;
        expect(color1.equals(color0)).to.be.true;

        color1.fromUI8(191, 69, 84);
        expect(color0.equals(color1)).to.be.false;
        color1.fromUI8(48, 96, 192, 1);
        expect(color0.equals(color1)).to.be.false;
    });


    it('should mix two colors in supported color spaces', () => {
        const color0 = new Color();
        color0.fromUI8(10, 20, 40, 80);

        const color1 = new Color();
        color1.fromUI8(20, 40, 80, 160);

        let color2;

        expect(Color.lerp(color0, color1, 0.0, Color.Space.RGB).equals(color0)).to.be.true;
        expect(Color.lerp(color0, color1, 1.0, Color.Space.RGB).equals(color1)).to.be.true;
        color2 = Color.lerp(color0, color1, 0.2, Color.Space.RGB);
        expect(Array.from(color2.rgbaUI8)).to.have.ordered.members([12, 24, 48, 96]);

        expect(Color.lerp(color0, color1, 0.0, Color.Space.LAB).equals(color0)).to.be.true;
        expect(Color.lerp(color0, color1, 1.0, Color.Space.LAB).equals(color1)).to.be.true;
        color2 = Color.lerp(color0, color1, 0.4, Color.Space.LAB);
        expect(Array.from(color2.rgbaUI8)).to.have.ordered.members([16, 29, 55, 112]);

        expect(Color.lerp(color0, color1, 0.0, Color.Space.HSL).equals(color0)).to.be.true;
        expect(Color.lerp(color0, color1, 1.0, Color.Space.HSL).equals(color1)).to.be.true;
        color2 = Color.lerp(color0, color1, 0.6, Color.Space.HSL);
        expect(Array.from(color2.rgbaUI8)).to.have.ordered.members([16, 32, 64, 128]);

        expect(Color.lerp(color0, color1, 0.0, Color.Space.CMYK).equals(color0)).to.be.true;
        expect(Color.lerp(color0, color1, 1.0, Color.Space.CMYK).equals(color1)).to.be.true;
        color2 = Color.lerp(color0, color1, 0.8, Color.Space.CMYK);
        expect(Array.from(color2.rgbaUI8)).to.have.ordered.members([18, 36, 72, 144]);
    });


    it('should support tuple conversion for supported color spaces', () => {
        const color = new Color();

        const cmyk = color.fromUI8(138, 122, 107).tuple(Color.Space.CMYK, false);
        expect(cmyk.length).to.be.equal(4);
        expect(cmyk[0]).to.be.closeTo(0.0000, 1e-4);
        expect(cmyk[1]).to.be.closeTo(0.1159, 1e-4);
        expect(cmyk[2]).to.be.closeTo(0.2246, 1e-4);
        expect(cmyk[3]).to.be.closeTo(0.4588, 1e-4);
        const cmyka = color.fromUI8(134, 116, 39).tuple(Color.Space.CMYK);
        expect(cmyka.length).to.be.equal(5);
        expect(cmyka[4]).to.be.equal(1.0);

        const hsl = color.fromUI8(48, 56, 64).tuple(Color.Space.HSL, false);
        expect(hsl.length).to.be.equal(3);
        expect(hsl[0]).to.be.closeTo(0.5833, 1e-4);
        expect(hsl[1]).to.be.closeTo(0.1429, 1e-4);
        expect(hsl[2]).to.be.closeTo(0.2196, 1e-4);
        const hsla = color.fromUI8(134, 116, 39).tuple(Color.Space.HSL);
        expect(hsla.length).to.be.equal(4);
        expect(hsla[3]).to.be.equal(1.0);

        const lab = color.fromUI8(100, 116, 39).tuple(Color.Space.LAB, false);
        expect(lab.length).to.be.equal(3);
        expect(lab[0]).to.be.closeTo(0.4565, 1e-4);
        expect(lab[1]).to.be.closeTo(0.4121, 1e-4);
        expect(lab[2]).to.be.closeTo(0.6744, 1e-4);
        const laba = color.fromUI8(100, 116, 39).tuple(Color.Space.LAB);
        expect(laba.length).to.be.equal(4);
        expect(laba[3]).to.be.equal(1.0);

        const rgb = color.fromUI8(26, 51, 77).tuple(Color.Space.RGB, false);
        expect(rgb.length).to.be.equal(3);
        expect(rgb[0]).to.be.closeTo(0.1020, 1e-4);
        expect(rgb[1]).to.be.closeTo(0.2000, 1e-4);
        expect(rgb[2]).to.be.closeTo(0.3020, 1e-4);
        const rgba = color.fromUI8(134, 116, 39).tuple(Color.Space.RGB);
        expect(rgba.length).to.be.equal(4);
        expect(rgba[3]).to.be.equal(1.0);
    });

});
