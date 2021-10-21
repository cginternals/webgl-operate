
/* spellchecker: disable */

import { mat4, vec2, vec3 } from 'gl-matrix';

import { m4, v2, v3 } from './gl-matrix-extensions';

import { CameraModifier } from './cameramodifier';

/* spellchecker: enable */


/**
 * Math for camera rotation based on the turntable metaphor. The rotation computed by an initial (@see startRotate) and
 * subsequent (@see updateRotate) event points and can be applied to a camera via an explicit update (@see update).
 * In contrast to the trackball, this metaphor is usually less confusing for non-professionals.
 */
export class TurntableModifier extends CameraModifier {

    protected static readonly DEFAULT_SENSITIVITY = 0.002;


    /**
     * Current rotation matrix.
     */
    protected _rotation: mat4 = m4();

    protected _maxAzimuth: number | undefined = +Math.PI * 0.5 - 1e-4;
    protected _minAzimuth: number | undefined = -Math.PI * 0.5 + 1e-4;

    protected _xAxisScreenSpace = v3();
    protected _azimuth: number;


    /** @see {@link sensitivity} */
    protected _sensitivity: number = TurntableModifier.DEFAULT_SENSITIVITY;


    /**
     * Initiate a new turntable rotation at a specific event position.
     * @param point - Position of the current event to derive the magnitude for rotation from.
     */
    initiate(point: vec2): void {
        Object.assign(this._reference, this._camera);

        /* Retrieve initial event position. */
        this._initialPoint = point;

        const centerToEye = vec3.sub(v3(), this._reference.eye, this._reference.center);
        vec3.normalize(centerToEye, centerToEye);

        this._xAxisScreenSpace = vec3.cross(v3(), [0.0, 1.0, 0.0], centerToEye);
        this._azimuth = Math.acos(vec3.dot(centerToEye, [0.0, 1.0, 0.0]));
        this._azimuth = Math.PI * 0.5 - this._azimuth;
    }

    /**
     * Update the turntable rotation w.r.t. a specific event position.
     * @param point - Position of the current event to derive the magnitude for rotation from.
     */
    process(point: vec2): void {
        /* Retrieve current event positions. */
        this._currentPoint = point;

        const magnitudes = vec2.subtract(v2(), this._initialPoint, this._currentPoint);
        vec2.scale(magnitudes, magnitudes, window.devicePixelRatio * this._sensitivity);

        if (this._minAzimuth !== undefined) {
            magnitudes[1] = Math.min(this._azimuth - this._minAzimuth, magnitudes[1]);
        }
        if (this._maxAzimuth !== undefined) {
            magnitudes[1] = Math.max(this._azimuth - this._maxAzimuth, magnitudes[1]);
        }

        mat4.rotateY(this._rotation, m4(), magnitudes[0]);
        mat4.rotate(this._rotation, this._rotation, magnitudes[1], this._xAxisScreenSpace);

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
        const T = mat4.fromTranslation(m4(), this._reference.center);
        mat4.multiply(T, T, this._rotation);
        mat4.translate(T, T, vec3.negate(v3(), this._reference.center));

        const up = vec3.transformMat4(v3(), [0.0, 1.0, 0.0], this._rotation);
        const eye = vec3.transformMat4(v3(), this._reference.eye, T);

        this._camera.up = up;
        this._camera.eye = eye;
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
