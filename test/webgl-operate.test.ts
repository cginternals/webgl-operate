

import * as chai from 'chai';

const expect = chai.expect;


import * as gloperate from '../source/webgl-operate';

/* tslint:disable:no-unused-expression */


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
        ];
        for (const facility of facilities) {
            expect(gloperate[facility]).to.exist;
        }
    });

    it('should expose debug facilities', () => {

    });

    it('should expose viewer facilities', () => {

    });

});

