
import * as chai from 'chai';
import * as sinon from 'sinon';

const expect = chai.expect;
const stub = sinon.stub;


import { Controllable, Controller } from '../source/controller';


/* tslint:disable:max-classes-per-file no-unused-expression */

class ControllerMock extends Controller {

    static nextAnimationFrame = 1;

    request(type?: Controller.RequestType): void {
        super.request(type);
    }

    cancel(): void {
        super.cancel();
    }

    get pendingRequest(): number {
        return this._pendingRequest;
    }

    get blockedUpdates(): number {
        return this._blockedUpdates;
    }

    invokeFrame(): void {
        super.invokeFrame();
    }
}

class RendererMock implements Controllable {

    update = (multiFrameNumber: number): boolean => true;
    prepare = (): void => undefined;
    frame = (frameNumber: number): void => undefined;
    swap = (): void => undefined;
}

class InvalidatingRendererMock implements Controllable {

    public controller: Controller | undefined = undefined;

    update = (multiFrameNumber: number): boolean => true;
    prepare = (): void => undefined;
    frame = (frameNumber: number): void => undefined;
    swap = (): void => {
        if (this.controller !== undefined) {
            this.controller.update();
        }
    }
}


describe('Controller', () => {

    const renderer = new RendererMock();


    it('should be constructable', () => {
        expect(new Controller()).to.not.throw;
    });

    it('should not be paused nor blocked after initialization', () => {
        const controller = new ControllerMock();

        expect(controller.paused).to.be.false;
        expect(controller.blocked).to.be.false;

        expect(controller.frameNumber).to.equal(0);
        expect(controller.multiFrameNumber).to.equal(1);
    });

    it('should block explicit updates when blocked', () => {
        const controller = new ControllerMock();

        const cancelStub = stub(controller, 'cancel');
        const requestStub = stub(controller, 'request');

        controller.block();
        controller.update();

        expect(cancelStub.called).to.be.false;
        expect(requestStub.called).to.be.false;
    });

    it('should block implicit updates on re-configuration', () => {
        const controller = new ControllerMock();
        controller.block();

        const cancelStub = stub(controller, 'cancel');
        const requestStub = stub(controller, 'request');

        controller.controllable = renderer;

        expect(cancelStub.called).to.be.false;
        expect(requestStub.called).to.be.false;
    });

    it('should render on unblock after initialization', () => {
        const controller = new ControllerMock();
        controller.block();

        const cancelStub = stub(controller, 'cancel');
        const requestStub = stub(controller, 'request');

        controller.controllable = renderer;

        controller.unblock();
        expect(cancelStub.called).to.be.true;
        expect(requestStub.calledOnce).to.be.true;
    });

    it('should not render when not initialized', () => {
        const controller = new ControllerMock();

        expect(() => { controller.update(); }).to.throw;
        expect(() => { controller.cancel(); }).to.throw;
        expect(() => { controller.request(); }).to.throw;
    });

    it('should return multi-frame number as set', () => {
        const controller = new ControllerMock();
        controller.block();

        controller.multiFrameNumber = 13;
        expect(controller.multiFrameNumber).to.equal(13);
    });

    it('should return debug-frame number as set', () => {
        const controller = new ControllerMock();
        controller.block();

        controller.multiFrameNumber = 13;
        controller.debugFrameNumber = 7;
        expect(controller.debugFrameNumber).to.equal(7);
    });

    it('should clamp debug-frame number to [0,multi-frame number]', () => {
        const controller = new ControllerMock();
        controller.block();

        const consoleLogStub = stub(console, 'log');
        controller.multiFrameNumber = 7;
        controller.debugFrameNumber = 13;
        expect(controller.debugFrameNumber).to.equal(7);
        consoleLogStub.restore();
    });

    it('should restart render when multi-frame number is changed', () => {
        const controller = new ControllerMock();

        (global as any).window = {
            requestAnimationFrame: () => ++ControllerMock.nextAnimationFrame,
            cancelAnimationFrame: () => undefined,
        };

        controller.block();
        controller.controllable = renderer;
        controller.unblock();
        controller.cancel();

        const requestStub = stub(controller, 'request');
        expect(requestStub.called).to.be.false;

        expect(controller.multiFrameNumber).to.equal(1);
        controller.multiFrameNumber = 2;

        expect(requestStub.calledOnce).to.be.true;
    });

    it('should request next animation frame only once a frame (simple renderer)', () => {
        const controller = new ControllerMock();

        (global as any).window = {
            requestAnimationFrame: () => ++ControllerMock.nextAnimationFrame,
            cancelAnimationFrame: () => undefined,
        };

        const rafStub = stub((global as any).window, 'requestAnimationFrame');
        expect(rafStub.called).to.be.false;

        controller.block();
        controller.controllable = renderer;
        controller.unblock();

        expect(rafStub.calledOnce).to.be.true;
    });

    it('should request next animation frame only once a frame (self-invalidating renderer)', () => {
        const controller = new ControllerMock();
        const renderer = new InvalidatingRendererMock();

        (global as any).window = {
            requestAnimationFrame: () => ++ControllerMock.nextAnimationFrame,
            cancelAnimationFrame: () => undefined,
        };

        (global as any).performance = { now: (): number => 0 };

        controller.block();
        renderer.controller = controller;
        controller.controllable = renderer;
        controller.unblock();

        const rafStub = stub((global as any).window, 'requestAnimationFrame');

        expect(rafStub.called).to.be.false;
        expect(controller.blockedUpdates).to.equal(0);

        controller.cancel();

        expect(controller.pendingRequest).to.equal(0);

        controller.update();

        expect(rafStub.calledOnce).to.be.true;
        expect(controller.blockedUpdates).to.equal(0);
        expect(controller.pendingRequest).to.not.equal(0);

        rafStub.reset();

        controller.invokeFrame();

        expect(rafStub.calledOnce).to.be.true;
    });

});
