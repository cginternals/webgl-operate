
import * as chai from 'chai';

const expect = chai.expect;


import { alterable } from '../../source/core/alterable';


/* tslint:disable:no-unused-expression */

interface SomeInterface {
    alpha: boolean;
    beta: string;
    gamma: { min: number, max: number, value: number };
    delta: number;
}


class AlterableMembers {

    @alterable<number>(1.6180)
    golden: number;

    @alterable<string>('linear')
    modifier: string;

    @alterable<SomeInterface>({
        alpha: true,
        beta: 'true',
        gamma: {
            min: 0.0,
            max: 1.0,
            value: 0.2,
        },
        delta: 1.0,
    })
    data: SomeInterface;
}


describe('Alterable', () => {

    it('should replicate basic properties for lookup', () => {
        const object = new AlterableMembers() as any;

        expect(object.altered).to.not.be.undefined;
        expect(object.altered.golden).to.be.false;
        expect(object.altered.modifier).to.be.false;
    });

    it('should work on multiple objects', () => {
        const object1 = new AlterableMembers() as any;
        const object2 = new AlterableMembers() as any;

        object1.golden = 1.0;
        object2.modifier = 'square';

        expect(object1.altered.golden).to.be.true;
        expect(object1.altered.modifier).to.be.false;

        expect(object2.altered.golden).to.be.false;
        expect(object2.altered.modifier).to.be.true;
    });


    it('should replicate nested properties for lookup', () => {
        const object = new AlterableMembers() as any;

        expect(object.altered).to.not.be.undefined;
        expect(object.altered.data).to.not.be.undefined;
        expect(object.altered.data.alpha).to.be.false;
        expect(object.altered.data.beta).to.be.false;
        expect(object.altered.data.gamma).to.not.be.undefined;
        expect(object.altered.data.gamma.min).to.be.false;
        expect(object.altered.data.gamma.max).to.be.false;
        expect(object.altered.data.gamma.value).to.be.false;
        expect(object.altered.data.delta).to.be.false;
    });

    it('should detect basic property changes', () => {
        const object = new AlterableMembers() as any;

        expect(object.altered.golden).to.be.false;
        object.golden = 1.6180;
        expect(object.altered.golden).to.be.false;
        object.golden = 1.0 / 1.6180;
        expect(object.altered.golden).to.be.true;
        object.altered.reset();
        expect(object.altered.golden).to.be.false;
        object.altered.alter('modifier');
        expect(object.altered.modifier).to.be.true;
        object.altered.reset();
        expect(object.altered.modifier).to.be.false;
    });

    it('should push leaf changes bottom-up (any)', () => {
        const object = new AlterableMembers() as any;

        expect(object.altered.any).to.be.false;
        object.golden = 1.0 / 1.6180;
        expect(object.altered.any).to.be.true;
        object.modifier = 'square';
        expect(object.altered.any).to.be.true;
        object.altered.reset();
        expect(object.altered.any).to.be.false;
    });

});
