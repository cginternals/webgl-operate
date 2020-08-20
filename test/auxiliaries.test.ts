
/* spellchecker: disable */

import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as sinon from 'sinon';

chai.use(spies);

const expect = chai.expect;
const stub = sinon.stub;

import * as aux from '../source/auxiliaries';

/* spellchecker: enable */


/* tslint:disable:no-unused-expression */

describe('auxiliaries assert', () => {

    it('should not throw on true expression', () => {
        const message = 'never throw';
        expect(() => aux.assert(true, message)).to.not.throw();
    });

    it('should throw on false expression', () => {
        const message = 'always throw';
        expect(() => aux.assert(false, message)).to.throw();
    });

    it('should be allowed to be disabled', () => {
        expect(aux.assertions()).to.be.true;
        aux.assertions(false);
        expect(aux.assertions()).to.be.false;
        expect(() => aux.assert(false, 'ignore')).to.not.throw();
        aux.assertions(true);
        expect(() => aux.assert(false, 'ignore')).to.throw();
    });

});


describe('auxiliaries log and logIf', () => {

    it('should not log on false expression', () => {
        const consoleLogStub = stub(console, 'log');
        aux.logIf(false, aux.LogLevel.Error, 'never log');
        expect(consoleLogStub.notCalled).to.be.true;
        consoleLogStub.restore();
    });

    it('should log on true expression', () => {
        const consoleLogStub = stub(console, 'log');
        aux.logIf(true, aux.LogLevel.Error, 'always log');
        expect(consoleLogStub.calledOnce).to.be.true;

        consoleLogStub.restore();
    });

    it('should use the correct log level', () => {
        const fake = sinon.fake();
        const consoleLogStub = stub(console, 'log').callsFake(fake);

        aux.log(aux.LogLevel.Error, 'log level 0');
        expect(fake.lastCall.args).to.deep.equal(['[0]', 'log level 0']);

        aux.log(aux.LogLevel.Warning, 'log level 1');
        expect(fake.lastCall.args).to.deep.equal(['[1]', 'log level 1']);

        aux.log(aux.LogLevel.Info, 'log level 2');
        expect(fake.lastCall.args).to.deep.equal(['[2]', 'log level 2']);

        aux.log(aux.LogLevel.Debug, 'log level 3');
        expect(fake.lastCall.args).to.deep.equal(['[3]', 'log level 3']);

        consoleLogStub.restore();
    });

    it('should respect verbosity level', () => {
        const fake = sinon.fake();
        const consoleLogStub = stub(console, 'log').callsFake(fake);

        aux.log(aux.LogLevel.Error, 'log level 0');
        expect(fake.lastCall.args).to.deep.equal(['[0]', 'log level 0']);

        aux.log(aux.LogLevel.Warning, 'log level 1');
        expect(fake.lastCall.args).to.deep.equal(['[1]', 'log level 1']);

        aux.log(aux.LogLevel.Info, 'log level 2');
        expect(fake.lastCall.args).to.deep.equal(['[2]', 'log level 2']);

        aux.log(aux.LogLevel.Debug, 'log level 3');
        expect(fake.lastCall.args).to.deep.equal(['[3]', 'log level 3']);

        aux.log(4, 'log level 4');
        expect(fake.lastCall.args).to.deep.equal(['[3]', 'log level 3']); // uses previous output (nothing changed)

        const thresholdRestore = aux.logVerbosity();
        aux.logVerbosity(4);
        aux.log(4, 'log level 4');
        expect(fake.lastCall.args).to.deep.equal(['[4]', 'log level 4']);

        aux.logVerbosity(-1);
        aux.log(0, 'log level 0');
        expect(fake.lastCall.args).to.deep.equal(['[4]', 'log level 4']);

        aux.logVerbosity(thresholdRestore);
        consoleLogStub.restore();
    });

    it('can be called with more parameters', () => {
        const fake = sinon.fake();
        const consoleLogStub = stub(console, 'log').callsFake(fake);

        aux.log(aux.LogLevel.Warning, 'log level 1', { error: 'broke', code: 42 });
        expect(fake.lastCall.args).to.deep.equal(['[1]', 'log level 1', { error: 'broke', code: 42 }]);

        consoleLogStub.restore();
    });
});


describe('auxiliaries rand', () => {

    it('should not exceed range within 1000 tests (fuzzy)', () => {
        for (let i = 0; i < 1000; ++i) {
            const value = aux.rand(-i, +i);
            expect(value).to.be.at.least(-i);
            expect(value).to.be.at.most(+i);
        }
    });

    it('should return in range [0.0,1.0] by default (fuzzy)', () => {
        for (let i = 0; i < 1000; ++i) {
            const value = aux.rand();
            expect(value).to.be.at.least(0.0);
            expect(value).to.be.at.most(1.0);
        }
    });

});


describe('auxiliaries prettyPrintBytes', () => {

    it('should print bytes for bytes < 1024', () => {
        expect(aux.prettyPrintBytes(0)).to.equal('0B');
        expect(aux.prettyPrintBytes(1023)).to.equal('1023B');
    });

    it('should print kibi bytes for bytes between 1024, 1048575', () => {
        expect(aux.prettyPrintBytes(1024)).to.equal('1.000KiB');
        expect(aux.prettyPrintBytes(1048575)).to.equal('1023.999KiB');
    });

});


describe('auxiliaries prettyPrintMilliseconds', () => {

    it('should convert and use correct suffixes', () => {
        expect(aux.prettyPrintMilliseconds(0.00)).to.equal('0.000ms');
        expect(aux.prettyPrintMilliseconds(1e+0)).to.equal('1.000ms');

        expect(aux.prettyPrintMilliseconds(1e+1)).to.equal('10.000ms');
        expect(aux.prettyPrintMilliseconds(1e+2)).to.equal('0.100s');
        expect(aux.prettyPrintMilliseconds(1e+3)).to.equal('1.000s');
        expect(aux.prettyPrintMilliseconds(1e+4)).to.equal('10.000s');
        expect(aux.prettyPrintMilliseconds(1e+5)).to.equal('100.000s');

        expect(aux.prettyPrintMilliseconds(1e-1)).to.equal('0.100ms');
        expect(aux.prettyPrintMilliseconds(1e-2)).to.equal('10.000μs');
        expect(aux.prettyPrintMilliseconds(1e-3)).to.equal('1.000μs');
        expect(aux.prettyPrintMilliseconds(1e-4)).to.equal('0.100μs');
        expect(aux.prettyPrintMilliseconds(1e-5)).to.equal('10.000ns');
        expect(aux.prettyPrintMilliseconds(1e-6)).to.equal('1.000ns');
        expect(aux.prettyPrintMilliseconds(1e-7)).to.equal('0.100ns');
        expect(aux.prettyPrintMilliseconds(1e-8)).to.equal('0.010ns');
        expect(aux.prettyPrintMilliseconds(1e-9)).to.equal('0.001ns');
    });

});


describe('auxiliaries bitInBitfield', () => {

    it('should detect set/unset bits in bitfield', () => {
        expect(aux.bitInBitfield(0, 0)).to.be.true;

        const bits = 1 << 1 | 1 << 4;

        expect(aux.bitInBitfield(bits, 1 << 0)).to.be.false;
        expect(aux.bitInBitfield(bits, 1 << 1)).to.be.true;
        expect(aux.bitInBitfield(bits, 1 << 2)).to.be.false;
        expect(aux.bitInBitfield(bits, 1 << 3)).to.be.false;
        expect(aux.bitInBitfield(bits, 1 << 4)).to.be.true;
        expect(aux.bitInBitfield(bits, 1 << 5)).to.be.false;
        expect(aux.bitInBitfield(bits, 1 << 6)).to.be.false;
        expect(aux.bitInBitfield(bits, 1 << 7)).to.be.false;

        expect(aux.bitInBitfield(bits, bits)).to.be.true;
    });

    it('should return false for undefined flag', () => {
        expect(aux.bitInBitfield(0, undefined)).to.be.false;
    });

});


describe('auxiliaries RAD2DEG and DEG2RAD', () => {

    it('should be bijective', () => {
        expect(aux.DEG2RAD * aux.RAD2DEG).to.equal(1.0);
    });

    it('should convert degree to radian for sample set', () => {
        expect(aux.DEG2RAD * 45.0).to.be.closeTo(Math.PI / 4, 1e-8);
        expect(aux.DEG2RAD * 90.0).to.be.closeTo(Math.PI / 2, 1e-8);
        expect(aux.DEG2RAD * 135.0).to.be.closeTo(3 * Math.PI / 4, 1e-8);
        expect(aux.DEG2RAD * 180.0).to.be.closeTo(Math.PI, 1e-8);
        expect(aux.DEG2RAD * 225.0).to.be.closeTo(5 * Math.PI / 4, 1e-8);
        expect(aux.DEG2RAD * 270.0).to.be.closeTo(3 * Math.PI / 2, 1e-8);
        expect(aux.DEG2RAD * 315.0).to.be.closeTo(7 * Math.PI / 4, 1e-8);
        expect(aux.DEG2RAD * 360.0).to.be.closeTo(2 * Math.PI, 1e-8);
    });

    it('should convert radian to degree for sample set', () => {
        expect(aux.RAD2DEG * Math.PI / 4).to.be.closeTo(45.0, 1e-8);
        expect(aux.RAD2DEG * Math.PI / 2).to.be.closeTo(90.0, 1e-8);
        expect(aux.RAD2DEG * 3 * Math.PI / 4).to.be.closeTo(135.0, 1e-8);
        expect(aux.RAD2DEG * Math.PI).to.be.closeTo(180.0, 1e-8);
        expect(aux.RAD2DEG * 5 * Math.PI / 4).to.be.closeTo(225.0, 1e-8);
        expect(aux.RAD2DEG * 3 * Math.PI / 2).to.be.closeTo(270.0, 1e-8);
        expect(aux.RAD2DEG * 7 * Math.PI / 4).to.be.closeTo(315.0, 1e-8);
        expect(aux.RAD2DEG * 2 * Math.PI).to.be.closeTo(360.0, 1e-8);
    });

});


describe('auxiliaries GETparameter', () => {

    // it('should return value of present parameters', () => {
    //     global.window = { location: { search: '?test=true' } };
    //     expect(aux.GETsearch()).to.equal('?test=true');
    //     expect(aux.GETparameter('test')).to.equal('true');
    // });

});


describe('auxiliaries path', () => {

    it('should return the directory name of a file path', () => {
        expect(aux.dirname('https://localhost/file.ext')).to.equal('https://localhost');
        expect(aux.dirname('file.ext')).to.equal('');

        expect(aux.dirname('localhost/file')).to.equal('localhost');
        expect(aux.dirname('localhost/dir/')).to.equal('localhost/dir');
    });

    it('should return the base name of a file path', () => {
        expect(aux.basename('https://localhost/file.ext')).to.equal('file.ext');
        expect(aux.basename('file.ext')).to.equal('file.ext');

        expect(aux.basename('localhost/file')).to.equal('file');
        expect(aux.basename('localhost/dir/')).to.equal('');
    });

});


describe('auxiliaries power-of-two', () => {

    it('should return detect if number is power of two', () => {

        expect(aux.isPowerOfTwo(0)).to.be.false;
        for (let i = 0; i < 31; ++i) {
            expect(aux.isPowerOfTwo(1 << i)).to.be.true;
        }

        expect(aux.isPowerOfTwo(3)).to.be.false;
        expect(aux.isPowerOfTwo(5)).to.be.false;
        expect(aux.isPowerOfTwo(7)).to.be.false;
        expect(aux.isPowerOfTwo(15)).to.be.false;

        expect(aux.isPowerOfTwo(1 << 31)).to.be.false;
        expect(aux.isPowerOfTwo((1 << 30) - 1)).to.be.false;

        expect(aux.isPowerOfTwo(-1)).to.be.false;
        expect(aux.isPowerOfTwo(-2)).to.be.false;
        expect(aux.isPowerOfTwo(-3)).to.be.false;
    });

    it('should return upper power of two for a given number', () => {

        expect(aux.upperPowerOfTwo(-2)).to.equal(0);
        expect(aux.upperPowerOfTwo(-1)).to.equal(0);

        expect(aux.upperPowerOfTwo(0)).to.equal(0);
        expect(aux.upperPowerOfTwo(1)).to.equal(1);
        expect(aux.upperPowerOfTwo(2)).to.equal(2);
        expect(aux.upperPowerOfTwo(3)).to.equal(4);
        expect(aux.upperPowerOfTwo(4)).to.equal(4);
        expect(aux.upperPowerOfTwo(5)).to.equal(8);

        expect(aux.upperPowerOfTwo(192)).to.equal(256);
        expect(aux.upperPowerOfTwo(768)).to.equal(1024);

        expect(aux.upperPowerOfTwo(768)).to.equal(1024);
        expect(aux.upperPowerOfTwo(708405415)).to.equal(1 << 30);
    });

});

