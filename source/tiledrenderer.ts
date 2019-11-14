import { mat4, vec3, vec4 } from 'gl-matrix';
import { log, LogLevel } from './auxiliaries';
import { Camera } from './camera';
import { m4 } from './gl-matrix-extensions';

/**
 * Support Class that wraps the calculation of camera tiling and iteration with various algorithms
 * by giving access to a adjusted camera which NDC-Coordinates match the current tile index.
 * Iteration can be done manually (variant: 1) or automatically (variant: 2).
 * Caution: This class may adjust the tileSize if it is necessary for the selected IterationAlgorithm.
 * It is intended to be used like:
 *
 * // setup
 * tiledRender = new TiledRenderer();
 * tiledRenderer.sourceCamera = camera;
 * tiledRenderer.sourceViewportSize = canvSize;
 * tiledRenderer.tileSize = [128, 128];
 * tiledRenderer.padding = vec4();
 * tileCamera = tileRender.camera;
 * tileRenderer.algorithm = TileRenderer.IteratorAlgorithm.ScanLine;
 * let offset: [number, number];
 *
 * iteration variant 1:
 * for (let i = 0; i < tileRenderer.numberOfTiles(); ++i){
 *      tiledRenderer.tile = i; // property
 *      tiledRenderer.update();
 *      offset = tileRenderer.offset;
 *      "render camera"
 * }
 *
 * iteration variant 2:
 * while(tileRender.nextTile()){
 *      "render"
 * }
 */

export class TiledRenderer {

    /** @see {@link eye} */
    protected _camera: Camera | undefined;

    /** @see {@link sourceCamera} */
    protected _sourceCamera: Camera | undefined;

    /** @see {@link tile} */
    protected _tile = -1;

    /** @see {@link sourceViewPort} */
    protected _sourceViewPort: [number, number] | undefined;

    /** @see {@link tileSize} */
    protected _tileSize: [number, number] | undefined;

    /** @see {@link padding} */
    protected _padding: vec4 = vec4.fromValues(0, 0, 0, 0);

    /** @see {@link algorithm} */
    protected _algorithm: TiledRenderer.IterationAlgorithm = TiledRenderer.IterationAlgorithm.ScanLine;

    protected _valid: boolean;
    protected _currentOffset: [number, number] = [0, 0];

    /**
     * Converts the tile index from the selected Algorithm to the tile index of the ScanLineAlgorithm
     * and returns that value.
     * @returns - The converted tile index.
     */
    protected getTileIndexOfLinearAlgorithm(): number {
        if (this.algorithm === TiledRenderer.IterationAlgorithm.ScanLine) {
            return this.tile;
        } else if (this.algorithm === TiledRenderer.IterationAlgorithm.HilbertCurve) {
            return this.convertTileIndexFromHilbertToScanLine();
        } else {
            return 0;
        }
    }

    /**
     * Converts the tile index from the HilbertCurve-Algorithm to the ScanLine-Algorithm.
     * @returns - The converted tile index.
     */
    protected convertTileIndexFromHilbertToScanLine(): number {
        const recursionDepth = this.numberOfXTiles();
        const coordinates = this.hilbertToTableIndices(recursionDepth, this.tile);
        return coordinates[0] + coordinates[1] * this.numberOfXTiles();
    }

    /**
     * Converts the tileIndex to x, y table indices based on the HilbertCurve-Traversal.
     * @param maxTileIndex - The maximum tile index + 1. In our case it should normally be numberOfTiles().
     * @param tileIndex  - The tile index that should be converted to the table indices.
     */
    protected hilbertToTableIndices(maxTileIndex: number, tileIndex: number): [number, number] {
        // indices: x = 0, y = 1
        const rotationVals: [number, number] = [0, 0];
        const coordinates: [number, number] = [0, 0];
        for (let recursionDepth = 1; recursionDepth < maxTileIndex; recursionDepth *= 2) {
            rotationVals[0] = 1 & (tileIndex / 2);
            rotationVals[1] = 1 & (tileIndex ^ rotationVals[0]);
            this.hilbertCurveRotation(recursionDepth, coordinates, rotationVals);
            coordinates[0] += recursionDepth * rotationVals[0];
            coordinates[1] += recursionDepth * rotationVals[1];
            tileIndex = Math.floor(tileIndex / 4);
        }
        return coordinates;
    }

    /**
     * Rotates or mirrors the coordinates for the HilbertCurveConversion.
     * @param recursionDepth - The current recursion depth.
     * @param coordinates - The coordinates / tableIndices.
     * @param rotationVals - Values that determine the quadrant requested tile index in the current recursion depth.
     */
    protected hilbertCurveRotation(recursionDepth: number,
        coordinates: [number, number], rotationVals: [number, number]): void {
        if (rotationVals[1] === 0) {
            if (rotationVals[0] === 1) {
                // Mirror x, y-coordinates
                coordinates[0] = (recursionDepth - 1) - coordinates[0];
                coordinates[1] = (recursionDepth - 1) - coordinates[1];
            }
            // Swap x, y-coordinates
            const temp = coordinates[0];
            coordinates[0] = coordinates[1];
            coordinates[1] = temp;
        }
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
     * Checks if all constrains for the selected algorithm are satisfied
     */
    protected checkIterationAlgorithmConstraints(): boolean {
        if (this.algorithm === TiledRenderer.IterationAlgorithm.HilbertCurve) {
            if (this._sourceViewPort && this._tileSize) {
                if (!this.isPowerOfTwo(this.numberOfXTiles()) || !this.isPowerOfTwo(this.numberOfYTiles())
                    || this.numberOfXTiles() !== this.numberOfYTiles()) {
                    return false;
                }
            }
        }
        return true;

    }

    /**
     * Tests with binary operations if the number is power of two.
     * @param x The number to test.
     */
    protected isPowerOfTwo(x: number): boolean {
        return (x & (x - 1)) === 0;
    }

    /**
     * Adjusts the TileSize to the constraints of the selected IterationAlgorithm.
     * HilbertCurve:
     *      Both numberOfTiles have to be the same and the numberOfTiles needs to be a power of two.
     */
    protected adjustTileSizeToMatchIterationAlgorithm(): void {
        // Hilbert Curve only works on a quadratic table which side lengths are power of twos
        if (this.algorithm === TiledRenderer.IterationAlgorithm.HilbertCurve) {
            if (!Number.isInteger(Math.log2(this.numberOfXTiles()))) {
                const numberOfTilesXSmaller = Math.pow(2, Math.floor(Math.log2(this.numberOfXTiles())));
                const numberOfTilesXLarger = Math.pow(2, Math.ceil(Math.log2(this.numberOfXTiles())));

                const smallerTileSize = Math.ceil(this.sourceViewPort[0] / numberOfTilesXSmaller);
                const largerTileSize = Math.ceil(this.sourceViewPort[0] / numberOfTilesXLarger);

                const distanceToSmallerTileSize = this.tileSize[0] - smallerTileSize;
                const distanceToLargerTileSize = this.tileSize[0] - largerTileSize;

                this.tileSize[0] = distanceToLargerTileSize > distanceToSmallerTileSize ?
                    largerTileSize : smallerTileSize;
            }
            const newNumberOfTilesY = this.numberOfXTiles();
            this.tileSize[1] = Math.ceil(this.sourceViewPort[1] / newNumberOfTilesY);
        }
    }

    /**
     * Used for Iterator behavior. It sets the tile to 0 (first tile) if the value of tile is negative
     * and therefore initiates the iteration.
     * Otherwise it increments the tile and calls update to directly change the camera.
     * If the tile index would get out of range it returns false to indicate, that all tiles were rendered.
     * @returns - If the camera has been set to a next tile.
     */
    public nextTile(): boolean {
        if (this.tile >= this.numberOFTiles() - 1) {
            return false;
        }
        if (this.tile < 0) {
            this.tile = 0;
        }
        ++this.tile;
        this.update();
        return true;
    }

    /**
     * Updates the camera view frustum to current tile based on
     * the sourceViewPort, tileSize and the padding.
     * If the tile is less than zero, the camera is set to the first tile.
     * If the tile is too high, the camera is not updated and remains in the last valid state.
     * @returns - the offset of the new camera tile.
     */
    public update(): [number, number] {
        // do nothing and return the last offset if no property has changed.
        if (this._valid) {
            return this._currentOffset;
        }
        this._valid = true;
        const index = this.getTileIndexOfLinearAlgorithm();
        const viewport = this.sourceViewPort;
        const paddedTileSize = this.getPaddedTileSize();

        // If an invalid index is requested: Do not change the camera and return the last valid tile offset.
        if (this.numberOFTiles() <= index || 0 > index) {
            log(LogLevel.Warning, `index:${index} is out of bounds: ${this.numberOfXTiles()}
                . Returning the first Tile`);
            return this._currentOffset;
        }

        // Calculate column (0) and row (1) index of the current tile.
        const tableIndices = [0, 0];
        tableIndices[0] = index % this.numberOfXTiles();
        tableIndices[1] = Math.floor((index - tableIndices[0]) / this.numberOfXTiles());

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
        this.camera.postViewProjection = translateMatrix;
        this._currentOffset = offset;

        return offset;
    }

    /**
     * Returns the number of tiles along the X axis
     * based on the how many of tileSize fit inside the sourceViewport.
     * @returns - The number of tiles along the X axis.
     */
    public numberOfXTiles(): number {
        return Math.ceil(this.sourceViewPort[0] / this.tileSize[0]);
    }

    /**
     * Returns the number of tiles along the Y axis
     * based on the how many of tileSize fit inside the sourceViewport.
     * @returns - The number of tiles along the Y axis.
     */
    public numberOfYTiles(): number {
        return Math.ceil(this.sourceViewPort[1] / this.tileSize[1]);
    }


    /**
     * Returns the total number of tiles
     * based on the how many of tileSize fit inside the sourceViewport.
     * @returns - The total number of tiles.
     */
    public numberOFTiles(): number {
        return this.numberOfXTiles() * this.numberOfYTiles();
    }

    /**
     * Returns the reference to the camera
     * that has the viewport of the current tile of the sourceCamera.
     * It returns a default camera if the camera is undefined.
     * This is the case when the sourceCamera has not been set.
     * @returns - The reference to the tile viewing camera.
     */
    get camera(): Camera {
        if (this._camera) {
            return this._camera;
        } else {
            return new Camera();
        }
    }

    /**
     * Returns the sourceCamera which viewport should be divided in tiles.
     * If the sourceCamera has not been set, it returns a default camera.
     * @returns - The sourceCamer which viewport should be divided in tiles.
     */
    get sourceCamera(): Camera {
        if (this._sourceCamera) {
            return this._sourceCamera;
        } else {
            return new Camera();
        }
    }

    /**
     * Sets the sourceCamera which viewport should be divided in tiles.
     * Additionally it creates a deep copy of the sourceCamera
     * which is used as the tiled camera.
     * @param camera - The sourceCamera which viewport should be divided in tiles.
     */
    set sourceCamera(camera: Camera) {
        if (this._sourceCamera !== camera) {
            this._sourceCamera = camera,
                this._camera = camera.copy();
            this._valid = false;
        }
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
    set tile(index: number) {
        if (this._tile !== index) {
            this._tile = index;
            this._valid = false;
        }
    }

    /**
     * Returns the size of the original viewport
     * which should be divided in tiles based on the tile size.
     * If the viewport has not been set, it returns [-1, -1].
     * @returns - Size of the Viewport.
     */
    get sourceViewPort(): [number, number] {
        if (this._sourceViewPort) {
            return this._sourceViewPort;
        } else {
            return [-1, -1];
        }
    }

    /**
     * Sets the size of the viewport from the sourceCamera.
     * It checks if the sourceViewPort is compatible with the selected algorithm
     * and eventually adjusts the tileSize to match the conditions of the algorithm.
     */
    set sourceViewPort(viewport: [number, number]) {
        if (this._sourceViewPort !== viewport) {
            this._sourceViewPort = viewport;
            if (!this.checkIterationAlgorithmConstraints()) {
                this.adjustTileSizeToMatchIterationAlgorithm();
            }
            this._valid = false;
        }
    }

    /**
     * Returns the tileSize.
     * If the tilesSize has not been set it returns [-1, -1] as invalid.
     */
    get tileSize(): [number, number] {
        if (this._tileSize) {
            return this._tileSize;
        } else {
            return [-1, -1];
        }
    }

    /**
     * Sets the tileSize.
     * The tileSize eventually changes to match the selected algorithms constraints.
     */
    set tileSize(tileSize: [number, number]) {
        if (this._tileSize !== tileSize) {
            this._tileSize = tileSize;
            if (!this.checkIterationAlgorithmConstraints()) {
                this.adjustTileSizeToMatchIterationAlgorithm();
            }
            this._valid = false;
        }
    }

    /**
     * Returns the padding per tile in CSS order: top, right, bottom, left.
     * The standard is (0, 0, 0, 0).
     */
    get padding(): vec4 {
        return this._padding;
    }

    /**
     * Stets the padding per tile in CSS order: top, right, bottom, left.
     * The standard is (0, 0, 0, 0).
     */
    set padding(padding: vec4) {
        if (this._padding !== padding) {
            this._padding = padding;
            this._valid = false;
        }
    }

    /**
     * Returns the selected IterationAlgorithm which determines the order
     * in which the tiles are rendered.
     * The default is TiledRenderer.IterationAlgorithm.ScanLine.
     */
    get algorithm(): TiledRenderer.IterationAlgorithm {
        return this._algorithm;
    }

    /**
     * Sets the selected IterationAlgorithm which determines the order
     * in which the tiles are rendered.
     * The default is TiledRenderer.IterationAlgorithm.ScanLine.
     * If needed, it automatically adjusts the tileSize to match the new algorithm.
     */
    set algorithm(algorithm: TiledRenderer.IterationAlgorithm) {
        if (this._algorithm !== algorithm) {
            this._algorithm = algorithm;
            if (!this.checkIterationAlgorithmConstraints()) {
                this.adjustTileSizeToMatchIterationAlgorithm();
            }
            this._valid = false;
        }
    }
}

/**
 * The enum that is used to select one of the different the IterationAlgorithms.
 */
export namespace TiledRenderer {

    export enum IterationAlgorithm {
        ScanLine = 'scanline',
        /**
         * ScanLine conditions: none.
         */
        HilbertCurve = 'hilbertcurve',
        /**
         * HilbertCurve conditions: Both numberOfXTiles, numberOfYTiles need to be equal and need to be a power of two.
         */
    }
}
