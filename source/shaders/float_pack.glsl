
const float one255ths = 1.0 / 255.0;

vec3 float24x1_to_uint8x3(const in float f) {
    vec3 uint8x3 = vec3(f, fract(f * 256.0), fract(f * 65536.0));
    return floor(uint8x3 * 256.0) * one255ths;
}

vec4 float24x1_to_uint8x4(const in float f) {
    vec4 uint8x4 = vec4(f, fract(f * 256.0), fract(f * 65536.0), fract(f * 16777216.0));
    return floor(uint8x4 * 256.0) * one255ths;
}

const vec3 premultUint8x3 = vec3(255.0 / 256.0, 255.0 / 65536.0, 255.0 / 16777216.0);
float uint8x3_to_float24x1(const in vec3 v) {
    return dot(v, premultUint8x3); // a1 * b1 + a2 * b2 + a3 * b3  ;)
}

const vec4 premultUint8x4 = vec4(255.0 / 256.0, 255.0 / 65536.0, 255.0 / 16777216.0, 255.0 / 4294967296.0);
float uint8x4_to_float32x1(const in vec4 v) {
    return dot(v, premultUint8x4); // a1 * b1 + a2 * b2 + a3 * b3 + a4 * b4  ;)
}
