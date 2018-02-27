

import * as chai from 'chai';

const expect = chai.expect;


import * as gloperate from '../source/webgl-operate';

/* tslint:disable:no-unused-expression */

/** These tests are intended for detecting major changes within the API (long term goal ...). */

describe('webgl-operate API', () => {

    it('should expose core facilities', () => {
        const facilities = [
            'Canvas',

            'Controller',
            'AbstractRenderer',
            'Context',
            'ContextMasquerade',
            'ExtensionsHash',

            'Buffer',
            'DefaultFramebuffer',
            'Framebuffer',
            'Geometry',
            'Program',
            'Renderbuffer',
            'Shader',
            'Texture2',
            'VertexArray',

            'NdcFillingRectangle',
            'NdcFillingTriangle',

            'Color',

            'KernelF32',
            'KernelUI32',
            'KernelI32',
            'KernelUI8',
            'KernelI8',
        ];
        for (const facility of facilities) {
            expect(gloperate[facility]).to.exist;
        }
    });

    it('should expose debug facilities', () => {
        const facilities = [
            'TestRenderer',
        ];
        for (const facility of facilities) {
            expect(gloperate[facility]).to.exist;
        }
    });

    it('should expose viewer facilities', () => {
        const facilities = [
        ];
        for (const facility of facilities) {
            expect(gloperate[facility]).to.exist;
        }
    });

});

