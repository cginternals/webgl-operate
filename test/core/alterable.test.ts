
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

    });

    it('should replicate nested properties for lookup', () => {

    });

    it('should detect basic property changes', () => {

    });

    it('should push leaf changes bottom-up (any)', () => {

    });

});
