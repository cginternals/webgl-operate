
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';
import assert = auxiliaries.assert;

import { Context } from './context';

/* spellchecker: enable */


/**
 * This wizard provides means for non-trivial, context specific framebuffer setups, texture formats, etc.
 */
export class Wizard {

    /**
     * Queries the support of internal texture precision given a query precision within the given context.
     * @param context - Wrapped gl context for function resolution (passed to all stages).
     * @param precision - Requested precision of the internal format: 'auto', 'float', 'half', 'byte'.
     * @returns tuple of query, type, and internal format index to reduce tuple return logic (see switch)
     */
    private static queryPrecisionSupport(
        context: Context, precision: Wizard.Precision): [Wizard.Precision, GLenum, GLint] {

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

        if (!(precision in Wizard.Precision)) {
            auxiliaries.log(auxiliaries.LogLevel.Warning, `unknown precision '${query}' changed to '${Wizard.Precision.auto}'`);
            precision = Wizard.Precision.auto;
        }
        if (precision === Wizard.Precision.auto) { /* Derive maximum supported write to texture/buffer format. */
            query = floatWriteSupport ? Wizard.Precision.float : halfWriteSupport ?
                Wizard.Precision.half : Wizard.Precision.byte;
        }

        /* Query type and, if required), enable extension. */
        if (query === Wizard.Precision.half && halfWriteSupport) {
            context.isWebGL2 ? context.colorBufferFloat : context.textureHalfFloat;
            return [query, gl2facade.HALF_FLOAT, 1];

        } else if ((query === Wizard.Precision.float || query === Wizard.Precision.half)
            && floatWriteSupport) {
            /* If not explicitly requested, fallback for half_float. */
            context.isWebGL2 ? context.colorBufferFloat : context.textureFloat;
            return [query, gl.FLOAT, 0];

        } else {
            return [query, gl.UNSIGNED_BYTE, 2];
        }
    }

    /**
     * Queries the internal texture format matching the target format best for the given context. For 'auto' precision
     * the format of maximum accuracy supported is returned.
     * @param context - Wrapped gl context for function resolution (passed to all stages).
     * @param target - Target format, e.g., gl.RGBA, used to find the supported precision/accuracy for.
     * @param precision - Requested precision of the internal format: 'auto', 'float', 'half', 'byte'.
     * @returns - 3-tuple containing the (1) internal format, (2) the type (required for some internal formats to work
     * ...), and (3) the precision enum/string that matches the resulting format best.
     */
    static queryInternalTextureFormat(context: Context, target: GLenum,
        precision: Wizard.Precision = Wizard.Precision.auto): [GLenum, GLenum, Wizard.Precision] {

        const [query, type, internalFormatIndex] = this.queryPrecisionSupport(context, precision);

        const gl = context.gl;

        /* In this case, no specialized internal formats are available. */
        if (context.isWebGL1) {
            assert([gl.RGB, gl.RGBA].includes(target), 'target must be gl.RGB or gl.RGBA in WebGL 1');
            return [target, type, query];
        }

        switch (target) {
            case gl.RGBA:
                return [[gl.RGBA32F, gl.RGBA16F, gl.RGBA8][internalFormatIndex], type, query];
            case gl.RGB:
                return [[gl.RGB32F, gl.RGB16F, gl.RGB8][internalFormatIndex], type, query];
            case gl.RG:
                return [[gl.RG32F, gl.RG16F, gl.RG8][internalFormatIndex], type, query];
            case gl.RED:
                return [[gl.R32F, gl.R16F, gl.R8][internalFormatIndex], type, query];
            default:
                assert(false, `internal format querying is not yet supported for formats other than RGBA, RGB`);
        }
        return [gl.NONE, gl.NONE, query];
    }

}

export namespace Wizard {

    export enum Precision {
        float = 'float',
        half = 'half',
        byte = 'byte',
        auto = 'auto',
    }

}
