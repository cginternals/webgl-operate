
import { mat4, vec3, vec4 } from 'gl-matrix';

import { m4 } from './gl-matrix-extensions';
import { log, LogLevel, assert, upperPowerOfTwo } from './auxiliaries';

import { Camera } from './camera';
import { GLsizei2, GLsizei4 } from './tuples';


/**
 * Support Class that wraps the calculation of camera tiling and iteration with various algorithms
 * by giving access to an adjusted camera which NDC-Coordinates match the current tile index.
 * Iteration can be done manually (variant: 1) or automatically (variant: 2).
 * It is intended to be used like:
 *
 * tileCameraGenerator = new TileCameraGenerator();
 * tileCameraGenerator.sourceCamera = camera;
 * tileCameraGenerator.sourceViewport = canvasSize;
 * tileCameraGenerator.tileSize = [128, 128];
 * tileCameraGenerator.algorithm = TileCameraGenerator.Algorithm.ScanLine;
 * let offset: [number, number];
 *
 * iteration variant 1:
 * for (let i = 0; i < tileCameraGenerator.numberOfTiles(); ++i){
 *      tileCameraGenerator.tile = i; // property
 *      tileCameraGenerator.update();
 *      offset = tileCameraGenerator.offset;
 *      "render camera"
 * }
 *
 * iteration variant 2:
 * while(tileCameraGenerator.nextTile()){
 *      offset = tileCameraGenerator.offset;
 *      "render"
 * }
 * // reset generator
 * tileCameraGenerator.reset();
 *
 * NOTE: Use `sourceCameraChanged` if the source camera is altered.
 */
export class TileCameraGenerator {

    /** @see {@link sourceCamera} */
    protected _sourceCamera: Camera | undefined;
    /** @see {@link sourceViewport} */
    protected _sourceViewport: GLsizei2 | undefined;

    /** @see {@link tileSize} */
    protected _tileSize: GLsizei2 = [0, 0];
    /** @see {@link padding} */
    protected _padding: vec4 = vec4.fromValues(0, 0, 0, 0);

    /** @see {@link tile} */
    protected _tile = -1;

    /** @see {@link eye} */
    protected _camera: Camera | undefined;

    /** @see {@link algorithm} */
    protected _algorithm = TileCameraGenerator.Algorithm.ScanLine;

    protected _valid: boolean;

    protected _offset: GLsizei2 = [0, 0];
    protected _indices: Uint16Array;


    /**
     * Recursively fills the interleaved indices using the Hilbert Curve. This method is not intended to be used
     * directly. Use generateHilbertIndices {@link generateHilbertIndices} instead.
     */
    protected static hilbertIndices(indices: Uint16Array, numX: number, numY: number, x: number, y: number,
        xi: number, xj: number, yi: number, yj: number, depth: number, hilbertIndex: number): number {

        if (depth > 0) {
            hilbertIndex = this.hilbertIndices(indices, numX, numY,
                x, y, yi / 2, yj / 2, xi / 2, xj / 2, depth - 1, hilbertIndex);
            hilbertIndex = this.hilbertIndices(indices, numX, numY,
                x + xi / 2, y + xj / 2, xi / 2, xj / 2, yi / 2, yj / 2, depth - 1, hilbertIndex);
            hilbertIndex = this.hilbertIndices(indices, numX, numY,
                x + xi / 2 + yi / 2, y + xj / 2 + yj / 2, xi / 2, xj / 2, yi / 2, yj / 2, depth - 1, hilbertIndex);
            hilbertIndex = this.hilbertIndices(indices, numX, numY,
                x + xi / 2 + yi, y + xj / 2 + yj, -yi / 2, -yj / 2, -xi / 2, -xj / 2, depth - 1, hilbertIndex);
            return hilbertIndex;
        }

        x = x + (xi + yi - 1) / 2;
        y = y + (xj + yj - 1) / 2;
        if (x < numX && y < numY) {
            const i = hilbertIndex * 2;
            indices[i + 0] = x;
            indices[i + 1] = y;
            ++hilbertIndex;
        }
        return hilbertIndex;
    }

    /**
     * Fills the iterationAlgorithmIndices with the table indices
     * from the HilbertCurve-Iteration-Algorithm.
     */
    static generateHilbertIndices(indices: Uint16Array, numX: number, numY: number): void {
        assert(indices.length === 2 * numX * numY,
            `expected interleaved indices-array of length ${2 * numX * numY}, given ${indices.length}`);

        const tableSize = Math.max(numX, numY);
        const recursionDepth = Math.ceil(Math.log2(tableSize));

        const uPow2 = upperPowerOfTwo(tableSize);
        this.hilbertIndices(indices, numX, numY, 0, 0, uPow2, 0, 0, uPow2, recursionDepth, 0);
    }

    /**
     * Generates interleaved table indices using the ZCurve-Iteration-Algorithm.
     */
    static generateScanLineIndices(indices: Uint16Array, numX: number, numY: number): void {
        assert(indices.length === 2 * numX * numY,
            `expected interleaved indices-array of length ${2 * numX * numY}, given ${indices.length}`);

        for (let y = 0; y < numY; ++y) {
            for (let x = 0; x < numX; ++x) {
                const i = (x + y * numX) * 2;
                indices[i + 0] = x;
                indices[i + 1] = y;
            }
        }
    }

    /**
     * Fills the sequence/array of indices with the table indices from the ZCurve-Iteration-Algorithm.
     */
    static generateZCurveIndices(indices: Uint16Array, numX: number, numY: number): void {
        assert(indices.length === 2 * numX * numY,
            `expected interleaved indices-array of length ${2 * numX * numY}, given ${indices.length}`);

        const tableSize = Math.max(numX, numY);
        const maxZIndexBitLength = Math.floor(Math.log2(tableSize)) * 2;

        // iterate over the z-curve until all indices in the tile-range are collected
        let zIndex = 0;
        for (let numberOfFoundIndices = 0; numberOfFoundIndices < numX * numY; ++zIndex) {
            let x = 0;
            let y = 0;
            // Bit-Magic that maps the index to table indices (see Definition of Z-Curve for further information)
            for (let currentBit = 0; currentBit < maxZIndexBitLength; ++currentBit) {
                const xBit = zIndex >> (currentBit * 2) & 1;
                x += xBit << currentBit;
                const yBit = zIndex >> (currentBit * 2 + 1) & 1;
                y += yBit << currentBit;
            }
            // Only add table indices that are within the tile-range.
            if (x < numX && y < numY) {
                const i = numberOfFoundIndices * 2;
                indices[i + 0] = x;
                indices[i + 1] = y;
                ++numberOfFoundIndices;
            }
        }
    }


    protected invalidate(clearIndices: boolean): void {
        if (clearIndices) {
            this._indices = new Uint16Array(0);
        }
        this._valid = false;
    }


    /**
     * Ensures that the indices are available. If not, indices using the algorithm set will be generated.
     */
    protected ensureValidIterationIndices(): void {
        if (this._indices.length > 0) {
            return;
        }

        this._indices = new Uint16Array(this.numTiles * 2);

        switch (this._algorithm) {
            case TileCameraGenerator.Algorithm.ScanLine:
                TileCameraGenerator.generateScanLineIndices(
                    this._indices, this.numXTiles, this.numYTiles);
                break;
            case TileCameraGenerator.Algorithm.HilbertCurve:
                TileCameraGenerator.generateHilbertIndices(
                    this._indices, this.numXTiles, this.numYTiles);
                break;
            case TileCameraGenerator.Algorithm.ZCurve:
                TileCameraGenerator.generateZCurveIndices(
                    this._indices, this.numXTiles, this.numYTiles);
                break;
            default:
                TileCameraGenerator.generateScanLineIndices(
                    this._indices, this.numXTiles, this.numYTiles);
        }
    }

    /**
     * Converts the tile index from the selected Algorithm to table indices.
     * @returns - The converted tile index.
     */
    protected tableIndices(): GLsizei2 {
        this.ensureValidIterationIndices();
        const i = this.tile * 2;
        return [this._indices[i + 0], this._indices[i + 1]];
    }


    /**
     * Returns the padded tileSize.
     * @returns - The padded tileSize.
     */
    protected getPaddedTileSize(): [number, number] {
        return [this.padding[1] + this.padding[3] + this.tileSize[0],
        this.padding[0] + this.padding[2] + this.tileSize[1]];
    }

    /**
     * Used for Iterator behavior. It sets the tile to 0 (first tile) if the value of tile is negative
     * and therefore initiates the iteration.
     * Otherwise it increments the tile and calls update to directly change the camera.
     * If the tile index would get out of range it returns false to indicate, that all tiles were rendered.
     * @returns - If the camera has been set to a next tile.
     */
    public nextTile(): boolean {
        if (this.tile >= this.numTiles - 1) {
            return false;
        }
        if (this.tile < 0) {
            this.tile = -1;
        }
        ++this.tile;
        this.update();

        return true;
    }

    /**
     * Returns if tiles still need to be rendered.
     */
    public hasNextTile(): boolean {
        return this.tile < this.numTiles - 1 && this.tile >= 0;
    }

    /**
     * Resets the tile index to prepare the generator for the next rendering.
     * Should be called after iteration with nextTile().
     */
    public reset(): void {
        this.tile = -1;

        this._offset[0] = 0;
        this._offset[1] = 0;
    }

    /**
     * Reassigns all values from the source camera to the tile camera, e.g., when the source camera is altered.
     */
    public sourceCameraChanged(): void {
        assert(this._sourceCamera !== undefined, `expected the unput/source camera to be defined`);
        this._camera = Object.create(this._sourceCamera!) as Camera;
    }

    /**
     * Updates the camera view frustum to current tile based on
     * the sourceViewport, tileSize and the padding.
     * If the tile is less than zero, the camera is set to the first tile.
     * If the tile is too high, the camera is not updated and remains in the last valid state.
     * @returns - the offset of the new camera tile.
     */
    public update(): GLsizei2 {
        // do nothing and return the last offset if no property has changed.
        if (this._valid) {
            return this._offset;
        }

        // If an invalid index is requested: Do not change the camera and return the last valid tile offset.
        if (this.numTiles <= this.tile || 0 > this.tile) {
            log(LogLevel.Warning, `index ${this.tile} is out of bounds ${this.numTiles}, returning first tile`);
            return this._offset;
        }

        assert(this._sourceViewport !== undefined && this._sourceCamera !== undefined,
            `expected source camera and source viewport to be defined before updating`);

        this._valid = true;

        const tableIndices = this.tableIndices();
        const viewport = this.sourceViewport!;

        const paddedTileSize = this.getPaddedTileSize();

        // Calculate the padded tile center coordinates in the viewport-space.
        const paddedTileCenter = [0, 0];
        paddedTileCenter[0] = tableIndices[0] * this.tileSize[0] + paddedTileSize[0] / 2;
        paddedTileCenter[1] = tableIndices[1] * this.tileSize[1] + paddedTileSize[1] / 2;

        // Calculate the offset which is needed for the return.
        const offset: [number, number] = [0, 0];
        offset[0] = tableIndices[0] * this.tileSize[0];
        offset[1] = tableIndices[1] * this.tileSize[1];

        // Scale down the padded tile center coordinates to padded tile center NDC coordinates.
        const paddedTileCenterNDC = [paddedTileCenter[0] * 2 / viewport[0] - 1
            , paddedTileCenter[1] * 2 / viewport[1] - 1];

        // Create the scale vector that scales up the padded tile to the NDC-range of -1;1.
        const scaleVec = vec3.fromValues(viewport[0] / paddedTileSize[0], viewport[1] / paddedTileSize[1], 1);

        // Create the translation vector which shifts the padded tile center NDC into the origin.
        const translationVec = vec3.fromValues(-paddedTileCenterNDC[0], -paddedTileCenterNDC[1], 0);

        // Combine the translation ans scale into the matrix.
        const tileNDCCorrectionMatrix = mat4.scale(m4(), mat4.identity(m4()), scaleVec);
        const translateMatrix = mat4.translate(m4(), tileNDCCorrectionMatrix, translationVec);

        // Set the postViewProjection matrix and offset to the new calculated values.
        this._camera!.postViewProjection = translateMatrix;
        this._offset = offset;

        return offset;
    }

    get valid(): boolean {
        return this._camera !== undefined && this._sourceCamera !== undefined && this._valid
    }


    /**
     * Returns the number of tiles along the x-axis based on the number of tiles that fit inside the horizontal extent
     * of the source camera's viewport.
     * @returns - The number of tiles along the x-axis.
     */
    get numXTiles(): number {
        assert(this._sourceViewport !== undefined, `expected the source viewport to be defined`);
        return Math.ceil(this.sourceViewport![0] / this.tileSize[0]);
    }

    /**
     * Returns the number of tiles along the y-axis based on the number of tiles that fit inside the vertical extent
     * of the source camera's viewport.
     * @returns - The number of tiles along the y-axis.
     */
    get numYTiles(): number {
        assert(this._sourceViewport !== undefined, `expected the source viewport to be defined`);
        return Math.ceil(this.sourceViewport![1] / this.tileSize[1]);
    }


    /**
     * Returns the total number of tiles
     * based on the how many of tileSize fit inside the sourceViewport.
     * @returns - The total number of tiles.
     */
    get numTiles(): number {
        return this.numXTiles * this.numYTiles;
    }

    /**
     * Returns the offset of the current tile. The padding is not included in the offset.
     * @returns - Current tile offset.
     */
    get offset(): GLsizei2 {
        return this._offset;
    }

    /**
     * Read-only access to the tiled camera that has the viewport of the current tile of the input/source camera.
     * @returns - The reference to the tile viewing camera.
     */
    get camera(): Camera | undefined {
        return this._camera;
    }

    /**
     * Creates a 4-tuple with x0, y0, and width and height of the viewport for the current tile and camera.
     * @returns - 4-tuple with [x0, y0, width, height] based on the current tile.
     */
    get viewport(): GLsizei4 {
        return [this.offset[0], this.offset[1], this.tileSize[0], this.tileSize[1]];
    }

    /**
     * Returns the sourceCamera which viewport should be divided in tiles.
     * If the sourceCamera has not been set, it returns a default camera.
     * @returns - The sourceCamera which viewport should be divided in tiles.
     */
    get sourceCamera(): Camera | undefined {
        return this._sourceCamera;
    }

    /**
     * Assigns the input camera whose viewport will be divided in tiles. Additionally it creates a deep copy of the
     * input camera which is used as the tiled camera {@link camera}.
     * @param camera - The input camera whose viewport will be divided in tiles.
     */
    set sourceCamera(camera: Camera | undefined) {
        if (camera === undefined) {
            this._sourceCamera = this._camera = undefined;
            return;
        }
        this._sourceCamera = camera;
        this._camera = Object.create(camera) as Camera;
        this.invalidate(false);
    }

    /**
     * Returns the current tile index.
     * @returns - The current tile index.
     */
    get tile(): number {
        return this._tile;
    }

    /**
     * Sets the current tile index.
     * @param index - The new index.
     */
    set tile(index: GLsizei) {
        if (this._tile === index) {
            return;
        }
        this._tile = index;
        this.invalidate(false);
    }

    /**
     * Returns the size of the original viewport
     * which should be divided in tiles based on the tile size.
     * If the viewport has not been set, it returns [-1, -1].
     * @returns - Size of the Viewport.
     */
    get sourceViewport(): GLsizei2 | undefined {
        return this._sourceViewport;
    }

    /**
     * Sets the size of the viewport from the sourceCamera.
     * It checks if the sourceViewport is compatible with the selected algorithm
     * and eventually adjusts the tileSize to match the conditions of the algorithm.
     */
    set sourceViewport(viewport: GLsizei2 | undefined) {
        if (this._sourceViewport !== undefined && viewport !== undefined &&
            this._sourceViewport[0] === viewport[0] && this._sourceViewport[1] === viewport[1]) {
            return;
        }
        this._sourceViewport = viewport;
        this.invalidate(true);
    }

    /**
     * Returns the tileSize.
     * @returns - [-1, -1] as invalid.
     */
    get tileSize(): GLsizei2 {
        return this._tileSize;
    }

    /**
     * Sets the tileSize. The tileSize eventually changes to match the selected algorithms constraints.
     */
    set tileSize(tileSize: GLsizei2) {
        if (this._tileSize[0] === tileSize[0] && this._tileSize[1] === tileSize[1]) {
            return;
        }
        this._tileSize = tileSize;
        this.invalidate(true);
    }

    /**
     * Returns the padding per tile in CSS order: top, right, bottom, left. The standard is (0, 0, 0, 0).
     */
    get padding(): vec4 {
        return this._padding;
    }

    /**
     * Stets the padding per tile in CSS order: top, right, bottom, left. The standard is (0, 0, 0, 0).
     */
    set padding(padding: vec4) {
        if (vec4.equals(this._padding, padding)) {
            return;
        }
        this._padding = vec4.clone(padding);
        this.invalidate(false);
    }

    /**
     * Returns the selected IterationAlgorithm which determines the sequence in which the tiles are rendered.
     */
    get algorithm(): TileCameraGenerator.Algorithm {
        return this._algorithm;
    }

    /**
     * Sets the selected IterationAlgorithm which determines the order in which the tiles are rendered. The default is
     * `ScanLine`. If needed, it automatically adjusts the tileSize to match the new algorithm.
     */
    set algorithm(algorithm: TileCameraGenerator.Algorithm) {
        if (this._algorithm === algorithm) {
            return;
        }
        this._algorithm = algorithm;
        this.invalidate(true);
    }
}


/**
 * The enum that is used to select one of the different algorithm.
 */
export namespace TileCameraGenerator {

    export enum Algorithm {
        /**
         * ScanLine conditions: none.
         */
        ScanLine = 'scanline',

        /**
         * HilbertCurve conditions: Both numberOfXTiles, numberOfYTiles need to be equal and need to be a power of two.
         * In the case that the condition is not satisfied the next higher number than numberOfTilesX/Y that is power
         * of two is calculated. The Iteration will be calculated with this number and tiles that lay outside the
         * viewport are skipped.
         */
        HilbertCurve = 'hilbertcurve',

        /**
         * ZCurve conditions: Both numberOfXTiles, numberOfYTiles need to be equal and need to be a power of two. In
         * the case that the condition is not satisfied the next higher number than numberOfTilesX/Y that is power of
         * two is calculated. The Iteration will be calculated with this number and tiles that lay outside the
         * viewport are skipped.
         */
        ZCurve = 'zcurve',
    }
}
