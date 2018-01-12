import * as chai from 'chai';

const expect = chai.expect;

import { ContextMasquerade } from '../source/core/contextmasquerade';

/* tslint:disable:no-unused-expression */

describe('ContextMasquerade', () => {

    it('should be initializable from hash', () => {
        const masquerade1 = ContextMasquerade.fromHash('1xf-01V0');
        expect(masquerade1.backend).to.equal('webgl1');
        expect(masquerade1.extensionsStrive).to.include('ANGLE_instanced_arrays');
        expect(masquerade1.extensionsStrive).not.to.include('EXT_foo_bar');

        const masquerade2 = ContextMasquerade.fromHash('288M01-o');
        expect(masquerade2.backend).to.equal('webgl2');
    });

    it('should be initializable from browser preset', () => {
        const edgeMasquerade = ContextMasquerade.fromPreset('edge-40');
        expect(edgeMasquerade.backend).to.equal('webgl1');
        expect(edgeMasquerade.extensionsStrive).to.include('ANGLE_instanced_arrays');
        expect(edgeMasquerade.extensionsStrive).not.to.include('EXT_foo_bar');
        expect(edgeMasquerade.extensionsConceal).to.be.empty;
    });

    it('should respect functions being undefined', () => {
        const safariMasquerade = ContextMasquerade.fromPreset('safari-10.1');
        expect(safariMasquerade.functionsUndefine).to.include('readBuffer');
    });

    it('should be initializable from hand written preset', () => {
        const masquerade = ContextMasquerade.fromPreset('no-WEBGL_draw_buffers');
        expect(masquerade.backend).to.equal('webgl1');
        expect(masquerade.extensionsStrive).to.be.empty;
        expect(masquerade.functionsUndefine).to.be.empty;
        expect(masquerade.extensionsConceal).to.include('WEBGL_draw_buffers');
    });

});
