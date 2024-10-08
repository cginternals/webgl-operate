
/* spellchecker: disable */

import { mat4, quat, vec2, vec3 } from 'gl-matrix';

import { gl_matrix_extensions } from './gl-matrix-extensions';

import { CameraModifier } from './cameramodifier';

/* spellchecker: enable */


/**
 * Math for camera rotation based on the trackball metaphor. The rotation computed by an initial (@see startRotate) and
 * subsequent (@see updateRotate) event points and can be applied to a camera via an explicit update (@see update).
 */
export class TrackballModifier extends CameraModifier {

    protected static readonly DEFAULT_SENSITIVITY = 0.002;


    /**
     * Current rotation matrix.
     */
    protected _rotation: mat4 = mat4.create();

    /** @see {@link sensitivity} */
    protected _sensitivity: number = TrackballModifier.DEFAULT_SENSITIVITY;


    /**
     * Initiate a new trackball rotation at a specific event position.
     * @param point - Position of the current event to start the trackball rotation at.
     */
    initiate(point: vec2): void {
        /* Retrieve initial event position. */
        this._initialPoint = point;
    }

    /**
     * Update the trackball rotation w.r.t. a specific event position.
     * @param point - Position of the current event to continue/update the trackball rotation at.
     */
    process(point: vec2): void {
        /* Retrieve current event positions. */
        this._currentPoint = point;

        const magnitudes = vec2.subtract(gl_matrix_extensions.v2(), this._initialPoint, this._currentPoint);
        vec2.scale(magnitudes, magnitudes, window.devicePixelRatio * this._sensitivity);

        /* Rotation uses difference between two events, thus, initial position is reset. */
        vec2.copy(this._initialPoint, this._currentPoint);

        /* Create rotation with respect to arbitrary camera center and up vector. */
        const centerToEye = vec3.sub(gl_matrix_extensions.v3(), this._reference.eye, this._reference.center);
        vec3.normalize(centerToEye, centerToEye);
        const up = vec3.normalize(gl_matrix_extensions.v3(), this._reference.up);

        /* Create vertical rotation axis. */
        const ortho = vec3.cross(gl_matrix_extensions.v3(), centerToEye, up);
        vec3.scale(up, up, magnitudes[1]);
        vec3.scale(ortho, ortho, magnitudes[0]);

        /* Create overall rotation axis for quaternion based rotation. */
        const axis = vec3.cross(gl_matrix_extensions.v3(), vec3.add(gl_matrix_extensions.v3(), up, ortho), centerToEye);
        vec3.normalize(axis, axis);

        /* Create quaternion and modify rotation transformation. */
        const q = quat.setAxisAngle(quat.create(), axis, vec2.len(magnitudes));
        mat4.multiply(this._rotation, this._rotation, mat4.fromQuat(gl_matrix_extensions.m4(), q));

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
        const T = mat4.fromTranslation(gl_matrix_extensions.m4(), this._reference.center);
        mat4.multiply(T, T, this._rotation);
        mat4.translate(T, T, vec3.negate(gl_matrix_extensions.v3(), this._reference.center));

        const up = vec3.transformMat4(gl_matrix_extensions.v3(), [0.0, 1.0, 0.0], this._rotation);
        const eye = vec3.transformMat4(gl_matrix_extensions.v3(), this._reference.eye, T);

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
