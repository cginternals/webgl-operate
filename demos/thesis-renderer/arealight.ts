
import { vec3 } from 'gl-matrix';

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
