
/* spellchecker: disable */

const chai = require('chai'), sinon = require('sinon');

const expect = chai.expect;
const stub = sinon.stub;

import {
    clampf, clampf2, clampf3, clampf4,
    duplicate2, duplicate3, duplicate4,
    equals2, equals3, equals4,
    GLfloat2, GLfloat3, GLfloat4,
} from '../source/tuples';

/* spellchecker: enable */


/* tslint:disable:no-unused-expression */

describe('tuples clamp', () => {

    it('should clamp a float value to [0.0, 1.0] range', () => {
        const tests = [[+3, +1], [+1, +1], [-1, 0], [0, 0], [0.5, 0.5]];
        const consoleLogStub = stub(console, 'log');
        tests.forEach((test) => expect(clampf(test[0])).to.equal(test[1]));
        consoleLogStub.restore();
    });

    it('should clamp each component of a float 2-tuple to [0.0, 1.0] range', () => {
        const tests: Array<[GLfloat2, GLfloat2]> = [[[2, 2], [1, 1]], [[-1, -1], [0, 0]]
            , [[0, 0], [0, 0]], [[0.5, 0.5], [0.5, 0.5]]
            , [[2, 0], [1, 0]], [[0, 2], [0, 1]], [[-2, 0], [0, 0]], [[0, -2], [0, 0]]];
        const consoleLogStub = stub(console, 'log');
        tests.forEach((test) => expect(clampf2(test[0])).to.deep.equal(test[1]));
        consoleLogStub.restore();
    });

    it('should clamp each component of a float 3-tuple to [0.0, 1.0] range', () => {
        const tests: Array<[GLfloat3, GLfloat3]> = [[[2, 2, 2], [1, 1, 1]], [[-1, -1, -1], [0, 0, 0]]
            , [[0, 0, 0], [0, 0, 0]], [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5]]
            , [[+2, 0, 0], [1, 0, 0]], [[0, +2, 0], [0, 1, 0]], [[0, 0, +2], [0, 0, 1]]
            , [[-2, 0, 0], [0, 0, 0]], [[0, -2, 0], [0, 0, 0]], [[0, 0, -2], [0, 0, 0]]];
        const consoleLogStub = stub(console, 'log');
        tests.forEach((test) => expect(clampf3(test[0])).to.deep.equal(test[1]));
        consoleLogStub.restore();
    });

    it('should clamp each component of a float 4-tuple to [0.0, 1.0] range', () => {
        const tests: Array<[GLfloat4, GLfloat4]> = [[[2, 2, 2, 2], [1, 1, 1, 1]], [[-1, -1, -1, -1], [0, 0, 0, 0]]
            , [[0, 0, 0, 0], [0, 0, 0, 0]], [[0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]
            , [[+2, 0, 0, 0], [1, 0, 0, 0]], [[0, +2, 0, 0], [0, 1, 0, 0]]
            , [[0, 0, +2, 0], [0, 0, 1, 0]], [[0, 0, 0, +2], [0, 0, 0, 1]]
            , [[-2, 0, 0, 0], [0, 0, 0, 0]], [[0, -2, 0, 0], [0, 0, 0, 0]]
            , [[0, 0, -2, 0], [0, 0, 0, 0]], [[0, 0, 0, -2], [0, 0, 0, 0]]];
        const consoleLogStub = stub(console, 'log');
        tests.forEach((test) => expect(clampf4(test[0])).to.deep.equal(test[1]));
        consoleLogStub.restore();
    });

});


describe('tuples', () => {

    it('should duplicate 2-tuples', () => {
        const tuple0: GLfloat2 = [3.0, 2.0];
        const tuple1 = duplicate2<GLfloat>(tuple0);

        expect(tuple1[0]).to.be.equal(3.0);
        expect(tuple1[1]).to.be.equal(2.0);

        tuple1[0] = 0.0;
        tuple1[1] = 1.0;

        expect(tuple0[0]).to.be.equal(3.0);
        expect(tuple0[1]).to.be.equal(2.0);
    });

    it('should duplicate 3-tuples', () => {
        const tuple0: GLfloat3 = [5.0, 4.0, 3.0];
        const tuple1 = duplicate3<GLfloat>(tuple0);

        expect(tuple1[0]).to.be.equal(5.0);
        expect(tuple1[1]).to.be.equal(4.0);
        expect(tuple1[2]).to.be.equal(3.0);

        tuple1[0] = 0.0;
        tuple1[1] = 1.0;
        tuple1[2] = 2.0;

        expect(tuple0[0]).to.be.equal(5.0);
        expect(tuple0[1]).to.be.equal(4.0);
        expect(tuple0[2]).to.be.equal(3.0);
    });

    it('should duplicate 4-tuples', () => {
        const tuple0: GLfloat4 = [7.0, 6.0, 5.0, 4.0];
        const tuple1 = duplicate4<GLfloat>(tuple0);

        expect(tuple1[0]).to.be.equal(7.0);
        expect(tuple1[1]).to.be.equal(6.0);
        expect(tuple1[2]).to.be.equal(5.0);
        expect(tuple1[3]).to.be.equal(4.0);

        tuple1[0] = 0.0;
        tuple1[1] = 1.0;
        tuple1[2] = 2.0;
        tuple1[3] = 3.0;

        expect(tuple0[0]).to.be.equal(7.0);
        expect(tuple0[1]).to.be.equal(6.0);
        expect(tuple0[2]).to.be.equal(5.0);
        expect(tuple0[3]).to.be.equal(4.0);
    });


    it('should support check for equality of 2-tuples', () => {
        expect(equals2<GLfloat>([1.0, 0.0], [1.0, 0.0])).to.be.true;
        expect(equals2<GLfloat>([1.0, 0.0], [0.0, 1.0])).to.be.false;
    });

    it('should support check for equality of 3-tuples', () => {
        expect(equals3<GLfloat>([2.0, 1.0, 0.0], [2.0, 1.0, 0.0])).to.be.true;

        expect(equals3<GLfloat>([2.0, 1.0, 0.0], [2.0, 1.0, 3.0])).to.be.false;
        expect(equals3<GLfloat>([2.0, 1.0, 0.0], [2.0, 3.0, 0.0])).to.be.false;
        expect(equals3<GLfloat>([2.0, 1.0, 0.0], [3.0, 1.0, 0.0])).to.be.false;
    });

    it('should support check for equality of 4-tuples', () => {
        expect(equals4<GLfloat>([3.0, 2.0, 1.0, 0.0], [3.0, 2.0, 1.0, 0.0])).to.be.true;

        expect(equals4<GLfloat>([3.0, 2.0, 1.0, 0.0], [3.0, 2.0, 1.0, 4.0])).to.be.false;
        expect(equals4<GLfloat>([3.0, 2.0, 1.0, 0.0], [3.0, 2.0, 4.0, 0.0])).to.be.false;
        expect(equals4<GLfloat>([3.0, 2.0, 1.0, 0.0], [3.0, 4.0, 1.0, 0.0])).to.be.false;
        expect(equals4<GLfloat>([3.0, 2.0, 1.0, 0.0], [4.0, 2.0, 1.0, 0.0])).to.be.false;
    });

});
