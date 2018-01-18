

import * as chai from 'chai';

const expect = chai.expect;


import * as gloperate from '../src/webgl-operate';

/* tslint:disable:no-unused-expression */


describe('webgl-operate slim API', () => {

    it('should expose core facilities', () => {
        expect(gloperate.ExtensionsHash).to.exist;
        expect(gloperate.ContextMasquerade).to.exist;
    });

});
