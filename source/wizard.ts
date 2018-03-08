
import { assert } from './auxiliaries';

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
     */
    static queryInternalFormat(context: Context, target: GLenum, precision: FramePrecisionString): GLenum {
        const gl = context.gl;
        assert(target === gl.RGBA, `internal format querying is not yet supported for formats other than RGBA`);

        /**
         * In WebGL1 contexts, OES_texture_float always implies WEBGL_color_buffer_float and OES_texture_half_float
         * implies EXT_color_buffer_half_float.
         */
        const floatWriteSupport = (context.isWebGL1 && context.supportsTextureFloat) ||
            (context.isWebGL2 && context.supportsColorBufferFloat);
        const halfWriteSupport = (context.isWebGL1 && context.supportsTextureHalfFloat) ||
            (context.isWebGL2 && context.supportsColorBufferFloat);

        let query = precision;
        if (precision === 'auto') { /* Derive maximum supported write to texture/buffer format. */
            query = floatWriteSupport ? 'float' : halfWriteSupport ? 'half' : 'byte';
        }

        /* If required, enable extension. */
        if (query === 'half' && halfWriteSupport) {
            /* tslint:disable-next-line:no-unused-expression */
            context.isWebGL2 ? context.colorBufferFloat : context.textureFloat;
            return context.isWebGL2 ? gl.RGBA32F : gl.RGBA;

        } else if ((query === 'float' || query === 'half') && floatWriteSupport) {
            /* If not explicitly requested, fallback for half_float. */
            /* tslint:disable-next-line:no-unused-expression */
            context.isWebGL2 ? context.colorBufferFloat : context.textureHalfFloat;
            return context.isWebGL2 ? gl.RGBA16F : gl.RGBA;

        }
        /* If not explicitly requested, fallback for float. */
        return context.isWebGL2 ? gl.RGBA8 : gl.RGBA;
    }

}
