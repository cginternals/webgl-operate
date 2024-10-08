
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import { gl_matrix_extensions } from './gl-matrix-extensions';

import { CameraModifier } from './cameramodifier';

/* spellchecker: enable */

export class WheelZoomModifier extends CameraModifier {

    protected static readonly DEFAULT_SENSITIVITY = 0.002;

    protected _sensitivity: number = WheelZoomModifier.DEFAULT_SENSITIVITY;

    protected _translation: vec3 = gl_matrix_extensions.v3();

    /**
     * Update the panning transform w.r.t. a specific event position.
     * @param point - Position of the current event to derive the magnitude for translation from.
     */
    process(delta: number): void {
        Object.assign(this._reference, this._camera);

        const magnitude = delta * this._sensitivity;

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
