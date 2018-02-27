
import * as chai from 'chai';
import * as sinon from 'sinon';

const expect = chai.expect;
const stub = sinon.stub;


import { Controllable, Controller } from '../source/controller';


/* tslint:disable:max-classes-per-file no-unused-expression */

class ControllerMock extends Controller {

    request(update: boolean = false) {
        super.request(update);
    }

    cancel(): void {
        super.cancel();
    }
}

class RendererMock implements Controllable {

    update = (multiFrameNumber: number): void => undefined;
    frame = (frameNumber: number): void => undefined;
    swap = (): void => undefined;
}


describe('Controller', () => {

    const renderer = new RendererMock();


    it('should be constructable', () => {
        expect(() => { new Controller(); }).to.not.throw;
    });

    it('should not be paused nor blocked after initialization', () => {
        const controller = new ControllerMock();

        const requestStub = stub(controller, 'request');

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

        global.window = {
            requestAnimationFrame: () => undefined,
            cancelAnimationFrame: () => undefined,
        };

        controller.block();
        controller.controllable = renderer;
        controller.unblock();

        const requestStub = stub(controller, 'request');
        expect(requestStub.called).to.be.false;

        expect(controller.multiFrameNumber).to.equal(1);
        controller.multiFrameNumber = 2;

        expect(requestStub.calledOnce).to.be.true;
    });

});
