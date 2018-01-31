
import * as chai from 'chai';

const expect = chai.expect;


import { AllocationRegister } from '../../source/core/allocationregister';
import { Context } from '../../source/core/context';
import { AbstractObject } from '../../source/core/object';

/* tslint:disable:max-classes-per-file no-unused-expression */

class ContextMock {
    allocationRegister = new AllocationRegister();
}

class ObjectMock extends AbstractObject<string> {

    protected _fakeFail;
    first: boolean = undefined;
    second: boolean = undefined;

    constructor(fakeFail: boolean, context: ContextMock, identifier?: string) {
        super(context as Context, identifier);
        this._fakeFail = fakeFail;
    }

    initialize(first?: boolean, second?: boolean): boolean {
        const result = super.initialize();

        this.first = first;
        this.second = second;
        return result;
    }

    create(): string { return this._fakeFail ? undefined : 'object'; }
    delete(): void { }

    bind(target?: GLenum): void { }
    unbind(target?: GLenum): void { }
}


describe('Object', () => {

    it('should generate identifier when none is given', () => {
        const context = new ContextMock();
        let object = new ObjectMock(false, context);
        expect(object.identifier).to.be.equal('ObjectMock');
        object = new ObjectMock(false, context, '');
        expect(object.identifier).to.be.equal('ObjectMock');
    });

    it('should create object on initialize', () => {
        const context = new ContextMock();
        const object = new ObjectMock(false, context);
        object.initialize();
        expect(object.initialized).to.be.true;
        expect(object.object).to.equal('object');
    });

    it('should assert when accessing uninitialized object', () => {
        const context = new ContextMock();
        const object = new ObjectMock(false, context);
        expect(() => object.object).to.throw();
    });

    it('should delete object on uninitialize', () => {
        const context = new ContextMock();
        const object = new ObjectMock(false, context);
        object.initialize();
        object.uninitialize();
        expect(object.initialized).to.be.false;
        expect(() => object.object).to.throw();
    });

    it('should be valid only when initialized', () => {
        const context = new ContextMock();
        const object = new ObjectMock(false, context);
        object.initialize();
        expect(object.initialized).to.be.true;
        expect(object.valid).to.be.true;
        object.uninitialize();
        expect(object.initialized).to.be.false;
        expect(object.valid).to.be.false;
    });

    it('asserting for valid object after creation', () => {
        const context = new ContextMock();
        const object = new ObjectMock(true, context, 'object');
        expect(() => object.initialize()).to.throw();
    });

    it('should pass arguments on initialization', () => {
        const context = new ContextMock();
        const object = new ObjectMock(false, context);

        object.initialize();
        expect(object.first).to.be.undefined;
        expect(object.second).to.be.undefined;
        object.uninitialize();

        object.initialize(true);
        expect(object.first).to.be.true;
        expect(object.second).to.be.undefined;
        object.uninitialize();

        object.initialize(false);
        expect(object.first).to.be.false;
        expect(object.second).to.be.undefined;
        object.uninitialize();

        object.initialize(true, true);
        expect(object.first).to.be.true;
        expect(object.second).to.be.true;
    });

});
