
/* spellchecker: disable */

import { vec2, vec3, vec4 } from 'gl-matrix';
import { clamp, clamp2, clamp3, clamp4 } from './gl-matrix-extensions';

import { assert, logIf, LogLevel } from './auxiliaries';

/* spellchecker: enable */


namespace tuples {

    /**
     * Auxiliary 2-tuple of GLsizei values.
     */
    export type GLsizei2 = [GLsizei, GLsizei];

    /**
     * Auxiliary 3-tuple of GLsizei values.
     */
    export type GLsizei3 = [GLsizei, GLsizei, GLsizei];

    /**
     * Auxiliary 4-tuple of GLsizei values.
     */
    export type GLsizei4 = [GLsizei, GLsizei, GLsizei, GLsizei];


    /**
     * Auxiliary 2-tuple of GLfloat values.
     */
    export type GLfloat2 = [GLfloat, GLfloat];

    /**
     * Auxiliary 3-tuple of GLfloat values.
     */
    export type GLfloat3 = [GLfloat, GLfloat, GLfloat];

    /**
     * Auxiliary 4-tuple of GLfloat values.
     */
    export type GLfloat4 = [GLfloat, GLfloat, GLfloat, GLfloat];


    /**
     * Auxiliary 3-tuple of GLclampf values.
     */
    export type GLclampf2 = [GLclampf, GLclampf];

    /**
     * Auxiliary 3-tuple of GLclampf values.
     */
    export type GLclampf3 = [GLclampf, GLclampf, GLclampf];

    /**
     * Auxiliary 4-tuple of GLclampf values.
     */
    export type GLclampf4 = [GLclampf, GLclampf, GLclampf, GLclampf];

    /**
     * Auxiliary 5-tuple of GLclampf values.
     */
    export type GLclampf5 = [GLclampf, GLclampf, GLclampf, GLclampf, GLclampf];

    /**
     * Creates a tuple from a array buffer of the same size.
     * @param buffer - Array of two float32 values.
     * @returns - 2-tuple of specified type (GLsizei, GLfloat, or GLclampf).
     */
    export function tuple2<T extends GLsizei | GLclampf | GLfloat>(buffer: Float32Array | vec2): [T, T] {
        assert(buffer.length === 2, `expected length of buffer to be 2, given ${buffer.length}`);
        return [buffer[0] as T, buffer[1] as T];
    }

    /**
     * Creates a tuple from a array buffer of the same size.
     * @param buffer - Array of three float32 values.
     * @returns - 3-tuple of specified type (GLsizei, GLfloat, or GLclampf).
     */
    export function tuple3<T extends GLsizei | GLclampf | GLfloat>(buffer: Float32Array | vec3): [T, T, T] {
        assert(buffer.length === 3, `expected length of buffer to be 3, given ${buffer.length}`);
        return [buffer[0] as T, buffer[1] as T, buffer[2] as T];
    }

    /**
     * Creates a tuple from a array buffer of the same size.
     * @param buffer - Array of four float32 values.
     * @returns - 4-tuple of specified type (GLsizei, GLfloat, or GLclampf).
     */
    export function tuple4<T extends GLsizei | GLclampf | GLfloat>(buffer: Float32Array | vec4): [T, T, T, T] {
        assert(buffer.length === 4, `expected length of buffer to be 4, given ${buffer.length}`);
        return [buffer[0] as T, buffer[1] as T, buffer[2] as T, buffer[3] as T];
    }


    /**
     * Clamps a single GLclampf/GLfloat value to the range [0.0, 1.0]. If clamping is necessary, a user-level message
     * will be logged to console.
     * @param value - Single GLclampf/GLfloat value to clamp to range [0.0, 1.0].
     * @param semantic - String describing the value's semantic, used for the user-level log message.
     * @returns - Clamped value.
     */
    export function clampf(value: GLclampf | GLfloat, semantic?: string): GLclampf | GLfloat {
        const valueV1 = clamp(value, 0.0, 1.0);
        logIf(semantic !== undefined && value < 0.0 || value > 1.0, LogLevel.Info,
            `${semantic} clamped to [${valueV1}], given [${value}]`);
        return valueV1;
    }

    /**
     * Clamps each GLclampf/GLfloat value of a 2-tuple to the range [0.0, 1.0]. If clamping is necessary, a user-level
     * message will be logged to console.
     * @param tuple - 2-tuple of GLclampf/GLfloat values, each to be clamped to range [0.0, 1.0].
     * @param semantic - String describing the tuple's semantic, used for the user-level log message.
     * @returns - Clamped tuple.
     */
    export function clampf2(tuple: GLclampf2 | GLfloat2, semantic?: string): GLclampf2 | GLfloat2 {
        const tupleV2: vec2 = vec2.fromValues(tuple[0], tuple[1]);
        if (tuple[0] < 0.0 || tuple[0] > 1.0 || tuple[1] < 0.0 || tuple[1] > 1.0) {
            clamp2(tupleV2, tupleV2, vec2.fromValues(0.0, 0.0), vec2.fromValues(1.0, 1.0));
            logIf(semantic !== undefined, LogLevel.Info, `${semantic} clamped to [${tupleV2}], given [${tuple}]`);
        }
        return tuple2<typeof tuple[0]>(tupleV2);
    }

    /**
     * Clamps each GLclampf/GLfloat value of a 3-tuple to the range [0.0, 1.0]. If clamping is necessary, a user-level
     * message will be logged to console.
     * @param tuple - 3-tuple of GLclampf/GLfloat values, each to be clamped to range [0.0, 1.0].
     * @param semantic - String describing the tuple's semantic, used for the user-level log message.
     * @returns - Clamped tuple.
     */
    export function clampf3(tuple: GLclampf3 | GLfloat3, semantic?: string): GLclampf3 | GLfloat3 {
        const tupleV3: vec3 = vec3.fromValues(tuple[0], tuple[1], tuple[2]);
        if (tuple[0] < 0.0 || tuple[0] > 1.0 || tuple[1] < 0.0 || tuple[1] > 1.0 || tuple[2] < 0.0 || tuple[2] > 1.0) {
            clamp3(tupleV3, tupleV3, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(1.0, 1.0, 1.0));
            logIf(semantic !== undefined, LogLevel.Info, `${semantic} clamped to [${tupleV3}], given [${tuple}]`);
        }
        return tuple3<typeof tuple[0]>(tupleV3);
    }

    /**
     * Clamps each GLclampf/GLfloat value of a 4-tuple to the range [0.0, 1.0]. If clamping is necessary, a user-level
     * message will be logged to console.
     * @param tuple - 4-tuple of GLclampf/GLfloat values, each to be clamped to range [0.0, 1.0].
     * @param semantic - String describing the tuple's semantic, used for the user-level log message.
     * @returns - Clamped tuple.
     */
    export function clampf4(tuple: GLclampf4 | GLfloat4, semantic?: string): GLclampf4 | GLfloat4 {
        const tupleV4: vec4 = vec4.fromValues(tuple[0], tuple[1], tuple[2], tuple[3]);
        if (tuple[0] < 0.0 || tuple[0] > 1.0 || tuple[1] < 0.0 || tuple[1] > 1.0 ||
            tuple[2] < 0.0 || tuple[2] > 1.0 || tuple[3] < 0.0 || tuple[3] > 1.0) {
            clamp4(tupleV4, tupleV4, vec4.fromValues(0.0, 0.0, 0.0, 0.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0));
            logIf(semantic !== undefined, LogLevel.Info, `${semantic} clamped to [${tupleV4}], given [${tuple}]`);
        }
        return tuple4<typeof tuple[0]>(tupleV4);
    }


    /**
     * Creates a duplicate of a 2-tuple into another tuple.
     * @param tuple - Source tuple to create duplicate of.
     */
    export function duplicate2<T extends GLclampf | GLfloat | GLsizei>(tuple: [T, T]): [T, T] {
        return [tuple[0], tuple[1]];
    }

    /**
     * Creates a duplicate of a 3-tuple into another tuple.
     * @param tuple - Source tuple to create duplicate of.
     */
    export function duplicate3<T extends GLclampf | GLfloat | GLsizei>(tuple: [T, T, T]): [T, T, T] {
        return [tuple[0], tuple[1], tuple[2]];
    }

    /**
     * Creates a duplicate of a 4-tuple into another tuple.
     * @param tuple - Source tuple to create duplicate of.
     */
    export function duplicate4<T extends GLclampf | GLfloat | GLsizei>(tuple: [T, T, T, T]): [T, T, T, T] {
        return [tuple[0], tuple[1], tuple[2], tuple[3]];
    }


    /**
     * Checks whether or not two 2-tuples have identical values.
     * @param tuple0 - First 2-tuple/operand for comparison.
     * @param tuple1 - Second 2-tuple/operand for comparison.
     * @returns - True iff tuples are equal in all two values (in their sequence).
     */
    export function equals2<T extends GLclampf | GLfloat | GLsizei>(t0: [T, T], t1: [T, T]): boolean {
        return t0[0] === t1[0] && t0[1] === t1[1];
    }

    /**
     * Checks whether or not two 3-tuples have identical values.
     * @param tuple0 - First 3-tuple/operand for comparison.
     * @param tuple1 - Second 3-tuple/operand for comparison.
     * @returns - True iff tuples are equal in all three values (in their sequence).
     */
    export function equals3<T extends GLclampf | GLfloat | GLsizei>(t0: [T, T, T], t1: [T, T, T]): boolean {
        return t0[0] === t1[0] && t0[1] === t1[1] && t0[2] === t1[2];
    }

    /**
     * Checks whether or not two 4-tuples have identical values.
     * @param tuple0 - First 4-tuple/operand for comparison.
     * @param tuple1 - Second 4-tuple/operand for comparison.
     * @returns - True iff tuples are equal in all four values (in their sequence).
     */
    export function equals4<T extends GLclampf | GLfloat | GLsizei>(t0: [T, T, T, T], t1: [T, T, T, T]): boolean {
        return t0[0] === t1[0] && t0[1] === t1[1] && t0[2] === t1[2] && t0[3] === t1[3];
    }

}

export = tuples;
