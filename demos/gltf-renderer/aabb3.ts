import { mat4, vec3 } from 'gl-matrix';

/** An axis aligned bounding box */
export class Aabb3 {
  /**
   * Note: Aabb3 may change the arguments later.
   * Clone them before to avoid unintended side-effects.
   */
  constructor(
    public min: vec3 = vec3.fromValues(+Infinity, +Infinity, +Infinity),
    public max: vec3 = vec3.fromValues(-Infinity, -Infinity, -Infinity),
  ) {}

  /** Transforms this bounding box in place. */
  public transform(matrix: mat4): void {
    const newMin = vec3.fromValues(+Infinity, +Infinity, +Infinity);
    const newMax = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    const point = vec3.create();

    const transformPoint = () => {
      vec3.transformMat4(point, point, matrix);
      vec3.min(newMin, newMin, point);
      vec3.max(newMax, newMax, point);
    };

    vec3.set(point, this.min[0], this.min[1], this.min[2]); // 000
    transformPoint();
    vec3.set(point, this.min[0], this.min[1], this.max[2]); // 001
    transformPoint();
    vec3.set(point, this.min[0], this.max[1], this.min[2]); // 010
    transformPoint();
    vec3.set(point, this.min[0], this.max[1], this.max[2]); // 011
    transformPoint();
    vec3.set(point, this.max[0], this.min[1], this.min[2]); // 100
    transformPoint();
    vec3.set(point, this.max[0], this.min[1], this.max[2]); // 101
    transformPoint();
    vec3.set(point, this.max[0], this.max[1], this.min[2]); // 110
    transformPoint();
    vec3.set(point, this.max[0], this.max[1], this.max[2]); // 111
    transformPoint();

    this.min = newMin;
    this.max = newMax;
  }

  /** The width, height and depth of this box. */
  get size(): vec3 {
    return vec3.sub(vec3.create(), this.max, this.min);
  }

  get center(): vec3 {
    const center = vec3.create();
    vec3.add(center, this.min, this.max);
    return vec3.scale(center, center, 0.5);
  }

  /** Make this box the union of `this` and `other` and returns `this`  */
  public union(other: Aabb3): Aabb3 {
    vec3.min(this.min, this.min, other.min);
    vec3.max(this.max, this.max, other.max);
    return this;
  }

  public clone(): Aabb3 {
    return new Aabb3(vec3.clone(this.min), vec3.clone(this.max));
  }
}
