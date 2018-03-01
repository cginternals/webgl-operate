

import * as chai from 'chai';

const expect = chai.expect;


import { vec2, vec3 } from 'gl-matrix';

import * as rayMath from '../source/raymath';


/* tslint:disable:no-unused-expression */

describe('Ray Math', () => {

    it('ray plane intersection should return undefined intersection, when there is none', () => {
        const ray0 = [vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(-1.0, 0.0, 1.0)];
        const ray1 = [vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(-1.0, 0.0, 1.0)];

        for (let i = 0; i < ray0.length; ++i) {
            const result: vec3 = rayMath.rayPlaneIntersection(ray0[i], ray1[i]);
            expect(result).to.be.undefined;
        }
    });

    it('ray plane intersection should result in straight lines, since direction stays within plane', () => {
        const ray0 = [vec3.fromValues(+1.0, 0.0, 0.0), vec3.fromValues(0.0, 0.0, +1.0)];
        const ray1 = [vec3.fromValues(-1.0, 0.0, 0.0), vec3.fromValues(0.0, 0.0, -1.0)];

        for (let i = 0; i < ray0.length; ++i) {
            const result: vec3 = rayMath.rayPlaneIntersection(ray0[i], ray1[i]);
            expect(result).to.be.undefined;
        }
    });

    it('ray plane intersection should account for constrained intersections, e. g., ray from below', () => {
        const ray0 = [vec3.fromValues(0.0, -1.0, 0.0)];
        const ray1 = [vec3.fromValues(0.0, +1.0, 0.0)];

        for (let i = 0; i < ray0.length; ++i) {
            const result: vec3 = rayMath.rayPlaneIntersection(ray0[i], ray1[i]);
            expect(result).to.be.undefined;
        }
    });

    it('ray plane intersection should return valid intersections', () => {
        const ray0 = new Array<vec3>();
        const ray1 = new Array<vec3>();
        const expected = new Array<vec3>();

        ray0.push(vec3.fromValues(0.0, 1.0, 0.0)); ray1.push(vec3.fromValues(0.0, -1.0, 0.0));
        expected.push(vec3.fromValues(0.0, 0.0, 0.0));

        ray0.push(vec3.fromValues(1.0, 1.0, 0.0)); ray1.push(vec3.fromValues(-1.0, -1.0, 0.0));
        expected.push(vec3.fromValues(0.0, 0.0, 0.0));

        ray0.push(vec3.fromValues(2.0, 1.0, 3.0)); ray1.push(vec3.fromValues(2.0, -1.0, 3.0));
        expected.push(vec3.fromValues(2.0, 0.0, 3.0));

        for (let i = 0; i < ray0.length; ++i) {
            const result: vec3 = rayMath.rayPlaneIntersection(ray0[i], ray1[i]);
            expect(result).to.deep.equal(expected[i]);
        }
    });

    it('ray plane intersection should return undefined intersection, invalid ray is provided', () => {
        const ray0 = [vec3.fromValues(0.0, 1.0, 0.0)];
        const ray1 = [vec3.fromValues(0.0, 1.0, 0.0)];

        for (let i = 0; i < ray0.length; ++i) {
            const result: vec3 = rayMath.rayPlaneIntersection(ray0[i], ray1[i]);
            expect(result).to.be.undefined;
        }
    });

    it('point-within-square evaluation should be positive for the center as well as points on edges', () => {
        const points: Array<vec2> = [
            vec2.fromValues(+1.0, +1.0),
            vec2.fromValues(+1.0, +0.0),
            vec2.fromValues(+1.0, -1.0),
            vec2.fromValues(+0.0, +1.0),
            vec2.fromValues(+0.0, +0.0),
            vec2.fromValues(+0.0, -1.0),
            vec2.fromValues(-1.0, +1.0),
            vec2.fromValues(-1.0, +0.0),
            vec2.fromValues(-1.0, -1.0)];

        for (const point of points) {
            expect(rayMath.isPointWithinSquare(point)).to.be.true;
        }
    });

    it('point-within-square evaluation should be positive for the center as well as points on edges', () => {
        const points: Array<vec2> = [
            vec2.fromValues(+1.0, +1.0),
            vec2.fromValues(+1.0, +0.0),
            vec2.fromValues(+1.0, -1.0),
            vec2.fromValues(+0.0, +1.0),
            vec2.fromValues(+0.0, +0.0),
            vec2.fromValues(+0.0, -1.0),
            vec2.fromValues(-1.0, +1.0),
            vec2.fromValues(-1.0, +0.0),
            vec2.fromValues(-1.0, -1.0)];

        for (const point of points) {
            expect(rayMath.isPointWithinSquare(point)).to.be.true;
        }
    });

    it('point-within-square evaluation should be negative for points outside the square', () => {
        const e = 1.0 + 0.000001;
        const points: Array<vec2> = [
            vec2.fromValues(+e, +e),
            vec2.fromValues(+e, +0),
            vec2.fromValues(+e, -e),
            vec2.fromValues(+0, +e),
            vec2.fromValues(+0, -e),
            vec2.fromValues(-e, +e),
            vec2.fromValues(-e, +0),
            vec2.fromValues(-e, -e)];

        for (const point of points) {
            expect(rayMath.isPointWithinSquare(point)).to.be.false;
        }
    });

    it('point-within-square evaluation should be positive for points within the square', () => {
        const points: Array<vec2> = [
            vec2.fromValues(+0.5, +0.5),
            vec2.fromValues(+0.5, +0.0),
            vec2.fromValues(+0.5, -0.5),
            vec2.fromValues(+0.0, +0.5),
            vec2.fromValues(+0.0, +0.0),
            vec2.fromValues(+0.0, -0.5),
            vec2.fromValues(-0.5, +0.5),
            vec2.fromValues(-0.5, +0.0),
            vec2.fromValues(-0.5, -0.5)];

        for (const point of points) {
            expect(rayMath.isPointWithinSquare(point)).to.be.true;
        }
    });

    it('ray circle intersection should return undefined intersection, when there is none', () => {
        const ray0 = new Array<vec2>();
        const ray1 = new Array<vec2>();

        ray0.push(vec2.fromValues(0.0, 0.0)); ray1.push(vec2.fromValues(0.0, 0.0));

        ray0.push(vec2.fromValues(+2.0, 0.0)); ray1.push(vec2.fromValues(+3.0, +1.0));
        ray0.push(vec2.fromValues(+2.0, 0.0)); ray1.push(vec2.fromValues(+1.0, -1.0));

        for (let i = 0; i < ray0.length; ++i) {
            const result: vec2 = rayMath.rayCircleIntersection(ray0[i], ray1[i]);
            expect(result).to.be.undefined;
        }
    });

    it('ray circle intersection should return valid intersection points', () => {
        const ray0 = new Array<vec2>();
        const ray1 = new Array<vec2>();
        const expected = new Array<vec2>();

        ray0.push(vec2.fromValues(+2.0, 0.0)); ray1.push(vec2.fromValues(+1.0, 0.0));
        expected.push(vec2.fromValues(+1.0, 0.0));
        ray0.push(vec2.fromValues(0.0, +2.0)); ray1.push(vec2.fromValues(0.0, +1.0));
        expected.push(vec2.fromValues(0.0, +1.0));
        ray0.push(vec2.fromValues(-2.0, 0.0)); ray1.push(vec2.fromValues(-1.0, 0.0));
        expected.push(vec2.fromValues(-1.0, 0.0));
        ray0.push(vec2.fromValues(0.0, -2.0)); ray1.push(vec2.fromValues(0.0, -1.0));
        expected.push(vec2.fromValues(0.0, -1.0));

        for (let i = 0; i < ray0.length; ++i) {
            const result: vec2 = rayMath.rayCircleIntersection(ray0[i], ray1[i]);
            expect(result).to.deep.equal(expected[i]);
        }
    });

});
