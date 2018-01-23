

import * as chai from 'chai';

const expect = chai.expect;


import * as gloperate from '../source/webgl-operate';

/* tslint:disable:no-unused-expression */


describe('webgl-operate slim API', () => {

    it('should expose core facilities', () => {
        expect(gloperate.Context).to.exist;
        expect(gloperate.ContextMasquerade).to.exist;
        expect(gloperate.ExtensionsHash).to.exist;
    });

});
