

import * as chai from 'chai';

const expect = chai.expect;


import * as gloperate from '../source/webgl-operate.slim';

/* tslint:disable:no-unused-expression */

/** These tests are intended for detecting major changes within the API (long term goal ...). */

describe('webgl-operate slim API', () => {

    it('should expose a fixed set of facilities per minor/major', () => {

        const facilities = [

            '__esModule',

            /* CORE */

            'Canvas',

            'AbstractRenderer',
            'Invalidate',
            'Context',
            'ContextMasquerade',
            'Controller',
            'ExtensionsHash',
            'Wizard',

            'Buffer',
            'DefaultFramebuffer',
            'Framebuffer',
            'Geometry',
            'Program',
            'Renderbuffer',
            'Shader',
            'Texture2',
            'TextureCube',
            'VertexArray',

            'Camera',
            'Color',
            'Navigation',

            'NdcFillingRectangle',
            'NdcFillingTriangle',

            'AntiAliasingKernel',
            'KernelF32',
            'KernelUI32',
            'KernelI32',
            'KernelUI8',
            'KernelI8',
            'RandomSquareKernel',

            'AccumulatePass',
            'BlitPass',
            'ReadbackPass',

            'AlterationLookup',

            'auxiliaries',
            'gl_matrix_extensions',
            'ray_math',
            'tuples',
        ];

        for (const facility of Object.getOwnPropertyNames(gloperate)) {
            expect(facilities.indexOf(facility), `unexpected facility ${facility} found`).to.be.gte(0);
        }

        for (const facility of facilities) {
            expect(gloperate.hasOwnProperty(facility), `expected facility ${facility} missing`).to.be.true;
        }
    });

});
