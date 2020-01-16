
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';
import { m4 } from './gl-matrix-extensions';

import { DEG2RAD, log, LogLevel } from './auxiliaries';
import { duplicate2, GLsizei2 } from './tuples';

/* spellchecker: enable */


/**
 * Virtual 3D camera specified by eye, center, up, fovy, near, far, and a viewport size. It provides access to cached
 * view, projection, and view projection matrices. Cached by means of whenever one of the attributes change, all
 * matrices are invalidated and recalculated only once and only when requested. Please note that eye denotes the
 * position in a virtual 3D scene and center denotes the position which is being looked at.
 */
export class Camera {

    private static readonly DEFAULT_EYE: vec3 = vec3.fromValues(0.0, 0.0, 1.0);
    private static readonly DEFAULT_CENTER: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
    private static readonly DEFAULT_UP: vec3 = vec3.fromValues(0.0, 1.0, 0.0);

    private static readonly DEFAULT_FOVY = 45.0;

    private static readonly DEFAULT_NEAR = 2.0;
    private static readonly DEFAULT_FAR = 8.0;


    /** @see {@link eye} */
    protected _eye: vec3;

    /** @see {@link center} */
    protected _center: vec3;

    /** @see {@link up} */
    protected _up: vec3;

    /** @see {@link fovy} */
    protected _fovy = Camera.DEFAULT_FOVY;

    /** @see {@link near} */
    protected _near = Camera.DEFAULT_NEAR;

    /** @see {@link far} */
    protected _far = Camera.DEFAULT_FAR;

    /** @see {@link viewport} */
    protected _viewport: GLsizei2 = [1, 1];

    /** @see {@link aspect} */
    protected _aspect: GLfloat = 1.0;

    /** @see {@link view} */
    protected _view: mat4 | undefined;
    /** @see {@link viewInverse} */
    protected _viewInverse: mat4 | undefined | null;

    /** @see {@link projection} */
    protected _projection: mat4 | undefined;
    /** @see {@link projectionInverse} */
    protected _projectionInverse: mat4 | undefined | null;

    /** @see {@link viewProjection} */
    protected _viewProjection: mat4 | undefined;
    /** @see {@link viewProjectionInverse} */
    protected _viewProjectionInverse: mat4 | undefined | null;

    /** @see {@link altered} */
    protected _altered = false;


    /**
     * Computes a vertical field of view angle based on the display height and distance to eye. Since both parameters
     * are highly dependent of the device, this function can only be used to derive a rough estimate for a reasonable
     * field of view. Note that both parameters should be passed using the same unit, e.g., inch or centimeters.
     * @param elementDisplayHeight - Height of an element on the display.
     * @param eyeToDisplayDistance - Distance from the users eye to that element.
     * @returns - Vertical field of view angle in radian.
     */
    static calculateFovY(elementDisplayHeight: number, eyeToDisplayDistance: number): number {
        return Math.atan(elementDisplayHeight * 0.5 / eyeToDisplayDistance) * 2.0;
    }

    /**
     * Constructor setting up the camera's eye, center and up vectors.
     * @param eye - The viewpoint of the virtual camera
     * @param center - The look-at point in the scene
     * @param up - The up-vector of the virtual camera
     */
    constructor(eye?: vec3, center?: vec3, up?: vec3) {
        this._eye = eye ? vec3.clone(eye) : vec3.clone(Camera.DEFAULT_EYE);
        this._center = center ? vec3.clone(center) : vec3.clone(Camera.DEFAULT_CENTER);
        this._up = up ? vec3.clone(up) : vec3.clone(Camera.DEFAULT_UP);
    }


    /**
     * Invalidates derived matrices, i.e., view, projection, and view-projection. The view should be invalidated on
     * eye, center, and up changes. The projection should be invalidated on fovy, viewport, near, and far changes.
     * The view projection invalidates whenever either one or both view and projection are to be invalidated.
     */
    protected invalidate(invalidateView: boolean, invalidateProjection: boolean): void {
        if (invalidateView) {
            this._view = undefined;
            this._viewInverse = undefined;
        }
        if (invalidateProjection) {
            this._projection = undefined;
            this._projectionInverse = undefined;
        }
        if (invalidateView || invalidateProjection) {
            this._viewProjection = undefined;
            this._viewProjectionInverse = undefined;
        }
        this._altered = true;
    }

    /**
     * Position of the virtual camera in a virtual 3D scene, the point of view.
     */
    get eye(): vec3 {
        return this._eye;
    }

    /**
     * Sets the eye. Invalidates the view.
     */
    set eye(eye: vec3) {
        if (vec3.equals(this._eye, eye)) {
            return;
        }
        this._eye = vec3.clone(eye);
        this.invalidate(true, false);
    }

    /**
     * Look-at point into a virtual 3D scene.
     */
    get center(): vec3 {
        return this._center;
    }

    /**
     * Sets the center. Invalidates the view.
     */
    set center(center: vec3) {
        if (vec3.equals(this._center, center)) {
            return;
        }
        this._center = vec3.clone(center);
        this.invalidate(true, false);
    }

    /**
     * Up-vector of the virtual camera.
     */
    get up(): vec3 {
        return this._up;
    }

    /**
     * Sets the up vector. Invalidates the view.
     */
    set up(up: vec3) {
        if (vec3.equals(this._up, up)) {
            return;
        }
        this._up = vec3.clone(up);
        this.invalidate(true, false);
    }

    /**
     * Vertical field of view in degree.
     */
    get fovy(): GLfloat {
        return this._fovy;
    }

    /**
     * Sets the vertical field-of-view. Invalidates the projection.
     */
    set fovy(fovy: GLfloat) {
        if (this._fovy === fovy) {
            return;
        }
        this._fovy = fovy;
        this.invalidate(false, true);
    }

    /**
     * Distance of near-plane in view coordinates.
     */
    get near(): GLfloat {
        return this._near;
    }

    /**
     * Sets the distance to the near clipping plane. Invalidates the projection.
     */
    set near(near: GLfloat) {
        if (this._near === near) {
            return;
        }
        if (near >= this._far) {
            log(LogLevel.Warning, `near expected to be smaller than far (${this._far}), given ${near}`);
        }
        this._near = near;
        this.invalidate(false, true);
    }

    /**
     * Distance of far-plane in view coordinates.
     */
    get far(): GLfloat {
        return this._far;
    }

    /**
     * Sets the distance to the far clipping plane. Invalidates the projection.
     */
    set far(far: GLfloat) {
        if (this._far === far) {
            return;
        }
        if (this._near >= far) {
            log(LogLevel.Warning, `far expected to be greater than near (${this._near}), given ${far}`);
        }
        this._far = far;
        this.invalidate(false, true);
    }

    /**
     * Sets the viewport size. Invalidates the projection.
     */
    set viewport(size: GLsizei2) {
        if (this._viewport[0] === size[0] && this._viewport[1] === size[1]) {
            return;
        }
        this._viewport = duplicate2<GLsizei>(size);
        this.invalidate(false, true);
    }

    /**
     * The size of the target viewport used to determine the aspect ratio for subsequent perspective matrix projection
     * computation.
     */
    get viewport(): GLsizei2 {
        return this._viewport;
    }

    /**
     * Access to the viewport width.
     */
    get width(): GLsizei {
        return this._viewport[0];
    }

    /**
     * Access to the viewport height.
     */
    get height(): GLsizei {
        return this._viewport[1];
    }

    /**
     * Sets the aspect ratio (width over height). However, this is not derived from viewport to allow for
     * differentiation between viewport size and scale.
     */
    set aspect(aspect: GLfloat) {
        if (this._aspect === aspect) {
            return;
        }
        this._aspect = aspect;
    }

    /**
     * Computes the ratio of width over height (set explicitly for differentiation between viewport size and scale).
     */
    get aspect(): GLfloat {
        return this._aspect;
    }

    /**
     * Either returns the cached view matrix or derives the current one after invalidation and caches it.
     */
    get view(): mat4 {
        if (this._view) { // return cached value
            return this._view;
        }
        this._view = mat4.lookAt(m4(), this._eye, this._center, this._up);
        return this._view;
    }

    /**
     * Either returns the inverse cached view matrix or derives the current one after invalidation and caches it.
     */
    get viewInverse(): mat4 | null {
        if (this._viewInverse !== undefined) { // return cached value
            return this._viewInverse;
        }
        this._viewInverse = mat4.invert(m4(), this.view);
        return this._viewInverse;
    }

    /**
     * Either returns the cached projection matrix or derives the current one after invalidation and caches it.
     */
    get projection(): mat4 {
        if (this._projection) { // return cached value
            return this._projection;
        }
        this._projection = mat4.perspective(m4(), this.fovy * DEG2RAD, this.aspect, this.near, this.far);
        return this._projection;
    }

    /**
     * Either returns the cached inverse projection matrix or derives the current one after invalidation and caches it.
     */
    get projectionInverse(): mat4 | null {
        if (this._projectionInverse !== undefined) { // return cached value
            return this._projectionInverse;
        }
        this._projectionInverse = mat4.invert(m4(), this.projection);
        return this._projectionInverse;
    }

    /**
     * Returns the view projection matrix based on view and projection. This is also cached (since matrix
     * multiplication is involved).
     */
    get viewProjection(): mat4 {
        if (this._viewProjection) { // return cached value
            return this._viewProjection;
        }
        this._viewProjection = mat4.multiply(m4(), this.projection, this.view);
        return this._viewProjection;
    }

    /**
     * Returns the inverse view projection matrix based on view and projection. This is also cached (since matrix
     * multiplication is involved).
     */
    get viewProjectionInverse(): mat4 | null {
        if (this._viewProjectionInverse !== undefined) { // return cached value
            return this._viewProjectionInverse;
        }
        this._viewProjectionInverse = mat4.invert(m4(), this.viewProjection);
        return this._viewProjectionInverse;
    }

    /**
     * Whether or not any other public property has changed. Please note that the alteration status is detached from
     * caching state of lazily computed properties.
     */
    get altered(): boolean {
        return this._altered;
    }

    /**
     * Intended for resetting alteration status.
     */
    set altered(status: boolean) {
        this._altered = status;
    }

}
