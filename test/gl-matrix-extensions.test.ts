import * as chai from 'chai';

const expect = chai.expect;

import { vec2, vec3, vec4 } from 'gl-matrix';

import {
    abs2, abs3, abs4,
    clamp, clamp2, clamp3, clamp4,
    decode_float24x1_from_uint8x3, decode_uint24_from_rgb8, decode_uint32_from_rgba8,
    encode_float24x1_to_uint8x3, encode_uint24_to_rgb8, encode_uint32_to_rgba8,
    fract, fromVec3, fromVec4,
    mix,
    parseVec2, parseVec3, parseVec4,
    sign,
    v2, v3, v4,
} from '../source/gl-matrix-extensions';


/* tslint:disable:no-unused-expression */

describe('gl-matrix extensions sign', () => {

    it('should return the sign of a number as specified in GLSL', () => {
        expect(sign(-1.0)).to.equal(-1.0);
        expect(sign(-23.0)).to.equal(-1.0);

        expect(sign(0.0)).to.equal(0.0);

        expect(sign(+1.0)).to.equal(+1.0);
        expect(sign(+42.0)).to.equal(+1.0);
    });

});


describe('gl-matrix extensions clamp', () => {

    it('should clamp a number as specified in GLSL', () => {
        expect(clamp(+3, +0, +2)).to.equal(+2);
        expect(clamp(+1, +0, +2)).to.equal(+1);
        expect(clamp(-1, +0, +2)).to.equal(+0);

        expect(clamp(-3, -2, -0)).to.equal(-2);
        expect(clamp(-1, -2, -0)).to.equal(-1);
        expect(clamp(+1, -2, -0)).to.equal(-0);
    });

    it('should clamp a vec2 as specified in GLSL', () => {
        let a: vec2 = vec2.fromValues(2, 2);
        const b: vec2 = vec2.create();
        a = clamp2(b, a, vec2.fromValues(0, 0), vec2.fromValues(1, 1));
        expect(vec2.equals(a, b)).to.be.true;
        expect(vec2.equals(a, vec2.fromValues(1, 1))).to.be.true;

        a[0] = 3;
        a[1] = 4;
        clamp2(b, a, vec2.fromValues(1, 2), vec2.fromValues(2, 3));
        expect(vec2.equals(b, vec2.fromValues(2, 3))).to.be.true;
    });

    it('should clamp a vec3 as specified in GLSL', () => {
        let a: vec3 = vec3.fromValues(2, 2, 2);
        const b: vec3 = vec3.create();
        a = clamp3(b, a, vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1));
        expect(vec3.equals(a, b)).to.be.true;
        expect(vec3.equals(b, vec3.fromValues(1, 1, 1))).to.be.true;

        a[0] = 3;
        a[1] = 4;
        a[2] = 5;
        clamp3(b, a, vec3.fromValues(1, 2, 3), vec3.fromValues(2, 3, 4));
        expect(vec3.equals(b, vec3.fromValues(2, 3, 4))).to.be.true;
    });

    it('should clamp a vec4 as specified in GLSL', () => {
        let a: vec4 = vec4.fromValues(2, 2, 2, 2);
        const b: vec4 = vec4.create();
        a = clamp4(b, a, vec4.fromValues(0, 0, 0, 0), vec4.fromValues(1, 1, 1, 1));
        expect(vec4.equals(a, b)).to.be.true;
        expect(vec4.equals(b, vec4.fromValues(1, 1, 1, 1))).to.be.true;

        a[0] = 3;
        a[1] = 4;
        a[2] = 5;
        a[3] = 6;
        clamp4(b, a, vec4.fromValues(1, 2, 3, 4), vec4.fromValues(2, 3, 4, 5));
        expect(vec4.equals(b, vec4.fromValues(2, 3, 4, 5))).to.be.true;
    });

});


describe('gl-matrix extensions abs', () => {

    it('should return the absolute of a vec2 as specified in GLSL', () => {
        const a: vec2 = vec2.fromValues(-2, 2);
        abs2(a, a);
        expect(a[0]).to.equal(2);
        expect(a[1]).to.equal(2);
    });

    it('should return the absolute of a vec3 as specified in GLSL', () => {
        const a: vec3 = vec3.fromValues(-2, 2, -1);
        abs3(a, a);
        expect(a[0]).to.equal(2);
        expect(a[1]).to.equal(2);
        expect(a[2]).to.equal(1);
    });

    it('should return the absolute of a vec4 as specified in GLSL', () => {
        const a: vec4 = vec4.fromValues(-2, 2, -1, 1);
        abs4(a, a);
        expect(a[0]).to.equal(2);
        expect(a[1]).to.equal(2);
        expect(a[2]).to.equal(1);
        expect(a[3]).to.equal(1);
    });

});


describe('gl-matrix extensions', () => {

    it('should calculate the fraction of a positive or negative number', () => {
        expect(fract(+1.0)).to.equal(0.0);
        expect(fract(-1.0)).to.equal(0.0);

        expect(fract(0.0)).to.equal(0.0);

        expect(fract(+0.1)).to.closeTo(+0.1, 1e-8);
        expect(fract(+1.2)).to.closeTo(+0.2, 1e-8);
        expect(fract(-1.3)).to.closeTo(-0.3, 1e-8);
    });

    it('should mix two numbers as specified in GLSL', () => {
        expect(mix(+1.0, +2.0, 0.0)).to.closeTo(+1.0, 1e-8);
        expect(mix(+1.0, +2.0, 1.0)).to.closeTo(+2.0, 1e-8);
        expect(mix(+1.0, +2.0, 0.5)).to.closeTo(+1.5, 1e-8);
        expect(mix(+2.0, +1.0, 0.0)).to.closeTo(+2.0, 1e-8);
        expect(mix(-2.0, +2.0, 0.5)).to.closeTo(+0.0, 1e-8);
        expect(mix(-2.0, -4.0, 0.5)).to.closeTo(-3.0, 1e-8);
    });

    it('should derive a vec3 from vec4 with division by w component', () => {
        const v4: vec4 = vec4.fromValues(2, 4, 6, 2);
        const v3: vec3 = fromVec4(v4);
        expect(vec3.equals(v3, vec3.fromValues(1, 2, 3))).to.be.true;
    });

    it('should derive a vec4 from vec3 as normalized vec4 with w = 1', () => {
        const v3: vec3 = vec3.fromValues(2, 4, 6);
        const v4: vec4 = fromVec3(v3);
        expect(vec4.equals(v4, vec4.fromValues(2, 4, 6, 1))).to.be.true;
    });

    it('should provide tinified empty vec2, vec3, and vec4 constructors', () => {
        expect(vec2.equals(v2(), vec2.fromValues(0, 0))).to.be.true;
        expect(vec3.equals(v3(), vec3.fromValues(0, 0, 0))).to.be.true;
        expect(vec4.equals(v4(), vec4.fromValues(0, 0, 0, 0))).to.be.true;
    });

    it('should parse vec2 from string', () => {
        expect(parseVec2(undefined)).to.be.undefined;
        expect(parseVec2('')).to.be.undefined;
        expect(parseVec2('[')).to.be.undefined;

        expect(parseVec2('[0.0, 0.0]')).to.be.undefined;

        expect(parseVec2('0.0')).to.be.undefined;
        expect(parseVec2('0.0, 0.0, 0.0')).to.be.undefined;

        expect(vec2.equals(parseVec2('0.0, 0.0'), v2())).to.be.true;
        expect(vec2.equals(parseVec2('2.0, 4.0'), vec2.fromValues(2.0, 4.0))).to.be.true;
    });

    it('should parse vec3 from string', () => {
        expect(parseVec3(undefined)).to.be.undefined;
        expect(parseVec3('')).to.be.undefined;
        expect(parseVec3('[')).to.be.undefined;

        expect(parseVec3('[0.0, 0.0, 0.0]')).to.be.undefined;

        expect(parseVec3('0.0')).to.be.undefined;
        expect(parseVec3('0.0, 0.0')).to.be.undefined;
        expect(parseVec3('0.0, 0.0, 0.0, 0.0')).to.be.undefined;

        expect(vec3.equals(parseVec3('0.0, 0.0, 0.0'), v3())).to.be.true;
        expect(vec3.equals(parseVec3('2.0, 4.0, 8.0'), vec3.fromValues(2.0, 4.0, 8.0))).to.be.true;
    });

    it('should parse vec4 from string', () => {
        expect(parseVec4(undefined)).to.be.undefined;
        expect(parseVec4('')).to.be.undefined;
        expect(parseVec4('[')).to.be.undefined;

        expect(parseVec4('[0.0, 0.0, 0.0, 0.0]')).to.be.undefined;

        expect(parseVec4('0.0')).to.be.undefined;
        expect(parseVec4('0.0, 0.0')).to.be.undefined;
        expect(parseVec4('0.0, 0.0, 0.0')).to.be.undefined;
        expect(parseVec4('0.0, 0.0, 0.0, 0.0, 0.0')).to.be.undefined;

        expect(vec4.equals(parseVec4('0.0, 0.0, 0.0, 0.0'), v4())).to.be.true;
        expect(vec4.equals(parseVec4('1.0, 2.0, 4.0, 8.0'), vec4.fromValues(1.0, 2.0, 4.0, 8.0))).to.be.true;
    });
});


describe('gl-matrix extensions (un)packing', () => {

    it('should pack a uint24 into a uint8x3', () => {
        const uint24 = 250285; // 3D1AD > AD, D1, 03
        const uint8x3: vec3 = vec3.create();
        encode_uint24_to_rgb8(uint8x3, uint24);
        expect(vec3.equals(uint8x3, vec3.fromValues(0xAD, 0xD1, 0x03))).to.be.true;
    });

    it('should unpack a uint24 from a uint8x3', () => {
        const uint8x3: vec3 = vec3.fromValues(0xAD, 0xD1, 0x03);
        const uint24: number = decode_uint24_from_rgb8(uint8x3);
        expect(uint24).to.equal(250285);
    });

    it('should pack a uint32 into a uint8x4', () => {
        const uint32 = 250285; // 3D1AD > AD, D1, 03, 00
        const uint8x4: vec4 = vec4.create();
        encode_uint32_to_rgba8(uint8x4, uint32);
        expect(vec4.equals(uint8x4, vec4.fromValues(0xAD, 0xD1, 0x03, 0x00))).to.be.true;
    });

    it('should unpack a uint32 from a uint8x4', () => {
        const uint8x4: vec4 = vec4.fromValues(0xAD, 0xD1, 0x03, 0x00);
        const uint32: number = decode_uint32_from_rgba8(uint8x4);
        expect(uint32).to.equal(250285);
    });

    it('should pack a float24 into a uint8x3', () => {
        const float24 = 0.12345678;
        const uint8x3: vec3 = vec3.create();
        encode_float24x1_to_uint8x3(uint8x3, float24);
        expect(vec3.equals(uint8x3, vec3.fromValues(0x1F, 0x9A, 0xDD))).to.be.true;
    });

    it('should unpack a float24 from uint8x3', () => {
        const uint8x3: vec3 = vec3.fromValues(0x1F, 0x9A, 0xDD);
        const float24 = decode_float24x1_from_uint8x3(uint8x3);
        expect(float24).to.be.closeTo(0.12345678, 1e-8);
    });
});

