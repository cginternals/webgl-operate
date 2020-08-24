
/* spellchecker: disable */

const chai = require('chai'), spies = require('chai-spies'), sinon = require('sinon');
chai.use(spies);

const expect = chai.expect;
const stub = sinon.stub;

import { vec3, vec4 } from 'gl-matrix';
import { Camera } from '../source/camera';
import { TileCameraGenerator } from '../source/tilecameragenerator';

/* tslint:disable:no-unused-expression */

describe('Tile Camera Generator Scanline Iteration', () => {
    it(' should render in the correct order', () => {
        const tileDimensions: [number, number] = [13, 7];

        // generate the expected order
        const expectedOrder: [number, number][] = [];
        for (let y = 0; y < tileDimensions[1]; y++) {
            for (let x = 0; x < tileDimensions[0]; x++) {
                expectedOrder.push([x, y]);
            }
        }

        // test if the order is correct
        testTileCameraIndicesMatchExpected(expectedOrder, tileDimensions);
    });
});

describe('Tile Camera Generator Hilbert Iteration', () => {
    it(' should render in the correct order', () => {
        const algorithm = TileCameraGenerator.Algorithm.HilbertCurve;
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
        testTileCameraIndicesMatchExpected(expectedOrder, tileDimensions, algorithm);
    });

});

describe('Tile Camera Generator Z-Curve Iteration', () => {
    it(' should render in the correct order', () => {
        const algorithm = TileCameraGenerator.Algorithm.ZCurve;
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
        testTileCameraIndicesMatchExpected(expectedOrder, tileDimensions, algorithm);
    });
});

function createTileCameraGenerator(tileDimensions: [number, number],
    algorithm: TileCameraGenerator.Algorithm = TileCameraGenerator.Algorithm.ScanLine): TileCameraGenerator {
    const camera = new Camera(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0), vec3.fromValues(0, 0, 1));

    const tileCameraGenerator = new TileCameraGenerator();
    tileCameraGenerator.sourceCamera = camera;
    tileCameraGenerator.padding = vec4.create();
    tileCameraGenerator.tileSize = [1, 1];
    tileCameraGenerator.sourceViewport = tileDimensions;
    tileCameraGenerator.algorithm = algorithm;
    expect(tileCameraGenerator.algorithm).to.eq(algorithm);
    return tileCameraGenerator;
}

function testTileCameraIndicesMatchExpected(expectedOrder: [number, number][], tileDimensions: [number, number],
    algorithm?: TileCameraGenerator.Algorithm): void {
    const tileCameraGenerator = createTileCameraGenerator(tileDimensions, algorithm);
    const tileNumber = expectedOrder.length;
    for (let i = 0; i < tileNumber; i++) {
        tileCameraGenerator.tile = i;
        tileCameraGenerator.update();
        expect(tileCameraGenerator.offset).to.deep.equal(expectedOrder[i]);
        expect(tileCameraGenerator.valid).to.be.true;
        expect(tileCameraGenerator.camera).to.not.be.undefined;
    }
}


describe('TileCameraGenerator.nextTile', () => {

    it('should return ture and reset the iteration when the current tile is < 0.', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        tileCameraGenerator.tile = -1;
        expect(tileCameraGenerator.hasNextTile()).to.be.false;
        expect(tileCameraGenerator.nextTile()).to.be.true;
        expect(tileCameraGenerator.tile).to.be.eq(0);
    });

    it('should return false when the current tile too high.', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        tileCameraGenerator.tile = tileCameraGenerator.numTiles;
        expect(tileCameraGenerator.hasNextTile()).to.be.false;
        expect(tileCameraGenerator.nextTile()).to.be.false;
    });

    it('should return true when the current indice is in range.', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        for (let currentTileIndex = 0; currentTileIndex < tileCameraGenerator.numTiles - 1; currentTileIndex++) {
            tileCameraGenerator.tile = currentTileIndex;
            expect(tileCameraGenerator.hasNextTile()).to.be.true;
            expect(tileCameraGenerator.nextTile()).to.be.true;
        }
    });
});

describe('TileCameraGenerator.reset', () => {

    it('should set the tile to -1', () => {
        const tileCameraGenerator = new TileCameraGenerator();
        tileCameraGenerator.reset();
        expect(tileCameraGenerator.tile).to.eq(-1);
    });

    it('should set the offset to 0', () => {
        const tileCameraGenerator = new TileCameraGenerator();
        tileCameraGenerator.padding = vec4.fromValues(1, 1, 1, 1);
        tileCameraGenerator.reset();
        expect(tileCameraGenerator.offset).to.eql([0, 0]);
    });
});


describe('TileCameraGenerator.sourceCameraChanged', () => {

    it('should set the camera', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        const newEyePosition = vec3.fromValues(1, 0, 0);
        const sourceCamera = tileCameraGenerator.sourceCamera;
        expect(sourceCamera).to.not.be.undefined;
        if (sourceCamera) {
            sourceCamera.eye = newEyePosition;
            tileCameraGenerator.sourceCameraChanged();
            if (tileCameraGenerator.camera) {
                expect(tileCameraGenerator.camera.eye).to.eql(newEyePosition);
            }
        }
    });
});

describe('TileCameraGenerator.update', () => {

    let consoleLogStub: sinon.SinonStub;

    before(() => {
        consoleLogStub = stub(console, 'log');
    });

    after(() => {
        consoleLogStub.restore();
    });

    it('should return the same offset when called multiple times on same tile index', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        tileCameraGenerator.tile = 1;
        const initialOffset = tileCameraGenerator.update();
        expect(tileCameraGenerator.update()).to.eql(initialOffset);
    });

    it('should return the prevoius offset when called with invalid tile index', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        tileCameraGenerator.tile = 1;
        const initialOffset = tileCameraGenerator.update();
        tileCameraGenerator.tile = -1;
        expect(tileCameraGenerator.update()).to.eql(initialOffset);
    });
});

describe('TileCameraGenerator.viewport', () => {

    it('should be a combination of the offset and tileSize', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        tileCameraGenerator.tile = 1;
        const expectedOffset = tileCameraGenerator.update();
        const expectedViewport = [expectedOffset[0], expectedOffset[1],
        tileCameraGenerator.tileSize[0], tileCameraGenerator.tileSize[1]];
        expect(tileCameraGenerator.viewport).to.eql(expectedViewport);
    });
});

describe('TileCameraGenerator.sourceCamera', () => {

    it('cameras should be undefined if the parameter is undefined', () => {
        const tileCameraGenerator = createTileCameraGenerator([8, 8]);
        tileCameraGenerator.sourceCamera = undefined;
        expect(tileCameraGenerator.sourceCamera).to.be.undefined;
        expect(tileCameraGenerator.camera).to.be.undefined;
    });
});

describe('TileCameraGenerator should stay valid if reassigning the same values', () => {
    const tileCameraGenerator = createTileCameraGenerator([8, 8]);

    before(() => {
        tileCameraGenerator.nextTile();
    });

    it('sourceViewort', () => {
        const sourceViewport = tileCameraGenerator.sourceViewport;
        tileCameraGenerator.sourceViewport = sourceViewport;
        expect(tileCameraGenerator.valid).to.be.true;
    });

    it('tileSize', () => {
        const tileSize = tileCameraGenerator.tileSize;
        tileCameraGenerator.tileSize = tileSize;
        expect(tileCameraGenerator.valid).to.be.true;
    });

});

