
import * as chai from 'chai';

const expect = chai.expect;


import { AllocationRegister } from '../../source/core/allocationregister';
import { Bindable } from '../../source/core/bindable';
import { Context } from '../../source/core/context';

/* tslint:disable:max-classes-per-file */

class ContextMock {
    allocationRegister = new AllocationRegister();
}

class BindableMock extends Bindable<string> {

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

    create(): string { return this._fakeFail ? undefined : 'bindable'; }
    delete(): void { }

    bind(target?: GLenum): void { }
    unbind(target?: GLenum): void { }
}


describe('Bindable', () => {

    it('should generate identifier when none is given', () => {
        const context = new ContextMock();
        let bindable = new BindableMock(false, context);
        expect(bindable.identifier).to.be.equal('BindableMock');
        bindable = new BindableMock(false, context, '');
        expect(bindable.identifier).to.be.equal('BindableMock');
    });

    it('should create object on initialize', () => {
        const context = new ContextMock();
        const bindable = new BindableMock(false, context);
        bindable.initialize();
        expect(bindable.initialized).to.be.true;
        expect(bindable.object).to.equal('bindable');
    });

    it('should assert when accessing uninitialized object', () => {
        const context = new ContextMock();
        const bindable = new BindableMock(false, context);
        expect(() => bindable.object).to.throw();
    });

    it('should delete object on uninitialize', () => {
        const context = new ContextMock();
        const bindable = new BindableMock(false, context);
        bindable.initialize();
        bindable.uninitialize();
        expect(bindable.initialized).to.be.false;
        expect(() => bindable.object).to.throw();
    });

    it('should be valid only when initialized', () => {
        const context = new ContextMock();
        let bindable = new BindableMock(false, context);
        bindable.initialize();
        expect(bindable.initialized).to.be.true;
        expect(bindable.valid).to.be.true;
        bindable.uninitialize();
        expect(bindable.initialized).to.be.false;
        expect(bindable.valid).to.be.false;
    });

    it('asserting for valid object after creation', () => {
        const context = new ContextMock();
        const bindable = new BindableMock(true, context, 'object');
        expect(() => bindable.initialize()).to.throw();
    });

    it('should pass arguments on initialization', () => {
        const context = new ContextMock();
        const bindable = new BindableMock(false, context);

        bindable.initialize();
        expect(bindable.first).to.be.undefined;
        expect(bindable.second).to.be.undefined;
        bindable.uninitialize();

        bindable.initialize(true);
        expect(bindable.first).to.be.true;
        expect(bindable.second).to.be.undefined;
        bindable.uninitialize();

        bindable.initialize(false);
        expect(bindable.first).to.be.false;
        expect(bindable.second).to.be.undefined;
        bindable.uninitialize();

        bindable.initialize(true, true);
        expect(bindable.first).to.be.true;
        expect(bindable.second).to.be.true;
    });

});
