
import { assert, log, LogLevel } from './auxiliaries';

import { Context } from './context';

export type FramePrecisionString = 'float' | 'half' | 'byte' | 'auto';


/**
 * This wizard provides means for non-trivial, context specific framebuffer setups, texture formats, etc.
 */
export class Wizard {

    /**
     * Queries the internal texture format matching the target format best for the given context. For 'auto' precision
     * the format of maximum accuracy supported is returned.
     * @param context - Wrapped gl context for function resolution (passed to all stages).
     * @param target - Target format, e.g., gl.RGBA, used to find the supported precision/accuracy for.
     * @param precision - Requested precision of the internal format: 'auto', 'float', 'half', 'byte'.
     * @returns - 3-tuple containing the (1) internal format, (2) the type (required for some internal formats to work
     * ...), and (3) the frame precision string that matches the resulting format best.
     */
    static queryInternalTextureFormat(context: Context, target: GLenum,
        precision: FramePrecisionString): [GLenum, GLenum, string] {

        const gl = context.gl;
        const gl2facade = context.gl2facade;

        /**
         * In WebGL1 contexts, OES_texture_float always implies WEBGL_color_buffer_float and OES_texture_half_float
         * implies EXT_color_buffer_half_float.
         */
        const floatWriteSupport = (context.isWebGL1 && context.supportsTextureFloat) ||
            (context.isWebGL2 && context.supportsColorBufferFloat);
        const halfWriteSupport = (context.isWebGL1 && context.supportsTextureHalfFloat) ||
            (context.isWebGL2 && context.supportsColorBufferFloat);

        let query = precision;
        const validPrecisionString = Wizard.validFramePrecisionStrings.indexOf(precision) > -1;
        if (!validPrecisionString) {
            log(LogLevel.Dev, `unknown frame precision '${query}' changed to 'auto'`);
            precision = 'auto';
        }
        if (precision === 'auto') { /* Derive maximum supported write to texture/buffer format. */
            query = floatWriteSupport ? 'float' : halfWriteSupport ? 'half' : 'byte';
        }

        let type: GLenum;
        let internalFormatIndex: GLint; /* Utility index to reduce tuple return logic (see switch). */

        /* Query type and, if required), enable extension. */
        if (query === 'half' && halfWriteSupport) {
            /* tslint:disable-next-line:no-unused-expression */
            context.isWebGL2 ? context.colorBufferFloat : context.textureHalfFloat;
            type = gl2facade.HALF_FLOAT;
            internalFormatIndex = 1;
        } else if ((query === 'float' || query === 'half') && floatWriteSupport) {
            /* If not explicitly requested, fallback for half_float. */
            /* tslint:disable-next-line:no-unused-expression */
            context.isWebGL2 ? context.colorBufferFloat : context.textureFloat;
            type = gl.FLOAT;
            internalFormatIndex = 0;
        } else {
            type = gl.UNSIGNED_BYTE;
            internalFormatIndex = 2;
        }

        /* In this case, no specialized internal formats are available. */
        if (context.isWebGL1) {
            return [target, type, query];
        }

        switch (target) {
            case gl.RGBA:
                return [[gl.RGBA32F, gl.RGBA16F, gl.RGBA8][internalFormatIndex], type, query];
            case gl.RGB:
                return [[gl.RGB32F, gl.RGB16F, gl.RGB8][internalFormatIndex], type, query];
            default:
                assert(false, `internal format querying is not yet supported for formats other than RGBA, RGB`);
        }
        return [gl.NONE, gl.NONE, query];
    }

}

export namespace Wizard {

    /**
     * At run-time, we cannot check string validity using a string literal type conversion. Thus this array is used to
     * check whether a frame precision string is known or unknown.
     */
    export const validFramePrecisionStrings = ['float', 'half', 'byte', 'auto'];

}
