
import { vec3 } from 'gl-matrix';

// tslint:disable:max-classes-per-file

export class SphereLight {
    public center: vec3;
    public radius: number;
    public luminance: vec3;

    constructor(center: vec3, radius: number, luminance: vec3) {
        this.center = center;
        this.radius = radius;
        this.luminance = luminance;
    }
}

export class DiskLight {
    public center: vec3;
    public radius: number;
    public luminance: vec3;
    public direction: vec3;

    constructor(center: vec3, radius: number, luminance: vec3, direction: vec3) {
        this.center = center;
        this.radius = radius;
        this.luminance = luminance;
        this.direction = direction;
    }
}
