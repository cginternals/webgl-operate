
import * as chai from 'chai';

const expect = chai.expect;


import { observable } from '../../source/core/observable';


/* tslint:disable:no-unused-expression */

class ObservableMembers {

    @observable<number>() /* expected defaults are false and false */
    protected _alpha: number;

    @observable<number>(true, false)
    protected _beta: number;

    @observable<number>(true, true)
    protected _gamma: number;

    @observable<number>(false, true)
    protected _delta: number;


    test(alpha: number, beta: number, gamma: number, delta: number) {
        this.alpha = alpha;
        this.beta = beta;
        this.gamma = gamma;
        this.delta = delta;
    }

}


describe('Observable', () => {

    it('should make protected member observable', () => {
        const object = new ObservableMembers();
        //expect(object.beta).to.equal(11);

        object.test(1, 2, 3, 4);

        let alpha = 0;

        let beta = 0;
        let beta2 = 0;

        let gamma = 0;
        let reference: ObservableMembers;

        let delta = 0;


        expect(object.alpha).to.throw;
        expect(object.beta).to.equal(2);
        expect(object.gamma).to.equal(3);
        expect(object.delta).to.throw;

        object.alphaObservable.subscribe(value => alpha = value);
        object.betaObservable.subscribe(value => beta = value);
        object.betaObservable.subscribe(value => beta2 = value * 2);

        object.gammaObservable.subscribe(value => {
            gamma = value[0];
            reference = value[1] as ObservableMembers;
        });
        object.deltaObservable.subscribe(value => delta = value[0]);

        expect(alpha).to.equal(1);
        expect(beta).to.equal(2);
        expect(beta2).to.equal(4);
        expect(gamma).to.equal(3);
        expect(reference).to.not.be.undefined;
        expect(delta).to.equal(4);

        object.test(5, 6, 7, 8);
        expect(alpha).to.equal(5);
        expect(beta).to.equal(6);
        expect(beta2).to.equal(12);
        expect(gamma).to.equal(7);
        expect(delta).to.equal(8);

        expect(reference).to.not.be.undefined;

        expect(reference.alpha).to.throw;
        expect(reference.beta).to.equal(6);
        expect(reference.gamma).to.equal(7);
        expect(reference.delta).to.throw;
    });

    it('should observe per object instance', () => {
        const object1 = new ObservableMembers();
        const object2 = new ObservableMembers();

        object1.test(1, 2, 3, 4);

        let alpha1 = 0;
        let alpha2 = 0;

        object1.alphaObservable.subscribe(value => alpha1 = value);
        object2.alphaObservable.subscribe(value => alpha2 = value);

        expect(alpha1).to.equal(1);
        expect(alpha2).to.equal(0);

        object2.test(5, 6, 7, 8);
        expect(alpha1).to.equal(1);
        expect(alpha2).to.equal(5);

        object2.test(9, 10, 11, 12);
        expect(alpha1).to.equal(9);
        expect(alpha2).to.equal(5);
    });

});
