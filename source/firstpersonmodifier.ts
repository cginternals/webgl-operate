
import { vec2 } from 'gl-matrix';

import { v2 } from './gl-matrix-extensions';

import { CameraModifier } from './cameramodifier';


/**
 * Math for camera modification based on the first person metaphor.
 */
export class FirstPersonModifier extends CameraModifier {

    protected static readonly DEFAULT_SENSITIVITY = 0.002;


    /** @see {@link sensitivity} */
    protected _sensitivity: number = FirstPersonModifier.DEFAULT_SENSITIVITY;


    /**
     * Initiate a new camera modification at a specific event position.
     * @param point - Position of the current event to start the modification at.
     */
    initiate(point: vec2): void {
        /* Retrieve initial event position. */
        this._initialPoint = point;
    }

    /**
     * Update the ... .r.t. a specific event position.
     * @param point - Position of the current event used to update the yaw and pitch.
     */
    process(point: vec2): void {
        /* Retrieve current event positions. */
        this._currentPoint = point;

        const magnitudes = vec2.subtract(v2(), this._initialPoint, this._currentPoint);
        vec2.scale(magnitudes, magnitudes, window.devicePixelRatio * this._sensitivity);

        /* Difference between two subsequent events, thus, initial position is reset. */
        vec2.copy(this._initialPoint, this._currentPoint);

        console.log(magnitudes);

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
        // const T = mat4.fromTranslation(m4(), this._reference.center);
        // mat4.multiply(T, T, this._rotation);
        // mat4.translate(T, T, vec3.negate(v3(), this._reference.center));

        // const up = vec3.transformMat4(v3(), [0.0, 1.0, 0.0], this._rotation);
        // const eye = vec3.transformMat4(v3(), this._reference.eye, T);

        // this._camera.up = up;
        // this._camera.eye = eye;
    }


    /**
     * Rotational sensitivity.
     */
    set sensitivity(sensitivity: number) {
        this._sensitivity = sensitivity;
    }

    get sensitivity(): number {
        return this._sensitivity;
    }

}
