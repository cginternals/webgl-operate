
import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as sinon from 'sinon';

chai.use(spies);

const expect = chai.expect;
const spy = chai.spy;
const stub = sinon.stub;


import { assert } from '../source/core/common';

/* tslint:disable:no-unused-expression */


describe('common assert', () => {

    it('should not throw on true expression', () => {
        const message = 'never throw';
        expect(() => assert(true, message)).to.not.throw();
    });

    it('should throw on false expression', () => {
        const message = 'always throw';
        expect(() => assert(false, message)).to.throw();
    });
});


import { assert_range } from '../source/core/common';

describe('common assert_range', () => {

    it('should not throw on true expression', () => {
        const message = 'never throw';
        expect(() => assert_range(true, message)).to.not.throw();
    });

    it('should throw on false expression', () => {
        const message = 'always throw';
        expect(() => assert_range(false, message)).to.throw();
    });
});


import { log_if, LogLevel } from '../source/core/common';

describe('common log_if', () => {

    it('should not log on false expression', () => {
        const consoleLogStub = stub(console, 'log');
        const consoleLogSpy = spy.on(console, 'log');

        log_if(false, LogLevel.User, 'never log');
        expect(consoleLogSpy).to.not.have.been.called();

        consoleLogStub.restore();
    });

    it('should log on true expression', () => {
        const consoleLogStub = stub(console, 'log');
        const consoleLogSpy = spy.on(console, 'log');

        log_if(true, LogLevel.User, 'always log');
        expect(consoleLogSpy).to.have.been.called();

        consoleLogStub.restore();
    });

    it('should use the correct log level', () => {
        let output = '';
        const consoleLogStub = stub(console, 'log').callsFake((input) => output = input);

        log_if(true, LogLevel.User, 'log level 0');
        expect(output).to.string('[0]');

        log_if(true, LogLevel.Dev, 'log level 1');
        expect(output).to.string('[1]');

        log_if(true, LogLevel.ModuleDev, 'log level 2');
        expect(output).to.string('[2]');

        consoleLogStub.restore();
    });
});


import { rand } from '../source/core/common';

describe('common rand', () => {

    it('should not exceed range within 1000 tests (fuzzy)', () => {
        for (let i = 0; i < 1000; ++i) {
            const value = rand(-i, +i);
            expect(value).to.be.at.least(-i);
            expect(value).to.be.at.most(+i);
        }
    });

});


import { prettyPrintBytes } from '../source/core/common';

describe('common prettyPrintBytes', () => {

    it('should print bytes for bytes < 1024', () => {
        expect(prettyPrintBytes(0)).to.equal('0B');
        expect(prettyPrintBytes(1023)).to.equal('1023B');
    });

    it('should print kibi bytes for bytes between 1024, 1048575', () => {
        expect(prettyPrintBytes(1024)).to.equal('1.000KiB');
        expect(prettyPrintBytes(1048575)).to.equal('1023.999KiB');
    });

});


import { bitInBitfield } from '../source/core/common';

describe('common bitInBitfield', () => {

    it('should detect set/unset bits in bitfield', () => {
        expect(bitInBitfield(0, 0)).to.be.true;

        const bits = 1 << 1 | 1 << 4;

        expect(bitInBitfield(bits, 1 << 0)).to.be.false;
        expect(bitInBitfield(bits, 1 << 1)).to.be.true;
        expect(bitInBitfield(bits, 1 << 2)).to.be.false;
        expect(bitInBitfield(bits, 1 << 3)).to.be.false;
        expect(bitInBitfield(bits, 1 << 4)).to.be.true;
        expect(bitInBitfield(bits, 1 << 5)).to.be.false;
        expect(bitInBitfield(bits, 1 << 6)).to.be.false;
        expect(bitInBitfield(bits, 1 << 7)).to.be.false;

        expect(bitInBitfield(bits, bits)).to.be.true;
    });

});


import { DEG2RAD, RAD2DEG } from '../source/core/common';

describe('common RAD2DEG and DEG2RAD', () => {

    it('should be bijective', () => {
        expect(DEG2RAD * RAD2DEG).to.equal(1.0);
    });

    it('should convert degree to radian for sample set', () => {
        expect(DEG2RAD * 45.0).to.be.closeTo(Math.PI / 4, 8);
        expect(DEG2RAD * 90.0).to.be.closeTo(Math.PI / 2, 8);
        expect(DEG2RAD * 135.0).to.be.closeTo(3 * Math.PI / 4, 8);
        expect(DEG2RAD * 180.0).to.be.closeTo(Math.PI, 8);
        expect(DEG2RAD * 225.0).to.be.closeTo(5 * Math.PI / 4, 8);
        expect(DEG2RAD * 270.0).to.be.closeTo(3 * Math.PI / 2, 8);
        expect(DEG2RAD * 315.0).to.be.closeTo(7 * Math.PI / 4, 8);
        expect(DEG2RAD * 360.0).to.be.closeTo(2 * Math.PI, 8);
    });

    it('should convert radian to degree for sample set', () => {
        expect(RAD2DEG * Math.PI / 4).to.be.closeTo(45.0, 8);
        expect(RAD2DEG * Math.PI / 2).to.be.closeTo(90.0, 8);
        expect(RAD2DEG * 3 * Math.PI / 4).to.be.closeTo(135.0, 8);
        expect(RAD2DEG * Math.PI).to.be.closeTo(180.0, 8);
        expect(RAD2DEG * 5 * Math.PI / 4).to.be.closeTo(225.0, 8);
        expect(RAD2DEG * 3 * Math.PI / 2).to.be.closeTo(270.0, 8);
        expect(RAD2DEG * 7 * Math.PI / 4).to.be.closeTo(315.0, 8);
        expect(RAD2DEG * 2 * Math.PI).to.be.closeTo(360.0, 8);
    });

});

describe('common GETparameter', () => {

    it('should return value of present parameters', () => {
        /** @todo */
    });

    it('should return undefined if parameter is not present', () => {
        /** @todo */
    });

});
