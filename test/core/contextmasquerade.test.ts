import * as chai from 'chai';
import * as sinon from 'sinon';

const expect = chai.expect;

import * as common from '../../source/core/common';
import { ContextMasquerade } from '../../source/core/contextmasquerade';


/* tslint:disable:no-unused-expression */

describe('ContextMasquerade', () => {

    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());
    after(() => sandbox.restore());


    it('should be initializable from hash', () => {
        const masquerade1 = ContextMasquerade.fromHash('1w0000');
        expect(masquerade1.backend).to.equal('webgl1');
        expect(masquerade1.extensionsStrive).to.include('ANGLE_instanced_arrays');
        expect(masquerade1.extensionsStrive).not.to.include('EXT_foo_bar');

        const masquerade2 = ContextMasquerade.fromHash('288M01');
        expect(masquerade2.backend).to.equal('webgl2');
    });

    it('should be initializable from browser preset', () => {
        const mask = ContextMasquerade.fromPreset('chrome-63');
        const UNSUPPORTED_EXTS = ['OES_texture_half_float_linear', 'WEBGL_compressed_texture_astc'
            , 'WEBGL_compressed_texture_atc', 'WEBGL_compressed_texture_etc', 'WEBGL_compressed_texture_etc1'
            , 'WEBGL_compressed_texture_pvrtc'];

        expect(mask.backend).to.equal('webgl2');
        expect(mask.extensionsStrive).to.include('EXT_color_buffer_float');
        expect(mask.extensionsStrive).to.include('WEBGL_compressed_texture_s3tc');
        expect(mask.extensionsStrive).not.to.contain.members(UNSUPPORTED_EXTS);

        expect(mask.extensionsConceal.length).to.equal(UNSUPPORTED_EXTS.length);
        expect(mask.extensionsConceal).to.contain.members(UNSUPPORTED_EXTS);
    });

    it('should respect functions being undefined', () => {
        const safariMasquerade = ContextMasquerade.fromPreset('no-readBuffer');
        expect(safariMasquerade.functionsUndefine).to.include('readBuffer');
    });

    it('should be initializable from empty preset', () => {
        const jsonStub = sandbox.stub(ContextMasquerade, 'presets');
        jsonStub.returns([{ identifier: 'empty', backend: 'webgl1' }]);

        const masquerade = ContextMasquerade.fromPreset('empty');
        expect(masquerade.backend).to.equal('webgl1');
        expect(masquerade.extensionsStrive).to.be.empty;
        expect(masquerade.functionsUndefine).to.be.empty;
        expect(masquerade.extensionsConceal).to.be.empty;

        jsonStub.restore();
    });

    it('should be initializable from hand written preset', () => {
        const masquerade = ContextMasquerade.fromPreset('no-WEBGL_draw_buffers');
        expect(masquerade.backend).to.equal('webgl1');
        expect(masquerade.extensionsStrive).to.be.empty;
        expect(masquerade.functionsUndefine).to.be.empty;
        expect(masquerade.extensionsConceal).to.include('WEBGL_draw_buffers');
    });

    it('should be initializable by GET using hash', () => {
        const getParameterStub = sandbox.stub(common, 'GETparameter');
        getParameterStub.returns('1w0000');

        const masquerade = ContextMasquerade.fromGET();
        expect(masquerade.backend).to.equal('webgl1');
        expect(masquerade.extensionsStrive).to.include('ANGLE_instanced_arrays');
        expect(masquerade.extensionsStrive).not.to.include('EXT_foo_bar');
    });

    it('should be initializable by GET using preset', () => {
        const getParameterStub = sandbox.stub(common, 'GETparameter');
        getParameterStub
            .onFirstCall().returns(undefined)
            .onSecondCall().returns('edge-41');

        const masquerade = ContextMasquerade.fromGET();
        expect(masquerade.backend).to.equal('webgl1');
        expect(masquerade.extensionsStrive).to.include('ANGLE_instanced_arrays');
        expect(masquerade.extensionsStrive).not.to.include('EXT_foo_bar');
    });

    it('should fail if GET values are not present', () => {
        const getParameterStub = sandbox.stub(common, 'GETparameter');
        getParameterStub.returns(undefined);

        const masquerade = ContextMasquerade.fromGET();
        expect(masquerade).to.be.undefined;
    });
});
