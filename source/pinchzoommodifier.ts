
/* spellchecker: disable */

import { mat4, vec2, vec3 } from 'gl-matrix';

import { gl_matrix_extensions } from './gl-matrix-extensions';

import { CameraModifier } from './cameramodifier';

/* spellchecker: enable */

export class PinchZoomModifier extends CameraModifier {

    protected static readonly DEFAULT_SENSITIVITY = 2.0;

    protected _sensitivity: number = PinchZoomModifier.DEFAULT_SENSITIVITY;

    protected _initialDistance: number;
    protected _currentDistance: number;

    protected _translation: vec3 = gl_matrix_extensions.v3();

    /**
     * Initiate a new panning at a specific event position.
     * @param point - Position of the current event to derive the magnitude for rotation from.
     */
    initiate(point1: vec2, point2: vec2): void {
        Object.assign(this._reference, this._camera);

        const magnitudes = vec2.subtract(gl_matrix_extensions.v2(), point1, point2);
        this._initialDistance = vec2.length(magnitudes);
    }

    /**
     * Update the panning transform w.r.t. a specific event position.
     * @param point - Position of the current event to derive the magnitude for translation from.
     */
    process(point1: vec2, point2: vec2): void {
        /* Retrieve current event positions. */
        const magnitudes = vec2.subtract(gl_matrix_extensions.v2(), point1, point2);
        this._currentDistance = vec2.length(magnitudes);

        const change = (this._currentDistance / this._initialDistance) - 1.0;
        const magnitude = change * PinchZoomModifier.DEFAULT_SENSITIVITY;

        const eyeToCenter = vec3.sub(gl_matrix_extensions.v3(), this._reference.center, this._reference.eye);
        vec3.normalize(eyeToCenter, eyeToCenter);

        this._translation = vec3.scale(gl_matrix_extensions.v3(), eyeToCenter, magnitude);

        this.update();
    }

    /**
     * Actually applies the trackball rotation to the given camera.
     */
    update(): void {
        if (this._camera === undefined) {
            return;
        }

        /* Adjust for arbitrary camera center and rotate using quaternion based rotation. */
        const T = mat4.fromTranslation(gl_matrix_extensions.m4(), this._translation);

        const eye = vec3.transformMat4(gl_matrix_extensions.v3(), this._reference.eye, T);

        this._camera.eye = eye;
    }

}
