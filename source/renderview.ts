import { mat4, vec3 } from 'gl-matrix';
import { XRViewport } from './webxr';

/**
 * WebXR helper class to hold render configuration per XRView,
 * i.e. per eye for standard VR/AR.
 * NOTE: Optimized to avoid allocations during render loop.
 */
export class RenderView {
    private _cameraPosition = vec3.create();
    private _cameraPositionValid = false; // use extra flag to avoid allocations during render loop
    private _inverseViewMatrix: mat4;

    private _projectionMatrix: mat4;
    get projectionMatrix() {
        return this._projectionMatrix;
    }
    private _viewMatrix: mat4;
    get viewMatrix() {
        return this._viewMatrix;
    }
    private _viewProjectionMatrix: mat4;
    private _viewProjectionMatrixValid = false; // use extra flag to avoid allocations during render loop

    private _viewport: XRViewport;
    get viewport() {
        return this._viewport;
    }

    set(projectionMatrix: Float32Array, viewMatrix: Float32Array, viewport: XRViewport) {
        this._projectionMatrix = projectionMatrix as mat4;
        this._viewMatrix = viewMatrix as mat4;
        this._viewport = viewport;

        this._cameraPositionValid = false;
        this._viewProjectionMatrixValid = false;
    }

    /**
     * Computes camera position from viewMatrix and caches it.
     */
    get cameraPosition(): vec3 {
        if (this._cameraPositionValid) {
            return this._cameraPosition;
        }
        if (!this._inverseViewMatrix) {
            this._inverseViewMatrix = mat4.create();
        }

        this._cameraPosition[0] = 0;
        this._cameraPosition[1] = 0;
        this._cameraPosition[2] = 0;

        mat4.invert(this._inverseViewMatrix, this.viewMatrix);
        vec3.transformMat4(this._cameraPosition, this._cameraPosition, this._inverseViewMatrix);

        this._cameraPositionValid = true;
        return this._cameraPosition;
    }

    /** Computes viewProjection matrix and caches it */
    get viewProjectionMatrix(): Float32Array {
        if (this._viewProjectionMatrixValid) {
            return this._viewProjectionMatrix;
        }
        if (!this._viewProjectionMatrix) {
            this._viewProjectionMatrix = mat4.create();
        }
        mat4.multiply(this._viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);
        this._viewProjectionMatrixValid = true;
        return this._viewProjectionMatrix;
    }
}
