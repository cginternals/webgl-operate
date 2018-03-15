

import * as chai from 'chai';

const expect = chai.expect;


import * as gloperate from '../source/webgl-operate';

/* tslint:disable:no-unused-expression */

/** These tests are intended for detecting major changes within the API (long term goal ...). */

describe('webgl-operate API', () => {

    it('should expose a fixed set of debug facilities per minor/major', () => {

        const debugFacilities = [
            'TestRenderer',
            'TestNavigation',
        ];

        for (const facility of Object.getOwnPropertyNames(gloperate.debug)) {
            expect(debugFacilities.indexOf(facility), `unexpected facility debug.${facility} found`).to.be.gte(0);
        }

        for (const facility of debugFacilities) {
            expect(gloperate.debug.hasOwnProperty(facility),
                `expected facility debug.${facility} missing`).to.be.true;
        }
    });


    it('should expose a fixed set of viewer facilities per minor/major', () => {

        const viewerFacilities = [
            'EventBlocker',
            'Fullscreen',
        ];

        for (const facility of Object.getOwnPropertyNames(gloperate.viewer)) {
            expect(viewerFacilities.indexOf(facility), `unexpected facility viewer.${facility} found`).to.be.gte(0);
        }

        for (const facility of viewerFacilities) {
            expect(gloperate.viewer.hasOwnProperty(facility),
                `expected facility viewer.${facility} missing`).to.be.true;
        }
    });

});

