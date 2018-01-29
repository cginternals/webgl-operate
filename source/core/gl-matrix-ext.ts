
import { vec2, vec3, vec4 } from 'gl-matrix';


// GLSL sign https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/sign.xhtml

/**
 * Extract the sign of the parameter.
 *
 * @param x - Value from which to extract the sign.
 *
 * @returns -1.0 if x is less than 0.0, 0.0 if x is equal to 0.0, and +1.0 if x is greater than 0.0.
 */
export function sign(x: number): number {
    return x > 0.0 ? 1.0 : x < 0.0 ? -1.0 : 0.0;
}

// GLSL clamp https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/clamp.xhtml

/**
 * Constrain a value to lie between two further values.
 * ```
 * clamp(+3, +0, +2); // results in +2;
 * ```
 *
 * @param x - The number to clamp.
 * @param min - Minimum number operand.
 * @param max - Maximum number operand.
 *
 * @returns Number constrained to [min,max].
 */
export function clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
}

/**
 * Compute the fractional part of the argument.
 * ```
 * fract(1.23); // results in 0.23
 * ```
 * @param x - The number to compute the fractional part of.
 *
 * @returns The fractional part of x. This is calculated as x - floor(x).
 */
export function fract(x: number): number {
    return x - Math.floor(x);
}


/**
 * A vec2 placeholder to overcome the gl-matrix out interface.
 */
export function v2(): vec2 {
    return vec2.create();
}

/**
 * Constrain a two-component vector to lie between two further two-component vectors.
 * ```
 * let a: vec2 = vec2.fromValues(2, 2);
 * clamp2(a, a, [0, 0], [1, 1]);
 * ```
 *
 * @param out - The receiving vector.
 * @param x - The vector to clamp.
 * @param min - Minimum vector operand.
 * @param max - Maximum vector operand.
 *
 * @returns Vector constrained to [min,max]
 */
export function clamp2(out: vec2, x: vec2 | number[], min: vec2 | number[], max: vec2 | number[]): vec2 {
    out[0] = Math.max(min[0], Math.min(max[0], x[0]));
    out[1] = Math.max(min[1], Math.min(max[1], x[1]));
    return out;
}

/**
 * Derive the absolute values of each of the two vector components.
 * ```
 * let a: vec2 = vec2.fromValues(-2, 2);
 * abs2(a, a); // should result in [2,2]
 * ```
 *
 * @param out - The receiving vector.
 * @param x - The vector to apply abs to.
 *
 * @returns Vector with each component as absolute value.
 */
export function abs2(out: vec2, x: vec2): vec2 {
    out[0] = Math.abs(x[0]);
    out[1] = Math.abs(x[1]);
    return out;
}

/**
 * A vec3 placeholder to overcome the gl-matrix out interface.
 */
export function v3(): vec3 {
    return vec3.create();
}

/**
 * Constrain a three-component vector to lie between two further three-component vectors.
 * ```
 * let a: vec3 = vec3.fromValues(2, 2, 2);
 * clamp3(a, a, [0, 0, 0], [1, 1, 1]);
 * ```
 *
 * @param out -The receiving vector.
 * @param x -The vector to clamp.
 * @param min - Minimum vector operand.
 * @param max - Maximum vector operand.
 *
 * @returns Vector constrained to [min,max].
 */
export function clamp3(out: vec3, x: vec3 | number[], min: vec3 | number[], max: vec3 | number[]): vec3 {
    out[0] = Math.max(min[0], Math.min(max[0], x[0]));
    out[1] = Math.max(min[1], Math.min(max[1], x[1]));
    out[2] = Math.max(min[2], Math.min(max[2], x[2]));
    return out;
}

/**
 * Derive the absolute values of each of the three vector components.
 * ```
 * let a: vec3 = vec3.fromValues(-2, 2, -1);
 * abs3(a, a); // should result in [2,2,1]
 * ```
 *
 * @param out - The receiving vector.
 * @param x - The vector to apply abs to.
 *
 * @returns Vector with each component as absolute value.
 */
export function abs3(out: vec3, x: vec3): vec3 {
    out[0] = Math.abs(x[0]);
    out[1] = Math.abs(x[1]);
    out[2] = Math.abs(x[2]);
    return out;
}

const one256ths: number = 1.0 / 256.0;

export function encode_float24x1_to_uint8x3(out: vec3, x: number): vec3 {
    const v: vec3 = vec3.floor(vec3.create(), vec3.fromValues(
        x * 256.0, fract(x * 256.0) * 256.0, fract(x * 65536.0) * 256.0));
    return vec3.scale(out, v, one256ths);
}

export function decode_float24x1_from_uint8x3(x: vec3): number {
    return (x[0] + (x[1] + x[2] * one256ths) * one256ths) * one256ths;
}


/**
 * Packs a 24bit unsigned int into a three component byte vector.
 * ```
 * let uint8x3: vec3 = vec3.create();
 * encode_uint24_in_rgb8(uint8x3, 250285); // should result in [ 173, 209, 3 ]
 * ```
 *
 * @param out - byte (uint8) vector with packed uint24 data
 * @param x - uint24 number
 *
 * @returns Three component byte vector with x packed.
 */
export function encode_uint24_to_rgb8(out: vec3, x: number): vec3 {
    out[0] = (x >> 0) & 0xFF;
    out[1] = (x >> 8) & 0xFF;
    out[2] = (x >> 16) & 0xFF;
    return out;
}

/**
 * Packs a 32bit unsigned int into a four component byte vector.
 * ```
 * let uint8x4: vec3 = vec4.create();
 * encode_uint24_in_rgb8(uint8x4, 250285); // should result in [ 173, 209, 3, 0 ]
 * ```
 *
 * @param out - byte (uint8) vector with packed uint32 data
 * @param x - uint32 number
 *
 * @returns Three component byte vector with x packed.
 */
export function encode_uint32_to_rgba8(out: vec4, x: number): vec4 {
    out[0] = (x >> 0) & 0xFF;
    out[1] = (x >> 8) & 0xFF;
    out[2] = (x >> 16) & 0xFF;
    out[3] = (x >> 24) & 0xFF;

    return out;
}

/**
 * Unpacks a 24bit unsigned int from a three component byte vector.
 * ```
 * let uint8x3: vec3 = vec3.fromValues(173, 209, 3);
 * decode_uint24_from_rgb8(uint8x3); // should return 250285
 * ```
 *
 * @param x - byte (uint8) vector with packed uint24 data
 *
 * @returns Unpacked 24bit unsigned int.
 */
export function decode_uint24_from_rgb8(x: vec3): number {
    return x[0] + (x[1] << 8) + (x[2] << 16);
}

/**
 * Unpacks a 32bit unsigned int from a four component byte vector.
 * ```
 * let uint8x4: vec4 = vec4.fromValues(173, 209, 3, 23);
 * decode_uint24_from_rgba8(uint8x4); // should return xxx
 * ```
 *
 * @param x - byte (uint8) vector with packed uint32 data
 *
 * @returns Unpacked 32bit unsigned int.
 */
export function decode_uint32_from_rgba8(x: vec4): number {
    return x[0] + (x[1] << 8) + (x[2] << 16) + (x[3] << 24);
}

/**
 * Constructs a vec3 from a vec4 with division by the w component applied.
 * ```
 * const v4: vec4 = vec4.fromValues(2, 4, 6, 2);
 * const v3: vec3 = fromVec4(v4); // v3 is [1, 2, 3]
 * ```
 *
 * @param x - The vector to be transformed to a vec3.
 *
 * @returns Three component vector based on x.
 */
export function fromVec4(x: vec4): vec3 {
    return vec3.fromValues(x[0] / x[3], x[1] / x[3], x[2] / x[3]);
}

/**
 * A vec4 placeholder to overcome the gl-matrix out interface.
 */
export function v4(): vec4 {
    return vec4.create();
}

/**
 * Constrain a four-component vector to lie between two further four-component vectors.
 * ```
 * let a: vec4 = vec4.fromValues(2, 2, 2, 2);
 * clamp4(a, a, [0, 0, 0, 0], [1, 1, 1, 1]);
 * ```
 *
 * @param out - The receiving vector.
 * @param x - The vector to clamp.
 * @param min - Minimum vector operand.
 * @param max - Maximum vector operand.
 *
 * @returns Vector constrained to [min,max].
 */
export function clamp4(out: vec4, x: vec4 | number[], min: vec4 | number[], max: vec4 | number[]): vec4 {
    out[0] = Math.max(min[0], Math.min(max[0], x[0]));
    out[1] = Math.max(min[1], Math.min(max[1], x[1]));
    out[2] = Math.max(min[2], Math.min(max[2], x[2]));
    out[3] = Math.max(min[3], Math.min(max[3], x[3]));
    return out;
}

/**
 * Derive the absolute values of each of the four vector components.
 * ```
 * let a: vec4 = vec4.fromValues(-2, 2, -1, 1);
 * abs4(a, a); // should result in [2,2,1,1]
 * ```
 *
 * @param out - The receiving vector.
 * @param x - The vector to apply abs to.
 *
 * @returns Vector with each component as absolute value.
 */
export function abs4(out: vec4, x: vec4): vec4 {
    out[0] = Math.abs(x[0]);
    out[1] = Math.abs(x[1]);
    out[2] = Math.abs(x[2]);
    out[3] = Math.abs(x[3]);
    return out;
}

/**
 * Constructs a vec4 from a vec3 by appending 1.0 as the w component.
 * ```
 * const v3: vec3 = vec3.fromValues(2, 4, 6);
 * const v4: vec4 = fromVec3(v3); // v3 is [2, 4, 6, 1]
 * ```
 *
 * @param x - The vector to be transformed to a vec4.
 *
 * @returns Four component vector based on x.
 */
export function fromVec3(x: vec3): vec4 {
    return vec4.fromValues(x[0], x[1], x[2], 1.0);
}

/**
 * Parses a vec2 from a string.
 *
 * @param v2str - String in the format '<number>, <number>', e.g., '1.0, 0.0'.
 *
 * @returns Vec2 if string was parsed successfully, undefined else.
 */
export function parseVec2(v2str: string): vec2 | undefined {
    if (v2str === undefined) {
        return undefined;
    }

    let v2 = vec2.create();
    try {
        v2 = vec2.clone(JSON.parse(`[${v2str}]`));
    } catch (error) {
        return undefined;
    }
    return v2;
}

/**
 * Parses a vec3 from a string.
 *
 * @param v3str - String in the format '<number>, <number>, <number>', e.g., '1.0, 0.0, 1.0'.
 *
 * @returns Vec3 if string was parsed successfully, undefined else.
 */
export function parseVec3(v3str: string): vec3 | undefined {
    if (v3str === undefined) {
        return undefined;
    }

    let v3 = vec3.create();
    try {
        v3 = vec3.clone(JSON.parse(`[${v3str}]`));
    } catch (error) {
        return undefined;
    }
    return v3;
}

/**
 * Parses a vec4 from a string.
 *
 * @param v4str - String in the format '<number>, <number>, <number>, <number>', e.g., '1.0, 0.0, 0.0, 0.0'.
 *
 * @returns Vec4 if string was parsed successfully, undefined else.
 */
export function parseVec4(v4str: string): vec4 | undefined {
    if (v4str === undefined) {
        return undefined;
    }

    let v4 = vec4.create();
    try {
        v4 = vec4.clone(JSON.parse(`[${v4str}]`));
    } catch (error) {
        return undefined;
    }
    return v4;
}

/**
 * Performs a GLSL mix.
 *
 * @param value1 - The first value.
 * @param value2 - The second value.
 * @param interpolation - The interpolation value (usually between 0 and 1).
 *
 * @return The interpolated value between value1 and value2.
 */
export function mix(value1: number, value2: number, interpolation: number)
    : number {
    return value1 * (1.0 - interpolation) + value2 * interpolation;
}
