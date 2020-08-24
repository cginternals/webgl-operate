
/* spellchecker: disable */

const chai = require('chai'), sinon = require('sinon');


const expect = chai.expect;
const stub = sinon.stub;

import { Controllable, Controller } from '../source/controller';

/* spellchecker: enable */


class ControllerMock extends Controller {

    static nextAnimationFrame = 1;

    request(type: Controller.RequestType = Controller.RequestType.Frame): void {
        super.request();
    }

    invoke(type: Controller.RequestType): void {
        super.invoke(type);
    }

    get animationFrameID(): number {
        return this._animationFrameID;
    }

    set animationFrameID(animationFrameID: number) {
        this._animationFrameID = animationFrameID;
    }

    get blockedUpdates(): number {
        return this._blockedUpdates;
    }

    invokeFrameAndSwap(): void {
        super.invokeFrameAndSwap();
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

    it('should not be blocked after initialization', () => {
        const controller = new ControllerMock();

        expect(controller.blocked).to.be.false;

        expect(controller.frameNumber).to.equal(0);
        expect(controller.multiFrameNumber).to.equal(1);
    });

    it('should block explicit updates when blocked', () => {
        const controller = new ControllerMock();

        const invokeStub = stub(controller, 'invoke');

        controller.block();
        controller.update();

        expect(invokeStub.called).to.be.false;
    });

    it('should block implicit updates on re-configuration', () => {
        const controller = new ControllerMock();
        controller.block();

        const invokeStub = stub(controller, 'invoke');

        controller.controllable = renderer;

        expect(invokeStub.called).to.be.false;
    });

    it('should render on unblock after initialization', () => {
        const controller = new ControllerMock();

        (global as any).window = {
            requestAnimationFrame: () => {
                controller.invoke(Controller.RequestType.Frame);
                return ++ControllerMock.nextAnimationFrame;
            },
            cancelAnimationFrame: () => undefined,
        };

        controller.block();

        const invokeStub = stub(controller, 'invoke');

        controller.controllable = renderer;

        controller.unblock();
        expect(invokeStub.calledOnce).to.be.true;
    });

    it('should render on unblock after already rendering before', () => {
        const controller = new ControllerMock();

        (global as any).window = {
            requestAnimationFrame: () => {
                controller.invoke(Controller.RequestType.Frame);
                return ++ControllerMock.nextAnimationFrame;
            },
            cancelAnimationFrame: () => undefined,
        };
        const invokeStub = stub(controller, 'invoke');

        controller.request();
        expect(invokeStub.calledOnce).to.be.true;

        invokeStub.reset();

        controller.block();
        controller.request();
        expect(invokeStub.calledOnce).to.be.false;

        controller.unblock();
        expect(invokeStub.calledOnce).to.be.true;
    });

    it('should not render when not initialized', () => {
        const controller = new ControllerMock();

        expect(() => { controller.update(); }).to.throw;
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
            requestAnimationFrame: () => {
                controller.invoke(Controller.RequestType.Frame);
                return ++ControllerMock.nextAnimationFrame;
            },
            cancelAnimationFrame: () => undefined,
        };

        const requestStub = stub(controller, 'request');

        controller.block();
        controller.controllable = renderer;
        controller.unblock();

        requestStub.restore();

        const invokeStub = stub(controller, 'invoke');

        expect(controller.multiFrameNumber).to.equal(1);
        controller.multiFrameNumber = 2;

        expect(invokeStub.calledOnce).to.be.true;
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

        controller.animationFrameID = 0;
        rafStub.reset();

        controller.update();

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

        const rafStub = stub((global as any).window, 'requestAnimationFrame');
        expect(rafStub.called).to.be.false;

        controller.block();
        renderer.controller = controller;
        controller.controllable = renderer;
        controller.unblock();

        expect(controller.blockedUpdates).to.equal(0);
        expect(rafStub.calledOnce).to.be.true;

        controller.animationFrameID = 0;
        rafStub.reset();

        controller.update();

        expect(rafStub.calledOnce).to.be.true;
    });

});
