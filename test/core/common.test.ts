
import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as sinon from 'sinon';

chai.use(spies);

const expect = chai.expect;
const spy = chai.spy;
const stub = sinon.stub;

import * as common from '../../source/core/common';


/* tslint:disable:no-unused-expression */

describe('common assert', () => {

    it('should not throw on true expression', () => {
        const message = 'never throw';
        expect(() => common.assert(true, message)).to.not.throw();
    });

    it('should throw on false expression', () => {
        const message = 'always throw';
        expect(() => common.assert(false, message)).to.throw();
    });
});


describe('common assert_range', () => {

    it('should not throw on true expression', () => {
        const message = 'never throw';
        expect(() => common.assert_range(true, message)).to.not.throw();
    });

    it('should throw on false expression', () => {
        const message = 'always throw';
        expect(() => common.assert_range(false, message)).to.throw();
    });
});


describe('common log_if', () => {

    it('should not log on false expression', () => {
        const consoleLogStub = stub(console, 'log');
        common.log_if(false, common.LogLevel.User, 'never log');
        expect(consoleLogStub.notCalled).to.be.true;
        consoleLogStub.restore();
    });

    it('should log on true expression', () => {
        const consoleLogStub = stub(console, 'log');
        common.log_if(true, common.LogLevel.User, 'always log');
        expect(consoleLogStub.calledOnce).to.be.true;

        consoleLogStub.restore();
    });

    it('should use the correct log level', () => {
        let output = '';
        const consoleLogStub = stub(console, 'log').callsFake((input) => output = input);

        common.log_if(true, common.LogLevel.User, 'log level 0');
        expect(output).to.string('[0]');

        common.log_if(true, common.LogLevel.Dev, 'log level 1');
        expect(output).to.string('[1]');

        common.log_if(true, common.LogLevel.ModuleDev, 'log level 2');
        expect(output).to.string('[2]');

        consoleLogStub.restore();
    });
});


describe('common rand', () => {

    it('should not exceed range within 1000 tests (fuzzy)', () => {
        for (let i = 0; i < 1000; ++i) {
            const value = common.rand(-i, +i);
            expect(value).to.be.at.least(-i);
            expect(value).to.be.at.most(+i);
        }
    });

    it('should return in range [0.0,1.0] by default (fuzzy)', () => {
        for (let i = 0; i < 1000; ++i) {
            const value = common.rand();
            expect(value).to.be.at.least(0.0);
            expect(value).to.be.at.most(1.0);
        }
    });

});


describe('common prettyPrintBytes', () => {

    it('should print bytes for bytes < 1024', () => {
        expect(common.prettyPrintBytes(0)).to.equal('0B');
        expect(common.prettyPrintBytes(1023)).to.equal('1023B');
    });

    it('should print kibi bytes for bytes between 1024, 1048575', () => {
        expect(common.prettyPrintBytes(1024)).to.equal('1.000KiB');
        expect(common.prettyPrintBytes(1048575)).to.equal('1023.999KiB');
    });

});


describe('common bitInBitfield', () => {

    it('should detect set/unset bits in bitfield', () => {
        expect(common.bitInBitfield(0, 0)).to.be.true;

        const bits = 1 << 1 | 1 << 4;

        expect(common.bitInBitfield(bits, 1 << 0)).to.be.false;
        expect(common.bitInBitfield(bits, 1 << 1)).to.be.true;
        expect(common.bitInBitfield(bits, 1 << 2)).to.be.false;
        expect(common.bitInBitfield(bits, 1 << 3)).to.be.false;
        expect(common.bitInBitfield(bits, 1 << 4)).to.be.true;
        expect(common.bitInBitfield(bits, 1 << 5)).to.be.false;
        expect(common.bitInBitfield(bits, 1 << 6)).to.be.false;
        expect(common.bitInBitfield(bits, 1 << 7)).to.be.false;

        expect(common.bitInBitfield(bits, bits)).to.be.true;
    });

    it('should return false for undefined flag', () => {
        expect(common.bitInBitfield(0, undefined)).to.be.false;
    });

});


describe('common RAD2DEG and DEG2RAD', () => {

    it('should be bijective', () => {
        expect(common.DEG2RAD * common.RAD2DEG).to.equal(1.0);
    });

    it('should convert degree to radian for sample set', () => {
        expect(common.DEG2RAD * 45.0).to.be.closeTo(Math.PI / 4, 8);
        expect(common.DEG2RAD * 90.0).to.be.closeTo(Math.PI / 2, 8);
        expect(common.DEG2RAD * 135.0).to.be.closeTo(3 * Math.PI / 4, 8);
        expect(common.DEG2RAD * 180.0).to.be.closeTo(Math.PI, 8);
        expect(common.DEG2RAD * 225.0).to.be.closeTo(5 * Math.PI / 4, 8);
        expect(common.DEG2RAD * 270.0).to.be.closeTo(3 * Math.PI / 2, 8);
        expect(common.DEG2RAD * 315.0).to.be.closeTo(7 * Math.PI / 4, 8);
        expect(common.DEG2RAD * 360.0).to.be.closeTo(2 * Math.PI, 8);
    });

    it('should convert radian to degree for sample set', () => {
        expect(common.RAD2DEG * Math.PI / 4).to.be.closeTo(45.0, 8);
        expect(common.RAD2DEG * Math.PI / 2).to.be.closeTo(90.0, 8);
        expect(common.RAD2DEG * 3 * Math.PI / 4).to.be.closeTo(135.0, 8);
        expect(common.RAD2DEG * Math.PI).to.be.closeTo(180.0, 8);
        expect(common.RAD2DEG * 5 * Math.PI / 4).to.be.closeTo(225.0, 8);
        expect(common.RAD2DEG * 3 * Math.PI / 2).to.be.closeTo(270.0, 8);
        expect(common.RAD2DEG * 7 * Math.PI / 4).to.be.closeTo(315.0, 8);
        expect(common.RAD2DEG * 2 * Math.PI).to.be.closeTo(360.0, 8);
    });

});


describe('common GETparameter', () => {

    it('should return value of present parameters', () => {
        global.window = { location: { search: '?test=true' } };
        expect(common.GETsearch()).to.equal('?test=true');
        expect(common.GETparameter('test')).to.equal('true');
    });

});
