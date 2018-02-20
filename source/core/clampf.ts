
import { vec3, vec4 } from 'gl-matrix';
import { clamp, clamp3, clamp4 } from './gl-matrix-extensions';

import { log_if, LogLevel } from './auxiliaries';


namespace gl_clampf {

    /**
     * Auxiliary 3-tuple of GLclampf values to prevent export of gl-matrix vec3 to the public API.
     */
    export type GLclampf3 = [GLclampf, GLclampf, GLclampf];

    /**
     * Auxiliary 4-tuple of GLclampf values to prevent export of gl-matrix vec4 to the public API.
     */
    export type GLclampf4 = [GLclampf, GLclampf, GLclampf, GLclampf];

    /**
     * Auxiliary 5-tuple of GLclampf values.
     */
    export type GLclampf5 = [GLclampf, GLclampf, GLclampf, GLclampf, GLclampf];


    /**
     * Clamps a single GLclampf value to the range [0.0, 1.0]. If clamping is necessary, a user-level message will
     * be logged to console.
     * @param value - Single GLclampf value to clamp to range[0.0, 1.0].
     * @param semantic - String describing the value's semantic, used for the user-level log message.
     * @returns - Clamped value.
     */
    export function clampf(value: GLclampf, semantic?: string): GLclampf {
        const valueV1 = clamp(value, 0.0, 1.0);
        log_if(semantic !== undefined && value < 0.0 || value > 1.0, LogLevel.User
            , `${semantic} clamped to [${valueV1}] | given [${value}]`);
        return valueV1;
    }

    /**
     * Clamps each GLclampf value of a 3-tuple to the range [0.0, 1.0]. If clamping is necessary, a user-level message
     * will be logged to console.
     * @param tuple - 3-tuple of GLclampf values, each to be clamped to range[0.0, 1.0].
     * @param semantic - String describing the tuple's semantic, used for the user-level log message.
     * @returns - Clamped tuple.
     */
    export function clampf3(tuple: GLclampf3, semantic?: string): GLclampf3 {
        const tupleV3: vec3 = vec3.fromValues(tuple[0], tuple[1], tuple[2]);
        if (tuple[0] < 0.0 || tuple[0] > 1.0 || tuple[1] < 0.0 || tuple[1] > 1.0 || tuple[2] < 0.0 || tuple[2] > 1.0) {
            clamp3(tupleV3, tupleV3, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(1.0, 1.0, 1.0));
            log_if(semantic !== undefined, LogLevel.User, `${semantic} clamped to [${tupleV3}] | given [${tuple}]`);
        }
        return [tupleV3[0], tupleV3[1], tupleV3[2]];
    }

    /**
     * Clamps each GLclampf value of a 4-tuple to the range [0.0, 1.0]. If clamping is necessary, a user-level message
     * will be logged to console.
     * @param tuple - 4-tuple of GLclampf values, each to be clamped to range[0.0, 1.0].
     * @param semantic - String describing the tuple's semantic, used for the user-level log message.
     * @returns - Clamped tuple.
     */
    export function clampf4(tuple: GLclampf4, semantic?: string): GLclampf4 {
        const tupleV4: vec4 = vec4.fromValues(tuple[0], tuple[1], tuple[2], tuple[3]);
        if (tuple[0] < 0.0 || tuple[0] > 1.0 || tuple[1] < 0.0 || tuple[1] > 1.0 ||
            tuple[2] < 0.0 || tuple[2] > 1.0 || tuple[3] < 0.0 || tuple[3] > 1.0) {
            clamp4(tupleV4, tupleV4, vec4.fromValues(0.0, 0.0, 0.0, 0.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0));
            log_if(semantic !== undefined, LogLevel.User, `${semantic} clamped to [${tupleV4}] | given [${tuple}]`);
        }
        return [tupleV4[0], tupleV4[1], tupleV4[2], tupleV4[3]];
    }

}

export = gl_clampf;
