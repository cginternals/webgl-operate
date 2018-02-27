
import { vec2, vec3, vec4 } from 'gl-matrix';
import { clamp, clamp2, clamp3, clamp4 } from './gl-matrix-extensions';

import { assert, log_if, LogLevel } from './auxiliaries';


namespace tuples {

    /**
     * Auxiliary 2-tuple of GLsizei values.
     */
    export type GLsizei2 = [GLsizei, GLsizei];


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
    export function tuple2<T extends GLsizei | GLclampf | GLfloat>(buffer: Float32Array): [T, T] {
        assert(buffer.length === 2, `expected length of buffer to be 2, given ${buffer}`);
        return [buffer[0] as T, buffer[1] as T];
    }

    /**
     * Creates a tuple from a array buffer of the same size.
     * @param buffer - Array of three float32 values.
     * @returns - 3-tuple of specified type (GLsizei, GLfloat, or GLclampf).
     */
    export function tuple3<T extends GLsizei | GLclampf | GLfloat>(buffer: Float32Array): [T, T, T] {
        assert(buffer.length === 3, `expected length of buffer to be 3, given ${buffer}`);
        return [buffer[0] as T, buffer[1] as T, buffer[2] as T];
    }


    /**
     * Creates a tuple from a array buffer of the same size.
     * @param buffer - Array of four float32 values.
     * @returns - 4-tuple of specified type (GLsizei, GLfloat, or GLclampf).
     */
    export function tuple4<T extends GLsizei | GLclampf | GLfloat>(buffer: Float32Array): [T, T, T, T] {
        assert(buffer.length === 4, `expected length of buffer to be 4, given ${buffer}`);
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
        log_if(semantic !== undefined && value < 0.0 || value > 1.0, LogLevel.User,
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
            log_if(semantic !== undefined, LogLevel.User, `${semantic} clamped to [${tupleV2}], given [${tuple}]`);
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
            log_if(semantic !== undefined, LogLevel.User, `${semantic} clamped to [${tupleV3}], given [${tuple}]`);
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
            log_if(semantic !== undefined, LogLevel.User, `${semantic} clamped to [${tupleV4}], given [${tuple}]`);
        }
        return tuple4<typeof tuple[0]>(tupleV4);
    }

}

export = tuples;
