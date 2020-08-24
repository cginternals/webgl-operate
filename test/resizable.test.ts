
/* spellchecker: disable */

const chai = require('chai'), spies = require('chai-spies'), sinon = require('sinon');
chai.use(spies);

const expect = chai.expect;
const stub = sinon.stub;

import { Resizable as AbstractResizable } from '../source/resizable';

/* spellchecker: enable */


/* tslint:disable:no-unused-expression */

class Resizable extends AbstractResizable {

    static resize(): void {
        AbstractResizable.resize();
    }

    onResize(): void { }

    dispose(): void {
        super.dispose();
    }

}


describe('Resizable', () => {

    /** @todo test multiple instances, probably ignore elementSize  */

    (global as any).document = undefined;

    it('instance should receive onResize', () => {
        const consoleLogStub = stub(console, 'log');

        const resizable = new Resizable();
        const onResizeStub = stub(resizable, 'onResize');
        Resizable.resize();
        expect(onResizeStub.calledOnce).to.be.true;
        onResizeStub.restore();

        consoleLogStub.restore();
    });

    it('instance should not receive onResize after destroyed', () => {
        const consoleLogStub = stub(console, 'log');

        const resizable = new Resizable();
        const onResizeStub = stub(resizable, 'onResize');
        resizable.dispose();
        Resizable.resize();
        expect(onResizeStub.notCalled).to.be.true;
        onResizeStub.restore();

        consoleLogStub.restore();
    });

});
