
import * as chai from 'chai';

const expect = chai.expect;

import { WEBGL2_EXTENSIONS } from '../../source/core/extensions';
import { ExtensionsHash } from '../../source/core/extensionshash';


class ExtensionsHashMock extends ExtensionsHash {

    static encode64(bitfield: number): string {
        return super.encode64(bitfield);
    }

    static decode64(base64: string): number {
        return super.decode64(base64);
    }
}


describe('ExtensionsHash', () => {

    const FIRST_6_000_EXTENSIONS = ['ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_float'
        , 'EXT_color_buffer_half_float', 'EXT_disjoint_timer_query', 'EXT_disjoint_timer_query_webgl2'];
    const SOME_6_000_EXTENSIONS = ['ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_color_buffer_half_float'
        , 'EXT_disjoint_timer_query', 'EXT_frag_depth', 'EXT_sRGB'];

    it('should encode valid bitfields to base64', () => {
        expect(ExtensionsHashMock.encode64(0b000000)).to.equal('0');
        expect(ExtensionsHashMock.encode64(0b001001)).to.equal('9');
        expect(ExtensionsHashMock.encode64(0b001010)).to.equal('a');
        expect(ExtensionsHashMock.encode64(0b100011)).to.equal('z');
        expect(ExtensionsHashMock.encode64(0b100100)).to.equal('A');
        expect(ExtensionsHashMock.encode64(0b111101)).to.equal('Z');
        expect(ExtensionsHashMock.encode64(0b111110)).to.equal('-');
        expect(ExtensionsHashMock.encode64(0b111111)).to.equal('+');
    });

    it('should decode base64 to valid bitfields', () => {
        expect(ExtensionsHashMock.decode64('0')).to.equal(0b000000);
        expect(ExtensionsHashMock.decode64('9')).to.equal(0b001001);
        expect(ExtensionsHashMock.decode64('a')).to.equal(0b001010);
        expect(ExtensionsHashMock.decode64('z')).to.equal(0b100011);
        expect(ExtensionsHashMock.decode64('A')).to.equal(0b100100);
        expect(ExtensionsHashMock.decode64('Z')).to.equal(0b111101);
        expect(ExtensionsHashMock.decode64('-')).to.equal(0b111110);
        expect(ExtensionsHashMock.decode64('+')).to.equal(0b111111);
    });

    it('should throw on out of range bitfields for encoding', () => {
        expect(() => ExtensionsHashMock.encode64(0)).to.not.throw();
        expect(() => ExtensionsHashMock.encode64(63)).to.not.throw();

        expect(() => ExtensionsHashMock.encode64(-1)).to.throw();
        expect(() => ExtensionsHashMock.encode64(64)).to.throw();
    });

    it('should throw on unknown base64 input for decoding', () => {
        expect(() => ExtensionsHashMock.decode64('0')).to.not.throw();
        expect(() => ExtensionsHashMock.decode64('+')).to.not.throw();

        expect(() => ExtensionsHashMock.decode64('00')).to.throw();
        expect(() => ExtensionsHashMock.decode64('#')).to.throw();
        expect(() => ExtensionsHashMock.decode64('?')).to.throw();
    });

    it('should encode version and backend in head', () => {
        // version 0b000
        expect(ExtensionsHash.encode('webgl1', [])[0]).to.equal('1');
        expect(ExtensionsHash.encode('webgl2', [])[0]).to.equal('2');
    });

    it('should encode single extensions', () => {
        expect(ExtensionsHash.encode('webgl1', SOME_6_000_EXTENSIONS).substring(1)).to.equal('SE000');
        expect(ExtensionsHash.encode('webgl1', [SOME_6_000_EXTENSIONS[5]]).substring(1)).to.equal('08000');
        expect(ExtensionsHash.encode('webgl1', FIRST_6_000_EXTENSIONS).substring(1)).to.equal('+0000');
    });

    it('should throw when decoding hash with invalid length', () => {
        // length for version 0b000 hash is 1 + 6
        expect(() => ExtensionsHashMock.decode('10000')).to.throw();
        expect(() => ExtensionsHashMock.decode('1000000')).to.throw();
    });

    it('should throw when decoding wrong characters in hash', () => {
        expect(() => ExtensionsHashMock.decode('?*#')).to.throw();
    });

    it('should split version and backend when decoding', () => {
        expect(ExtensionsHash.decode('100000')[0]).to.equal('webgl1');
        expect(ExtensionsHash.decode('200000')[0]).to.equal('webgl2');
        /* cannot test another versions yet :P ... */
        // expect(ExtensionsHash.decode('90000000')[0]).to.equal(1);
    });

    it('should decode extensions', () => {
        expect(ExtensionsHash.decode('1SE000')[1]).to.deep.equal(SOME_6_000_EXTENSIONS);
        expect(ExtensionsHash.decode('1+0000')[1]).to.deep.equal(FIRST_6_000_EXTENSIONS);
    });

    it('should complement a set of extensions', () => {
        const SOME_WEBGL2_EXTS = ['EXT_color_buffer_float', 'EXT_disjoint_timer_query_webgl2'
            , 'EXT_texture_filter_anisotropic', 'OES_texture_float_linear', 'OES_texture_half_float_linear'];
        const complement = ExtensionsHash.complement('webgl2', SOME_WEBGL2_EXTS);
        expect(complement.length + SOME_WEBGL2_EXTS.length).to.equal(WEBGL2_EXTENSIONS.length);

        expect(complement).to.not.deep.include(SOME_WEBGL2_EXTS);

        expect(WEBGL2_EXTENSIONS).to.contains.members(complement);
        expect(WEBGL2_EXTENSIONS).to.contains.members(SOME_WEBGL2_EXTS);
    });


});

