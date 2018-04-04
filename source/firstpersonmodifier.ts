
import { mat4, vec2, vec3 } from 'gl-matrix';

import { m4, v3 } from './gl-matrix-extensions';

import { CameraModifier } from './cameramodifier';


/**
 * Math for camera modification based on the first person metaphor.
 */
export class FirstPersonModifier extends CameraModifier {

    protected static readonly DEFAULT_SENSITIVITY = 0.0008;


    /**
     * Current rotation matrix.
     */
    protected _rotation: mat4 = mat4.create();

    /** @see {@link sensitivity} */
    protected _sensitivity: number = FirstPersonModifier.DEFAULT_SENSITIVITY;


    /**
     * Initiate a new camera modification at a specific event position.
     * @param point - Position of the current event to start the modification at.
     */
    initiate(point: vec2): void {
        Object.assign(this._reference, this._camera);

        /* Retrieve initial event position. */
        this._initialPoint = point;
    }

    /**
     * Update the ... .r.t. a specific event position.
     * @param point - Position of the current event used to update the yaw and pitch.
     */
    process(point: vec2, movement?: vec2): void {
        /* Current event position is always the same as initial, when pointer lock is active. */
        this._currentPoint = point;

        const magnitudes = vec2.create();
        if (movement === undefined) {
            vec2.subtract(magnitudes, this._initialPoint, this._currentPoint);
        } else {
            vec2.copy(magnitudes, movement);
        }
        vec2.scale(magnitudes, magnitudes, window.devicePixelRatio * this._sensitivity);

        /* Difference between two subsequent events, thus, initial position is reset. */
        vec2.copy(this._initialPoint, this._currentPoint);

        const centerToEye = vec3.sub(v3(), this._reference.eye, this._reference.center);
        vec3.normalize(centerToEye, centerToEye);
        const strafe = vec3.cross(v3(), centerToEye, this._reference.up);

        const yaw = mat4.fromRotation(m4(), -magnitudes[0], this._reference.up);
        const pitch = mat4.fromRotation(m4(), magnitudes[1], strafe);

        mat4.mul(this._rotation, pitch, yaw);

        this.update();
    }

    /**
     * Actually applies the trackball rotation to the given camera.
     */
    update(): void {
        if (this._camera === undefined) {
            return;
        }

        const T = mat4.fromTranslation(m4(), this._reference.eye);
        mat4.multiply(T, T, this._rotation);
        mat4.translate(T, T, vec3.negate(v3(), this._reference.eye));

        // const up = vec3.transformMat4(v3(), [0.0, 1.0, 0.0], this._rotation);
        // const eye = vec3.transformMat4(v3(), this._reference.eye, T);
        const center = vec3.transformMat4(v3(), this._reference.center, T);


        // this._camera.up = up;
        // this._camera.eye = eye;
        this._camera.center = center;

        Object.assign(this._reference, this._camera);
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
