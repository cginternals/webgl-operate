
import * as chai from 'chai';
import * as sinon from 'sinon';

const expect = chai.expect;
const stub = sinon.stub;


import { AllocationRegister } from '../source/allocationregister';
import { Context } from '../source/context';
import { AbstractObject } from '../source/object';


/* tslint:disable:max-classes-per-file no-unused-expression */

class ContextMock {
    allocationRegister = new AllocationRegister();
}

class ObjectMock extends AbstractObject<string> {

    protected _fakeFail: boolean;
    first: boolean | undefined;
    second: boolean | undefined;

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

    create(): string {
        this._object = this._fakeFail ? undefined : 'object';
        this._valid = !this._fakeFail;
        return this._object || 'undefined';
    }
    delete(): void {
        this._object = undefined;
        this._valid = false;
    }

    bind(target?: GLenum): void { }
    unbind(target?: GLenum): void { }
}


describe('Object', () => {

    it('should generate identifier when none is given', () => {
        const context = new ContextMock();
        let object = new ObjectMock(false, context);
        expect(object.identifier).to.be.equal('Object');
        object = new ObjectMock(false, context, '');
        expect(object.identifier).to.be.equal('Object');
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
        const consoleLogStub = stub(console, 'log');
        const object = new ObjectMock(true, context, 'object');
        expect(() => object.initialize()).not.to.throw();
        consoleLogStub.restore();
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
