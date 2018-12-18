// @ts-ignore
import * as chai from 'chai';
const { expect } = chai;
import { computeMunkres, makeCostMatrix } from '../source/hungarian';

describe('Munkres Algorithm', () => {
    it('handles singleton matrix', () => {
        const matrix = [[5]];
        expect(computeMunkres(matrix)).to.eql([[0, 0]]);
    });

    it('handles negative singleton matrix', () => {
        const matrix = [[-5]];
        expect(computeMunkres(matrix)).to.eql([[0, 0]]);
    });

    it('handles 2-by-2 matrix', () => {
        const matrix = [[5, 3], [2, 4]];
        expect(computeMunkres(matrix)).to.eql([[0, 1], [1, 0]]);  // smallest cost is 3+2=5
    });

    it('handles 2-by-2 negative matrix', () => {
        const matrix = [[-5, -3], [-2, -4]];
        expect(computeMunkres(matrix)).to.eql([[0, 0], [1, 1]]);
    });

    it('handles 3-by-3 matrix', () => {
        const matrix = [[5, 3, 1], [2, 4, 6], [9, 9, 9]];
        expect(computeMunkres(matrix)).to.eql([[0, 2], [1, 0], [2, 1]]);  // smallest cost is 1+2+9=12
    });

    it('handles another 3-by-3 matrix', () => {
        const matrix = [
            [400, 150, 400],
            [400, 450, 600],
            [300, 225, 300],
        ];

        expect(computeMunkres(matrix)).to.eql([[0, 1], [1, 0], [2, 2]]);
    });

    it('handles 3-by-3 matrix with both positive and negative values', () => {
        const matrix = [[5, 3, -1], [2, 4, -6], [9, 9, -9]];
        expect(computeMunkres(matrix)).to.eql([[0, 1], [1, 0], [2, 2]]);
    });

    it('handles all-zero 3-by-3 matrix', () => {
        const matrix = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ];

        expect(computeMunkres(matrix)).to.eql([[0, 0], [1, 1], [2, 2]]);
    });

    it('handles rectangular 3-by-4 matrix', () => {
        const matrix = [
            [400, 150, 400, 1],
            [400, 450, 600, 2],
            [300, 225, 300, 3],
        ];

        expect(computeMunkres(matrix)).to.eql([[0, 1], [1, 3], [2, 0]]);
    });

    it('handles rectangular 3-by-4 matrix, shorthand-style', () => {
        const matrix = [
            [400, 150, 400, 1],
            [400, 450, 600, 2],
            [300, 225, 300, 3],
        ];

        expect(computeMunkres(matrix)).to.eql([[0, 1], [1, 3], [2, 0]]);
    });

    it('converts profit-matrix to cost-matrix', () => {
        const profitmatrix = [[5, 3], [2, 4]];
        const costmatrix = makeCostMatrix(profitmatrix);

        expect(computeMunkres(costmatrix)).to.eql([[0, 0], [1, 1]]);  // largest profit is 5+4=9
    });
});
