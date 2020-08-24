
/* spellchecker: disable */

import * as chai from 'chai';


const expect = chai.expect;

import { ChangeLookup } from '../source/changelookup';

/* spellchecker: enable */


describe('Change Lookup', () => {

    const alterable = {
        any: false,
        data: {
            any: false,
            alpha: false,
            beta: false,
            gamma: {
                any: false,
                min: false,
                max: false,
                value: false,
            },
            delta: false,
        },
        golden: false,
        modifier: false,
    };


    it('should detect basic property changes', () => {
        const altered = Object.assign(new ChangeLookup(), alterable);

        expect(altered.golden).to.be.false;
        altered.alter('golden');
        expect(altered.golden).to.be.true;
        altered.reset();
        expect(altered.golden).to.be.false;
        altered.alter('data.gamma.min');
        expect(altered.data.gamma.min).to.be.true;
        altered.reset();
        expect(altered.data.gamma.min).to.be.false;
    });

    it('should push leaf changes bottom-up (any)', () => {
        const altered = Object.assign(new ChangeLookup(), alterable);

        expect(altered.any).to.be.false;
        altered.alter('golden');
        expect(altered.any).to.be.true;
        expect(altered.data.any).to.be.false;
        expect(altered.data.gamma.any).to.be.false;
        altered.alter('data.gamma.min');
        expect(altered.data.any).to.be.true;
        expect(altered.data.gamma.any).to.be.true;
        altered.reset();
        expect(altered.any).to.be.false;
        expect(altered.data.any).to.be.false;
        expect(altered.data.gamma.any).to.be.false;
    });

    it('should ignore subsequent alterations', () => {
        const altered = Object.assign(new ChangeLookup(), alterable);

        expect(altered.data.gamma.min).to.be.false;
        altered.alter('data.gamma.min');
        expect(altered.data.gamma.min).to.be.true;
        expect(altered.data.gamma.max).to.be.false;
        expect(altered.data.gamma.any).to.be.true;
        altered.alter('data.gamma.min');
        expect(altered.data.gamma.min).to.be.true;
        altered.alter('data.gamma.max');
        expect(altered.data.gamma.max).to.be.true;
        expect(altered.data.gamma.any).to.be.true;
    });

    it('should propagate alteration of object to sub-objects', () => {
        const altered = Object.assign(new ChangeLookup(), alterable);

        altered.alter('data.gamma');

        expect(altered.any).to.be.true;
        expect(altered.data.any).to.be.true;

        expect(altered.data.alpha).to.be.false;
        expect(altered.data.beta).to.be.false;
        expect(altered.data.delta).to.be.false;

        expect(altered.data.gamma.any).to.be.true;
        expect(altered.data.gamma.min).to.be.true;
        expect(altered.data.gamma.max).to.be.true;
        expect(altered.data.gamma.value).to.be.true;

        altered.alter('data');

        expect(altered.golden).to.be.false;
        expect(altered.modifier).to.be.false;

        expect(altered.data.any).to.be.true;
        expect(altered.data.alpha).to.be.true;
        expect(altered.data.beta).to.be.true;
        expect(altered.data.delta).to.be.true;

        altered.alter('');

        expect(altered.golden).to.be.true;
        expect(altered.modifier).to.be.true;
    });

});
