import { mat4, vec3 } from 'gl-matrix';
import { log, LogLevel } from './auxiliaries';
import { Camera } from './camera';
import { m4 } from './gl-matrix-extensions';
import { GLsizei2 } from './tuples';


export class TiledRenderer {

    /**
     * The Camera which viewport should be tiled. It is assumed to be constant.
     */
    protected camera: Camera;

    /**
     * A copy of the camera which is used to return the tiled cameras.
     */
    protected tileCamera: Camera;

    /**
     * Determines the padding in pixels for the rendering.
     */
    protected padding: number;

    /**
     * Determines the size of a tile.
     * Index: 0: width = x-coord, 1: height = y-coord.
     */
    protected tileSize: GLsizei2;

    constructor(camera: Camera, tileSize: GLsizei2, padding: number) {
        this.camera = camera;
        this.tileCamera = camera.copy();
        this.tileSize = tileSize;
        this.padding = padding;
    }


    public numberOfXTiles(): number {
        return Math.ceil(this.camera.height / this.tileSize[1]);
    }

    public numberOfYTiles(): number {
        return Math.ceil(this.camera.width / this.tileSize[0]);
    }

    public linearTileAt(index: number): Camera {
        // write an error to the console and return linearTileAt(0) if an invalid index is requested.
        if (this.numberOFTiles() <= index || 0 > index) {
            log(LogLevel.Warning, `index:${index} is out of bounds: ${this.numberOfXTiles()}
                . Returning the first Tile`);
            return this.linearTileAt(0);
        }

        const viewport = this.camera.viewport;

        const tableIndices = [0, 0];
        // TODO irgendwat scheint hier faul zu sein lol...
        tableIndices[0] = index % this.numberOfYTiles();
        tableIndices[1] = index - (Math.floor(index / this.numberOfYTiles())) * this.numberOfYTiles();

        const paddedTileCenter = [0, 0];
        paddedTileCenter[0] = tableIndices[0] * this.tileSize[0] + this.tileSize[0] / 2;
        paddedTileCenter[1] = tableIndices[1] * this.tileSize[1] + this.tileSize[1] / 2;

        const paddedTileCenterNDC = [paddedTileCenter[0] * 2 / viewport[0] - 1
            , paddedTileCenter[1] * 2 / viewport[1] - 1];

        const paddedTileSize = [this.tileSize[0] + this.padding, this.tileSize[1] + this.padding];

        const translationVec = vec3.fromValues(-paddedTileCenterNDC[0] * 2, -paddedTileCenterNDC[1] * 2, 0);

        const scaleVec = vec3.fromValues(viewport[0] / paddedTileSize[0], viewport[1] / paddedTileSize[1], 1);

        const translateMatrix = mat4.translate(m4(), mat4.identity(m4()), translationVec);
        const tileNDCCorrectionMatrix = mat4.scale(m4(), translateMatrix, scaleVec);

        this.tileCamera.postViewProjection = tileNDCCorrectionMatrix;

        return this.tileCamera;

    }

    public numberOFTiles(): number {
        return this.numberOfXTiles() * this.numberOfYTiles();
    }

}
