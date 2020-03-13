/* spellchecker: disable */


import * as chai from 'chai';
import * as spies from 'chai-spies';

chai.use(spies);

//const expect = chai.expect;

/* tslint:disable:no-unused-expression */


//const originalRepeat = String.prototype.repeat;
/*const originalStartsWith = String.prototype.startsWith;
const originalEndsWith = String.prototype.endsWith;
const originalIncludes = String.prototype.includes;
const originalTrimLeft = String.prototype.trimLeft;
const originalTrimright = String.prototype.trimRight;
const originalArrayForEach = Array.prototype.forEach;
const originalArrayFill = Array.prototype.fill;
const originalLog10 = Math.log10;*/

export namespace test {
    require('../source/polyfill');
    describe('polyfill functions should work as intended', () => {

        it('polyfill functions should work as intended', () => {
            //const testString = "test";
            //expect(originalRepeat).to.not.eq(String.prototype.repeat);
        });
    });
}
