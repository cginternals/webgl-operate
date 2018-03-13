
// from "A Survey of Efficient Representations for Independent Unit Vectors"
// authors: Zina H. Cigolle, Sam Donow, Daniel Evangelakos, Michael Mara, Morgan McGuire, Quirin Meyer
// http://jcgt.org/published/0003/02/01/

// Returns +1 or -1
vec2 signNotZero(const in vec2 v) {
    return vec2(v.x >= 0.0 ? +1.0 : -1.0, v.y >= 0.0 ? +1.0 : -1.0);
}

// Assume normalized input. Output is on [-1, 1] for each component.
vec2 float32x3_to_oct(const in vec3 v) {
    // Project the sphere onto the octahedron, and then onto the xy plane
    vec2 p = v.xy * (1.0 / (abs(v.x) + abs(v.y) + abs(v.z)));
    // Reflect the folds of the lower hemisphere over the diagonals
    p = v.z <= 0.0 ? (1.0 - abs(p.yx)) * signNotZero(p) : p;

    return p * 0.5 + 0.5;
}

vec3 oct_to_float32x3(const in vec2 e) {
    vec2 p = e * 2.0 - 1.0;
    vec3 v = vec3(p.xy, 1.0 - abs(p.x) - abs(p.y));
    if (v.z < 0.0) {
        v.xy = (1.0 - abs(v.yx)) * signNotZero(v.xy);
    }
    return normalize(v);
}
