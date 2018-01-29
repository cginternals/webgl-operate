import * as chai from 'chai';

const expect = chai.expect;

import { vec2, vec3, vec4 } from 'gl-matrix';

import {
    abs2, abs3, abs4,
    clamp, clamp2, clamp3, clamp4,
    decode_uint24_from_rgb8, decode_uint32_from_rgba8,
    encode_uint24_to_rgb8, encode_uint32_to_rgba8,
    fromVec3, fromVec4,
    sign,
} from '../../source/core/gl-matrix-ext';


/* tslint:disable:no-unused-expression */

describe('gl-matrix extensions', () => {

    it('sign of a value should behave as specified in GLSL', () => {
        expect(sign(-1.0)).to.equal(-1.0);
        expect(sign(-23.0)).to.equal(-1.0);

        expect(sign(0.0)).to.equal(0.0);

        expect(sign(+1.0)).to.equal(+1.0);
        expect(sign(+42.0)).to.equal(+1.0);
    });

    it('clamping a number should behave as specified in GLSL', () => {
        expect(clamp(+3, +0, +2)).to.equal(+2);
        expect(clamp(+1, +0, +2)).to.equal(+1);
        expect(clamp(-1, +0, +2)).to.equal(+0);

        expect(clamp(-3, -2, -0)).to.equal(-2);
        expect(clamp(-1, -2, -0)).to.equal(-1);
        expect(clamp(+1, -2, -0)).to.equal(-0);
    });

    it('clamping a vec2 should behave as specified in GLSL', () => {
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

    it('absolute on a vec2 should behave as specified in GLSL', () => {
        const a: vec2 = vec2.fromValues(-2, 2);
        abs2(a, a);
        expect(a[0]).to.equal(2);
        expect(a[1]).to.equal(2);
    });

    it('clamping a vec3 should behave as specified in GLSL', () => {
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

    it('absolute on a vec3 should behave as specified in GLSL', () => {
        const a: vec3 = vec3.fromValues(-2, 2, -1);
        abs3(a, a);
        expect(a[0]).to.equal(2);
        expect(a[1]).to.equal(2);
        expect(a[2]).to.equal(1);
    });

    it('clamping a vec4 should behave as specified in GLSL', () => {
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

    it('absolute on a vec4 should behave as specified in GLSL', () => {
        const a: vec4 = vec4.fromValues(-2, 2, -1, 1);
        abs4(a, a);
        expect(a[0]).to.equal(2);
        expect(a[1]).to.equal(2);
        expect(a[2]).to.equal(1);
        expect(a[3]).to.equal(1);
    });

    it('a vec3 should be derived from vec4 with division by w component', () => {
        const v4: vec4 = vec4.fromValues(2, 4, 6, 2);
        const v3: vec3 = fromVec4(v4);
        expect(vec3.equals(v3, vec3.fromValues(1, 2, 3))).to.be.true;
    });

    it('a vec4 should be derived from vec3 as normalized vec4 with w = 1', () => {
        const v3: vec3 = vec3.fromValues(2, 4, 6);
        const v4: vec4 = fromVec3(v3);
        expect(vec4.equals(v4, vec4.fromValues(2, 4, 6, 1))).to.be.true;
    });

});

describe('gl-matrix extensions (un)packing', () => {

    it('a uint24 should be packable into a uint8x3', () => {
        const uint24 = 250285; // 3D1AD > AD, D1, 03
        const uint8x3: vec3 = vec3.create();
        encode_uint24_to_rgb8(uint8x3, uint24);
        expect(vec3.equals(uint8x3, vec3.fromValues(0xAD, 0xD1, 0x03))).to.be.true;
    });

    it('a uint32 should be packable into a uint8x4', () => {
        const uint32 = 250285; // 3D1AD > AD, D1, 03, 00
        const uint8x4: vec4 = vec4.create();
        encode_uint32_to_rgba8(uint8x4, uint32);
        expect(vec4.equals(uint8x4, vec4.fromValues(0xAD, 0xD1, 0x03, 0x00))).to.be.true;
    });

    it('a uint24 should be unpackable from a uint8x3', () => {
        const uint8x3: vec3 = vec3.fromValues(0xAD, 0xD1, 0x03);
        const uint24: number = decode_uint24_from_rgb8(uint8x3);
        expect(uint24).to.equal(250285);
    });

    it('a uint32 should be unpackable from a uint8x4', () => {
        const uint8x4: vec4 = vec4.fromValues(0xAD, 0xD1, 0x03, 0x00);
        const uint32: number = decode_uint32_from_rgba8(uint8x4);
        expect(uint32).to.equal(250285);
    });

});

