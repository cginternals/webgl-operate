/* spellchecker: disable */


import * as chai from 'chai';
import * as spies from 'chai-spies';

chai.use(spies);

const expect = chai.expect;

import { vec3, vec4 } from 'gl-matrix';
import { Camera } from '../source/camera';
import { TileCameraGenerator } from '../source/tilecameragenerator';

/* tslint:disable:no-unused-expression */

describe('Tile Camera Generator Scanline Iteration', () => {
    it(' should render in the correct order', () => {
        const algorithm = TileCameraGenerator.IterationAlgorithm.ScanLine;
        const tileDimensions: [number, number] = [13, 7];

        // generate the expected order
        const expectedOrder: [number, number][] = [];
        for (let y = 0; y < tileDimensions[1]; y++) {
            for (let x = 0; x < tileDimensions[0]; x++) {
                expectedOrder.push([x, y]);
            }
        }

        // test if the order is correct
        testTileCameraIndicesMatchExpected(algorithm, expectedOrder, tileDimensions);
    });

});

describe('Tile Camera Generator Hilbert Iteration', () => {
    it(' should render in the correct order', () => {
        const algorithm = TileCameraGenerator.IterationAlgorithm.HilbertCurve;
        const tileDimensions: [number, number] = [7, 5];

        // array contains the expected order
        const expectedOrder: [number, number][] = [
            [0, 0], [1, 0], [1, 1], [0, 1], [0, 2], [0, 3], [1, 3],
            [1, 2], [2, 2], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1],
            [2, 0], [3, 0], [4, 0], [4, 1], [5, 1], [5, 0], [6, 0],
            [6, 1], [6, 2], [6, 3], [5, 3], [5, 2], [4, 2], [4, 3],
            [4, 4], [5, 4], [6, 4], [3, 4], [2, 4], [1, 4], [0, 4],
        ];

        // test if the order is correct
        testTileCameraIndicesMatchExpected(algorithm, expectedOrder, tileDimensions);
    });

});

describe('Tile Camera Generator Z-Curve Iteration', () => {
    it(' should render in the correct order', () => {
        const algorithm = TileCameraGenerator.IterationAlgorithm.ZCurve;
        const tileDimensions: [number, number] = [7, 5];

        // generate the expected order
        const expectedOrder: [number, number][] = [
            [0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [3, 0], [2, 1],
            [3, 1], [0, 2], [1, 2], [0, 3], [1, 3], [2, 2], [3, 2],
            [2, 3], [3, 3], [4, 0], [5, 0], [4, 1], [5, 1], [6, 0],
            [6, 1], [4, 2], [5, 2], [4, 3], [5, 3], [6, 2], [6, 3],
            [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
        ];

        // test if the order is correct
        testTileCameraIndicesMatchExpected(algorithm, expectedOrder, tileDimensions);
    });

});

function testTileCameraIndicesMatchExpected(algorithm: TileCameraGenerator.IterationAlgorithm,
    expectedOrder: [number, number][], tileDimensions: [number, number]): void {
    const camera = new Camera(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0), vec3.fromValues(0, 0, 1));

    const tileCameraGenerator = new TileCameraGenerator();
    tileCameraGenerator.sourceCamera = camera;
    tileCameraGenerator.padding = vec4.create();
    tileCameraGenerator.tileSize = [1, 1];
    tileCameraGenerator.sourceViewport = tileDimensions;
    tileCameraGenerator.algorithm = algorithm;
    const tileNumber = expectedOrder.length;
    for (let i = 0; i < tileNumber; i++) {
        tileCameraGenerator.tile = i;
        tileCameraGenerator.update();
        expect(tileCameraGenerator.offset).to.deep.equal(expectedOrder[i]);
    }
}
