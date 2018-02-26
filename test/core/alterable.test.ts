
import * as chai from 'chai';

const expect = chai.expect;


import { AlterationLookup } from '../../source/core/alterable';


/* tslint:disable:no-unused-expression */

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


describe('Alterable', () => {

    it('should detect basic property changes', () => {
        const altered = Object.assign(new AlterationLookup(), alterable);

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
        const altered = Object.assign(new AlterationLookup(), alterable);

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
        const altered = Object.assign(new AlterationLookup(), alterable);

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

});
