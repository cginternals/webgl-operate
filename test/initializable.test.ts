
import * as chai from 'chai';

const expect = chai.expect;


import { Initializable as AbstractInitializable } from '../source/initializable';


/* tslint:disable:no-unused-expression */

class Initializable extends AbstractInitializable {

    @Initializable.initialize()
    initialize(result: boolean = true): boolean {
        return result;
    }

    @Initializable.uninitialize()
    uninitialize(): void { }

    publicAssertInitialized = () => this.assertInitialized();
    publicAssertUninitialized = () => this.assertUninitialized();

    @Initializable.assert_initialized()
    expectInitialized(): void { }

    @Initializable.assert_uninitialized()
    expectUninitialized(): void { }
}


describe('Initializable', () => {

    it('should be uninitialized after construction', () => {
        const initializable = new Initializable();
        expect(initializable.initialized).to.be.false;
    });

    it('should initialize when not initialized', () => {
        const initializable = new Initializable();
        expect(() => initializable.initialize()).not.to.throw();
        expect(initializable.initialized).to.be.true;
    });

    it('should un-initialize when initialized', () => {
        const initializable = new Initializable();
        initializable.initialize();
        expect(() => initializable.uninitialize()).not.to.throw();
        expect(initializable.initialized).to.be.false;
    });

    it('should not uninitialize when not initialized', () => {
        const initializable = new Initializable();
        expect(() => initializable.uninitialize()).to.throw();
    });

    it('should not initialize multiple times (subsequently)', () => {
        const initializable = new Initializable();
        initializable.initialize();
        expect(() => initializable.initialize()).to.throw();
    });

    it('should re-initialize when previously initialized and uninitialized', () => {
        const initializable = new Initializable();
        initializable.initialize();
        initializable.uninitialize();
        expect(() => initializable.initialize()).not.to.throw();
        expect(initializable.initialized).to.be.true;
    });

    it('asserting for initialized should fail when not initialized', () => {
        const initializable = new Initializable();
        expect(() => initializable.publicAssertInitialized()).to.throw();
        initializable.initialize();
        expect(() => initializable.publicAssertInitialized()).not.to.throw();
    });

    it('asserting for initialized should fail after beeing uninitialized', () => {
        const initializable = new Initializable();
        initializable.initialize();
        initializable.uninitialize();
        expect(() => initializable.publicAssertInitialized()).to.throw();
        expect(() => initializable.publicAssertUninitialized()).not.to.throw();
    });


    it('asserting for uninitialized should fail when initialized', () => {
        const initializable = new Initializable();
        expect(() => initializable.publicAssertUninitialized()).not.to.throw();
        initializable.initialize();
        expect(() => initializable.publicAssertUninitialized()).to.throw();
    });

    it('should remain uninitialized when initialization fails', () => {
        const initializable = new Initializable();
        expect(() => initializable.publicAssertUninitialized()).not.to.throw();
        initializable.initialize(false);
        expect(initializable.initialized).to.be.false;
        expect(() => initializable.publicAssertInitialized()).to.throw();
        expect(() => initializable.publicAssertUninitialized()).not.to.throw();
    });

    it('should support assert (un)initialized by means of decorators', () => {
        const initializable = new Initializable();
        expect(() => initializable.expectUninitialized()).not.to.throw();
        expect(() => initializable.expectInitialized()).to.throw();
        initializable.initialize();
        expect(() => initializable.expectUninitialized()).to.throw();
        expect(() => initializable.expectInitialized()).not.to.throw();
    });

    it('should decorate per-instance', () => {
        const initializable1 = new Initializable();
        const initializable2 = new Initializable();
        expect(() => initializable1.expectUninitialized()).not.to.throw();
        expect(() => initializable2.expectUninitialized()).not.to.throw();
        expect(() => initializable1.expectInitialized()).to.throw();
        expect(() => initializable2.expectInitialized()).to.throw();
        initializable1.initialize();
        expect(() => initializable1.expectUninitialized()).to.throw();
        expect(() => initializable2.expectUninitialized()).not.to.throw();
        expect(() => initializable1.expectInitialized()).not.to.throw();
        expect(() => initializable2.expectInitialized()).to.throw();
    });

});
