
import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as sinon from 'sinon';

chai.use(spies);

const expect = chai.expect;
const spy = chai.spy;
const stub = sinon.stub;

import { Resizable as AbstractResizable } from '../../source/core/resizable';


/* tslint:disable:no-unused-expression */

class Resizable extends AbstractResizable {

    static resize(): void {
        AbstractResizable.resize();
    }

    protected onResize(): void { }

    dispose(): void {
        super.dispose();
    }

}


describe('Resizable', () => {

    /** @todo test multiple instances, probably ignore elementSize  */

    global.document = undefined;

    it('instance should receive onResize', () => {
        const resizable = new Resizable();
        const onResizeStub = stub(resizable, 'onResize');
        Resizable.resize();
        expect(onResizeStub.calledOnce).to.be.true;
        onResizeStub.restore();
    });

    it('instance should not receive onResize after destroyed', () => {
        const resizable = new Resizable();
        const onResizeStub = stub(resizable, 'onResize');
        resizable.dispose();
        Resizable.resize();
        expect(onResizeStub.notCalled).to.be.true;
        onResizeStub.restore();
    });

});
