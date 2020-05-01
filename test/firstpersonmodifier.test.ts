
/* spellchecker: disable */

import * as chai from 'chai';
import * as spies from 'chai-spies';

chai.use(spies);

const expect = chai.expect;

import { Camera } from '../source/camera';
import { FirstPersonModifier } from '../source/firstpersonmodifier';

/* spellchecker: enable */


/* tslint:disable:no-unused-expression */

describe('first person modifier', () => {
    let firstPersonModifier: FirstPersonModifier;
    let originalCamera: Camera;
    let firstPersonModifierCamera: Camera;

    beforeEach(() => {
        firstPersonModifier = new FirstPersonModifier();

        originalCamera = new Camera();
        firstPersonModifierCamera = new Camera();
        firstPersonModifier.camera = firstPersonModifierCamera;
        firstPersonModifier.initiate([0.0, 0.0]);
    });

    it('should be creatable', () => {
        expect(firstPersonModifier).not.to.be.null;
    });

    it('should not modify the camera if no changes were made', () => {
        firstPersonModifier.update();
        expect(firstPersonModifierCamera).to.eql(originalCamera);
    });

    it('should modify the camera if changes were made', () => {
        firstPersonModifier.process([2.0, 5.0], [3.0, 5.0]);
        firstPersonModifier.update();
        expect(firstPersonModifierCamera).to.not.eql(originalCamera);
    });

    it('should modify the camera if changes were made without movement', () => {
        firstPersonModifier.process([2.0, 5.0]);
        firstPersonModifier.update();
        expect(firstPersonModifierCamera).to.not.eql(originalCamera);
    });

    it('should have the default sensitivity', () => {
        expect(firstPersonModifier.sensitivity).to.be.equal(0.0008);
    });

    it('should be able to change the sensitivity', () => {
        const newSensitivity = 1.0;
        firstPersonModifier.sensitivity = newSensitivity;
        expect(firstPersonModifier.sensitivity).to.be.equal(newSensitivity);
    });

});

describe('first person modifier functions ', () => {
    let firstPersonModifier: FirstPersonModifier;

    beforeEach(() => {
        firstPersonModifier = new FirstPersonModifier();
    });

    it('update should not fail if the camera is not set', () => {
        expect(() => {
            firstPersonModifier.update();
        }).to.not.throw();
    });

    it('camera setter should not fail on same camera as input', () => {
        const camera = new Camera();
        firstPersonModifier.camera = camera;
        expect(() => {
            firstPersonModifier.camera = camera;
        }).to.not.throw();
    });

    it('camera setter should not fail if undefined is provided', () => {
        expect(() => {
            firstPersonModifier.camera = undefined;
        }).to.not.throw();
    });
});
