
import * as chai from 'chai';

const expect = chai.expect;

import { GLfloat2, GLfloat3, GLfloat4 } from '../source/tuples';
import { clampf, clampf2, clampf3, clampf4 } from '../source/tuples';


describe('tuples clamp', () => {

    it('should clamp a float value to [0.0, 1.0] range', () => {
        const tests = [[+3, +1], [+1, +1], [-1, 0], [0, 0], [0.5, 0.5]];
        tests.forEach((test) => expect(clampf(test[0])).to.equal(test[1]));
    });

    it('should clamp each component of a float 2-tuple to [0.0, 1.0] range', () => {
        const tests: Array<[GLfloat2, GLfloat2]> = [[[2, 2], [1, 1]], [[-1, -1], [0, 0]]
            , [[0, 0], [0, 0]], [[0.5, 0.5], [0.5, 0.5]]
            , [[2, 0], [1, 0]], [[0, 2], [0, 1]], [[-2, 0], [0, 0]], [[0, -2], [0, 0]]];
        tests.forEach((test) => expect(clampf2(test[0])).to.deep.equal(test[1]));
    });

    it('should clamp each component of a float 3-tuple to [0.0, 1.0] range', () => {
        const tests: Array<[GLfloat3, GLfloat3]> = [[[2, 2, 2], [1, 1, 1]], [[-1, -1, -1], [0, 0, 0]]
            , [[0, 0, 0], [0, 0, 0]], [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5]]
            , [[+2, 0, 0], [1, 0, 0]], [[0, +2, 0], [0, 1, 0]], [[0, 0, +2], [0, 0, 1]]
            , [[-2, 0, 0], [0, 0, 0]], [[0, -2, 0], [0, 0, 0]], [[0, 0, -2], [0, 0, 0]]];
        tests.forEach((test) => expect(clampf3(test[0])).to.deep.equal(test[1]));
    });

    it('should clamp each component of a float 4-tuple to [0.0, 1.0] range', () => {
        const tests: Array<[GLfloat4, GLfloat4]> = [[[2, 2, 2, 2], [1, 1, 1, 1]], [[-1, -1, -1, -1], [0, 0, 0, 0]]
            , [[0, 0, 0, 0], [0, 0, 0, 0]], [[0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]
            , [[+2, 0, 0, 0], [1, 0, 0, 0]], [[0, +2, 0, 0], [0, 1, 0, 0]]
            , [[0, 0, +2, 0], [0, 0, 1, 0]], [[0, 0, 0, +2], [0, 0, 0, 1]]
            , [[-2, 0, 0, 0], [0, 0, 0, 0]], [[0, -2, 0, 0], [0, 0, 0, 0]]
            , [[0, 0, -2, 0], [0, 0, 0, 0]], [[0, 0, 0, -2], [0, 0, 0, 0]]];
        tests.forEach((test) => expect(clampf4(test[0])).to.deep.equal(test[1]));
    });

});
