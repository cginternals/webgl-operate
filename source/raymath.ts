
/* spellchecker: disable */

import { mat4, vec2, vec3 } from 'gl-matrix';
import { abs2, abs3, sign, v2, v3 } from './gl-matrix-extensions';

import { DEG2RAD } from './auxiliaries';
import { Camera } from './camera';

/* spellchecker: enable */


namespace ray_math {

    /**
     * Lots of variables that represent components of other variables or are transformed.
     * For these I (dl) prefer, e.g.,  _component or _transformation notation
     */
    /* tslint:disable:variable-name */

    /**
     * Computes the intersection point of a given ray and a circle at [0.0, 0.0] and a given radius.
     * @param ray0 - Start point of a ray.
     * @param ray1 - Far point of a ray, used to derive the ray's direction.
     * @param radius - Radius of the circle to test for intersection with.
     * @returns The intersection point of the given ray and a circle, undefined if no intersection exists.
     */
    export function rayCircleIntersection(ray0: vec2, ray1: vec2, radius: number = 1.0): vec2 | undefined {
        const ray_direction = vec2.subtract(v2(), ray1, ray0);
        if (vec2.equals(ray_direction, vec2.fromValues(0.0, 0.0))) {
            return undefined;
        }

        /**
         * This is a default ray circle intersection with common variable names. It's math and math sometimes has no
         * meaning full variable names... (we could use twoTimesDotProductOfRayAndOrigin instead of b, but this is
         * obviously not a good idea :D).
         */
        const a = vec2.squaredLength(ray_direction);
        const b = 2.0 * vec2.dot(ray_direction, ray0);
        const c = vec2.squaredLength(ray0) - radius * radius;

        const delta = b * b - 4.0 * a * c;
        if (delta < 0.0) {
            return undefined;
        }

        /* Compute the two possible intersections and use nearest one. */
        const s = Math.sqrt(delta);
        const t = Math.min((-b + s) / (2.0 * a), (-b - s) / (2.0 * a));
        const intersection = vec2.scale(v2(), ray_direction, t);

        return vec2.add(intersection, intersection, ray0);
    }

    /**
     * Computes the intersection point of a ray starting at a given point and pointing to the center of an axis-aligned
     * square of a given side length.
     * @param point - Starting point used to derive a ray for intersection.
     * @param edgeLength - Side length of the square.
     * @returns - The intersection point of the square and the derived ray.
     */
    export function pointSquareIntersection(point: vec2, edgeLength: number = 1.0): vec2 {
        const a = abs2(v2(), point);
        if (a[0] >= a[1]) { // intersection is with left or right border
            return vec2.fromValues(sign(point[0]) * edgeLength, point[1] / a[0] * edgeLength);
        }
        return vec2.fromValues(point[0] / a[1] * edgeLength, sign(point[1]) * edgeLength);
    }

    /**
     * Computes the intersection of a ray with an axis-aligned square at [0.0, 0.0] with side length of 2 * halfLength.
     * @param ray0 - Start point of a ray.
     * @param ray1 - Far point of a ray, used to derive the ray's direction.
     * @returns - The intersection point of the square and the ray.
     */
    export function raySquareIntersection(ray0: vec2, ray1: vec2, halfLength: number = 1.0): Array<number> {
        const vertices = [vec2.fromValues(-halfLength, +halfLength), vec2.fromValues(-halfLength, -halfLength),
        vec2.fromValues(+halfLength, -halfLength), vec2.fromValues(+halfLength, +halfLength)];

        const intersections = new Array<number>();
        for (let i = 0; i < 4; ++i) {
            const intersection = rayLineIntersection(ray0, ray1, vertices[i], vertices[(i + 1) % 4]);
            if (intersection) {
                intersections.push(intersection[1]);
            }
        }
        return intersections;
    }

    /**
     * Computes the intersection of a ray with a line.
     * @param ray0 - Start point of a ray.
     * @param ray1 - Far point of a ray, used to derive the ray direction.
     * @param line0 - Start point of a line.
     * @param line1 - End point of a line.
     * @returns - If ray intersects, a 2-tuple of intersection point and t (ray0 + t + ray1) is returned.
     */
    export function rayLineIntersection(ray0: vec2, ray1: vec2, line0: vec2, line1: vec2): [vec2, number] | undefined {
        const p = ray0; /* do not write to p (or clone ray0) */
        const r = vec2.sub(v2(), ray1, ray0);

        const q = line0;  /* do not write to q (or clone line0) */
        const s = vec2.sub(v2(), line1, line0);

        const cross_rs = vec2.cross(v3(), r, s)[2];
        if (cross_rs === 0.0) {
            return undefined;
        }

        const qp = vec2.sub(v2(), q, p);
        const u = vec2.cross(v3(), qp, vec2.scale(v2(), r, 1.0 / cross_rs))[2];
        const t = vec2.cross(v3(), qp, vec2.scale(v2(), s, 1.0 / cross_rs))[2];
        if (u < 0.0 || u > 1.0 || t < 0.0) { // } || t > 1.0) { // ray intersects line segment in both directions ...
            return undefined;
        }
        return [vec2.add(v2(), q, vec2.scale(v2(), s, u)), t];
    }

    /**
     * Computes the intersection point of a given ray and a given plane (rooted at [ 0, 0, 0 ]).
     * t = -(dot(plane.xyz, origin) + plane.w) / dot(plane.xyz, ray);
     * The ray intersects when (t > 0.0) && (t < tm) is true.
     * @param ray0 - Start point of a ray.
     * @param ray1 - Far point of a ray, used to derive the ray direction.
     * @param origin - Point on a plane with origin [ 0, 0, 0 ].
     * @param normal - Normal of the plane with origin [ 0, 0, 0 ].
     * @returns - If ray intersects, the intersection point on the plane if the plane was hit.
     */
    export function rayPlaneIntersection(ray0: vec3, ray1: vec3
        , origin: vec3 = [0.0, 0.0, 0.0], normal: vec3 = [0.0, 1.0, 0.0]): vec3 | undefined {

        const ray_direction = vec3.normalize(v3(), vec3.subtract(v3(), ray1, ray0));

        /* Intersect with plane in point normal form. */
        const rdDotN: number = vec3.dot(ray_direction, normal);

        /* Constrain the intersection to rays that point from front to back with respect to the plane. */
        if (vec3.equals(ray_direction, [0, 0, 0]) || rdDotN >= 0.0) {
            return undefined;
        }

        /* Retrieve point using the ray. */
        const t: number = vec3.dot(vec3.subtract(v3(), origin, ray0), normal) / rdDotN;
        return vec3.add(v3(), vec3.scale(v3(), ray_direction, t), ray0);
    }

    /**
     * Computes the intersection point of a given ray and a given sphere.
     * t = -(dot(plane.xyz, origin) + plane.w) / dot(plane.xyz, ray);
     * The ray intersects when (t > 0.0) && (t < tm) is true.
     * @param ray0 - Start point of a ray.
     * @param ray1 - Far point of a ray, used to derive the ray direction.
     * @param origin - Location of the sphere.
     * @param radius - Radius of the sphere.
     * @returns - If ray intersects, the intersection point on the plane if the plane was hit.
     */
    export function raySphereIntersection(ray0: vec3, ray1: vec3
        , origin: vec3 = vec3.fromValues(0.0, 0.0, 0.0), radius: number = 1.0): vec3 | undefined {

        const rayOriginToSphereCenter = vec3.subtract(v3(), ray0, origin); // o - c
        const ray_direction = vec3.normalize(v3(), vec3.subtract(v3(), ray1, ray0)); // l

        const dot_term = vec3.dot(ray_direction, rayOriginToSphereCenter); // l * (o - c)

        // Note: dot product can be used to compute the squared length of a vector -> gl-matrix supports squaredLength
        // vec3.squaredLength(rayOriginToSphereCenter); // ||o -c||²

        const t = dot_term * dot_term - vec3.squaredLength(rayOriginToSphereCenter) + radius * radius;
        if (t <= 0.0) { // no intersection
            return undefined;
        }
        return vec3.add(v3(), ray0, vec3.scale(v3(), ray_direction, -dot_term - Math.sqrt(t)));
    }

    /**
     * Computes the intersection point of a given ray and a given plane (origin [ 0, 0, 0 ]). The intersection point,
     * however, is constrained to a tube of a given radius. The computation is currently limited to a tube
     * on the plane y = 0 with origin in [0.0, 0.0, 0.0], extending towards [0.0, 1.0, 0.0].
     * @param ray0 - Start point of a ray.
     * @param ray1 - Far point of a ray, used to derive the ray direction.
     * @param radius - Constrain intersection point to be within a tube of this radius.
     * @returns - The intersection point on the plane if the plane was hit, undefined otherwise.
     */
    export function rayPlaneIntersection_tube(ray0: vec3, ray1: vec3, radius: number = 1.0): vec3 | undefined {
        const intersection = rayPlaneIntersection(ray0, ray1);

        if (intersection !== undefined && vec3.length(intersection) < radius) {
            return intersection;
        }

        /* Project the ray start to the y = 0 plane. */
        const ray0_xz = vec2.fromValues(ray0[0], ray0[2]);
        const ray1_xz = vec2.fromValues(ray1[0], ray1[2]);

        const intersection2 = rayCircleIntersection(ray0_xz, ray1_xz, radius);
        return intersection2 ? vec3.fromValues(intersection2[0], 0.0, intersection2[1]) : undefined;
    }

    /**
     * Evaluates whether or not a given point is within a square of a given edge length.
     * @param point - Point to check the within-square-status for.
     * @param halfLength - Half of the side length of the square.
     * @returns - Whether or not the given point is within an axis aligned square at [0.0, 0.0] and edge length.
     */
    export function isPointWithinSquare(point: vec2, halfLength: number = 1.0): boolean {
        const p_abs = abs2(v2(), point);
        return p_abs[0] <= halfLength && p_abs[1] <= halfLength;
    }

    /**
     * Evaluates whether or not a given point is within the NDC-space (normalized device coordinates) after being
     * transformed by a view projection matrix.
     * @param viewProjection - (Model) view projection matrix to transform the point with.
     * @param point - Point that is to be transformed
     * @returns True if the point should be visible (within NDC), false otherwise.
     */
    export function isPointWithinNDC(viewProjection: mat4, point: vec3): boolean {
        const p_transformed = vec3.transformMat4(v3(), point, viewProjection);
        const p_abs = abs3(v3(), p_transformed);
        return p_abs[0] <= 1.0 && p_abs[1] <= 1.0 && p_transformed[2] >= 0.0 && p_transformed[2] <= 1.0;
    }

    /**
     * Computes the shortest distance of a point to a ray (closest point on ray distance).
     * @param ray0 - Start point of a ray.
     * @param ray1 - Far point of a ray, used to derive the ray direction.
     * @param point - Point to compute the distance for.
     * @returns - Distance of the closest point on a ray to a point.
     */
    export function distancePointToRay(ray0: vec3, ray1: vec3, point: vec3): number {
        const ray_direction = vec3.subtract(v3(), ray1, ray0);
        const ray_length = vec3.squaredLength(ray_direction);
        if (ray_length === 0.0) {
            return 0.0;
        }

        const eyeToPoint = vec3.subtract(v3(), point, ray0);
        const theta = vec3.dot(eyeToPoint, ray_direction);
        return theta / ray_length;
    }

    /**
     * Computes a new eye coordinate for the camera that should have the given point within view. The eye is only
     * modified with respect to its distance to the camera's center (on the camera look-at ray).
     * @param camera - Camera as base constraint for the eye movement (only distance to center is changed).
     * @param point - Point to adjust the camera position for.
     * @returns - Eye coordinate for the given camera that should have the given point within view.
     */
    export function eyeWithPointInView(camera: Camera, point: vec3): vec3 {
        const ray_direction = vec3.subtract(v3(), camera.center, camera.eye);
        const ray_normalized = vec3.normalize(v3(), ray_direction);

        /* Retrieve u and v for an orthonormal basis. */
        const ortho_v = vec3.normalize(v3(), vec3.cross(v3(), ray_normalized, camera.up));
        const ortho_u = vec3.normalize(v3(), vec3.cross(v3(), ortho_v, ray_normalized));

        const distance = distancePointToRay(camera.eye, camera.center, point);

        /* Compute the closest point c on the ray. */
        const closest = vec3.add(v3(), camera.eye, vec3.scale(v3(), ray_direction, distance));
        const t = vec3.subtract(v3(), point, closest);
        const part_v = Math.abs(vec3.dot(t, ortho_v)) / camera.aspect;
        const part_u = Math.abs(vec3.dot(t, ortho_u));

        /* Retrieve max distance to camera with required fov. */
        const part_max = Math.max(part_v, part_u);

        /* Require distance from closest to new camera position. */
        const a = part_max / Math.tan(camera.fovy * DEG2RAD * 0.5);
        return vec3.subtract(v3(), closest, vec3.scale(v3(), ray_normalized, a));
    }

}

export = ray_math;
