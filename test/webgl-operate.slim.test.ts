

import * as chai from 'chai';

const expect = chai.expect;


import * as gloperate from '../source/webgl-operate.slim';

/* tslint:disable:no-unused-expression */

/** These tests are intended for detecting major changes within the API (long term goal ...). */

describe('webgl-operate slim API', () => {

    it('should not expose debug facilities', () => {
        const facilities = [
            'TestRenderer',
        ];
        for (const facility of facilities) {
            expect(gloperate[facility]).to.not.exist;
        }
    });

    it('should not expose viewer facilities', () => {
        const facilities = [
        ];
        for (const facility of facilities) {
            expect(gloperate[facility]).to.not.exist;
        }
    });

});
