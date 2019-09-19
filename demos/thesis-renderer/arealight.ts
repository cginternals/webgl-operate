
import { vec3 } from 'gl-matrix';

export class SphereLight {
    public center: vec3;
    public radius: number;
    public intensity: vec3;

    constructor(center: vec3, radius: number, intensity: vec3) {
        this.center = center;
        this.radius = radius;
        this.intensity = intensity;
    }
}
