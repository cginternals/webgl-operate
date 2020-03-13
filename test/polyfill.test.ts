/* spellchecker: disable */


import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as sinon from 'sinon';

chai.use(spies);

const expect = chai.expect;
const stub = sinon.stub;

/* tslint:disable:no-unused-expression */

const testString = 'test';

const originalRepeat = String.prototype.repeat;
const originalStartsWith = String.prototype.startsWith;
const originalTrimLeft = String.prototype.trimLeft;
const originalTrimRight = String.prototype.trimRight;
const originalLog10 = Math.log10;

class MyString extends String {

};

delete String.prototype.repeat;
delete String.prototype.startsWith;
delete String.prototype.trimLeft;
delete String.prototype.trimRight;
delete Math.log10;

MyString.prototype.repeat = originalRepeat;
MyString.prototype.toString = () => { return testString };

export namespace test {
    require('../source/polyfill');
    describe('polyfill functions should work as intended', () => {
        const stringWithOriginalMethod = new MyString('test');

        let consoleLogStub: sinon.SinonStub;

        before(() => {
            consoleLogStub = stub(console, 'log');
        });

        after(() => {
            consoleLogStub.restore();
        });

        it('repeat function should work as intended', () => {
            expect(originalRepeat).to.not.eq(String.prototype.repeat);
            expect(MyString.prototype.repeat).to.not.eq(String.prototype.repeat);
            stringWithOriginalMethod.repeat(2);

            expect((testString.repeat(2))).to.eql(stringWithOriginalMethod.repeat(2));
            expect(() => { testString.repeat(-1) }).to.throws();
            expect(() => { testString.repeat(Infinity) }).to.throws();
            expect(() => { testString.repeat(1 << 28) }).to.throws();
            expect(''.repeat(3)).to.eql('');
        });

        it('startsWith function should work as intended', () => {
            expect(originalStartsWith).to.not.eq(String.prototype.startsWith);
            expect(testString.startsWith(testString)).to.be.true;
            expect(testString.startsWith('')).to.be.true;
            expect(testString.startsWith('te')).to.be.true;

            expect(testString.startsWith('wrong')).to.be.false;
            expect(testString.startsWith('est')).to.be.false;
        });

        it('trimLeft function should work as intended', () => {
            expect(originalTrimLeft).to.not.eq(String.prototype.trimLeft);

            const trimmable = ' test';
            const notTrimmable = 'test';

            expect(trimmable.trimLeft()).to.eql(notTrimmable);
            expect(notTrimmable.trimLeft()).to.eql(notTrimmable);
        });

        it('trimRight function should work as intended', () => {
            expect(originalTrimRight).to.not.eq(String.prototype.trimRight);

            const trimmable = 'test ';
            const notTrimmable = 'test';

            expect(trimmable.trimRight()).to.eql(notTrimmable);
            expect(notTrimmable.trimRight()).to.eql(notTrimmable);
        });

        it('log10 repeat function should work as intended', () => {
            expect(originalLog10).to.not.eq(Math.log10);

            expect(originalLog10(100)).to.eq(Math.log10(100));
            expect(originalLog10(10)).to.eq(Math.log10(10));
            expect(originalLog10(5)).to.closeTo(Math.log10(5) - 0.00000001, Math.log10(5) + 0.00000001);
        });
    });
}
