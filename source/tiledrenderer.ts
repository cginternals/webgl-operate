import { mat4, vec3, vec4 } from 'gl-matrix';
import { log, LogLevel } from './auxiliaries';
import { Camera } from './camera';
import { m4 } from './gl-matrix-extensions';


export class TiledRenderer {

    // make all configurations to properties like in the camera
    // and add the comments and only overwrite values if they are new
    // no constructor
    // iteration per enum (see camera)
    // add update call for index
    //

    // look for jsDoc code example integration (see: texture2d)
    /**
     * tiledRendere = new TiledRenderer();
     * tiledRenderer.sourceCamera = camera;
     * tiledRenderer.sourceViewportSize = canvSiz;
     * tiledRenderer.tileSize = [128, 128];
     * tiledRenderer.padding = vec4(); //TODO needs change: in css order: top, right, bottom, left
     * tileCamera = tileRendere.camera;
     * tileRenderer.algorithm = TileRenderer.IteratorAlgorithm.ScanLine;
     * offset;
     * variant 1:
     * for (let i = 0; i < tileRenderer.numberOfTiles(); ++i){
     *      tiledRenderer.tile = i; // property
     *      tiledRenderer.update();
     *      offset = tileRenderer.offset;
     *      "render"
     * }
     * variant 2:
     * while(tileRender.nextTile()){
     *      "render"
     * }
     */

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

    protected getTileIndexOfLinearAlgorithm(): number {
        if (this.algorithm === TiledRenderer.IterationAlgorithm.ScanLine) {
            return this.tile;
        } else if (this.algorithm === TiledRenderer.IterationAlgorithm.HilbertCurve) {
            return this.convertTileIndexFromHilbertToScanLine();
        } else {
            return 0;
        }
    }

    protected convertTileIndexFromHilbertToScanLine(): number {
        const recursionDepth = this.numberOfXTiles();
        const coordinates = this.hilbertToScanLine(recursionDepth, this.tile);
        return coordinates[0] + coordinates[1] * this.numberOfXTiles();
    }

    protected hilbertToScanLine(maxDepth: number, tileIndex: number): [number, number] {
        // indices: x = 0, y = 1
        const rotationVals: [number, number] = [0, 0];
        const coordinates: [number, number] = [0, 0];
        for (let recursionDepth = 1; recursionDepth < maxDepth; recursionDepth *= 2) {
            rotationVals[0] = 1 & (tileIndex / 2);
            rotationVals[1] = 1 & (tileIndex ^ rotationVals[0]);
            this.hilbertCurveRotation(recursionDepth, coordinates, rotationVals);
            coordinates[0] += recursionDepth * rotationVals[0];
            coordinates[1] += recursionDepth * rotationVals[1];
            tileIndex = Math.floor(tileIndex / 4);
        }
        return coordinates;
    }

    protected hilbertCurveRotation(n: number, coordinates: [number, number], rotationVals: [number, number]): void {
        if (rotationVals[1] === 0) {
            if (rotationVals[0] === 1) {
                // Mirror x, y-coordinates
                coordinates[0] = (n - 1) - coordinates[0];
                coordinates[1] = (n - 1) - coordinates[1];
            }
            // Swap x, y-coordinates
            const temp = coordinates[0];
            coordinates[0] = coordinates[1];
            coordinates[1] = temp;
        }
    }

    protected getPaddedTileSize(): [number, number] {
        return [this.padding[1] + this.padding[3] + this.tileSize[0],
        this.padding[0] + this.padding[2] + this.tileSize[1]];
    }

    protected checkIterationAlgorithmConstraints(): boolean {
        if (this.algorithm === TiledRenderer.IterationAlgorithm.ScanLine) {
            if (this._sourceViewPort && this._tileSize) {
                if (this.numberOfXTiles() % 2 === 1 || this.numberOfYTiles() % 2 === 1
                    || this.numberOfXTiles() !== this.numberOfYTiles()) {
                    return false;
                }
            }
        }
        return true;

    }

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
        console.log(this.hilbertToScanLine(2, 0));
        console.log(this.hilbertToScanLine(2, 1));
        console.log(this.hilbertToScanLine(2, 2));
        console.log(this.hilbertToScanLine(2, 3));
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

    set sourceViewPort(viewport: [number, number]) {
        if (this._sourceViewPort !== viewport) {
            this._sourceViewPort = viewport;
            if (!this.checkIterationAlgorithmConstraints()) {
                this.adjustTileSizeToMatchIterationAlgorithm();
            }
            this._valid = false;
        }
    }

    get tileSize(): [number, number] {
        if (this._tileSize) {
            return this._tileSize;
        } else {
            return [-1, -1];
        }
    }

    set tileSize(tileSize: [number, number]) {
        if (this._tileSize !== tileSize) {
            this._tileSize = tileSize;
            if (!this.checkIterationAlgorithmConstraints()) {
                this.adjustTileSizeToMatchIterationAlgorithm();
            }
            this._valid = false;
        }
    }

    get padding(): vec4 {
        return this._padding;
    }

    set padding(padding: vec4) {
        if (this._padding !== padding) {
            this._padding = padding;
            this._valid = false;
        }
    }

    get algorithm(): TiledRenderer.IterationAlgorithm {
        return this._algorithm;
    }

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

export namespace TiledRenderer {

    export enum IterationAlgorithm {
        ScanLine = 'scanline',
        HilbertCurve = 'hilbertcurve',
    }
}
