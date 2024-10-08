
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';
import assert = auxiliaries.assert;

import { Context } from './context';

/* spellchecker: enable */

let types: Array<GLenum>;
const byteSizesByFormatAndContext = new Map<Context, Map<GLenum, GLsizei>>();

/**
 * Utility to verify that a given WebGL texture format is not a WebGL type.
 * @param context - Context to check format in.
 * @param format - Format to be check for type.
 */
function isType(context: Context, format: GLenum): boolean {

    const gl = context.gl;
    const gl2facade = context.gl2facade;

    if (format === undefined) {
        return false;
    }

    if (types === undefined) {
        const UNSIGNED_INT_24_8_WEBGL = context.supportsDepthTexture ?
            context.depthTexture.UNSIGNED_INT_24_8_WEBGL : undefined;

        types = new Array<GLenum>(
            gl.UNSIGNED_BYTE,
            gl.UNSIGNED_SHORT_5_6_5,
            gl.UNSIGNED_SHORT_4_4_4_4,
            gl.UNSIGNED_SHORT_5_5_5_1,
            gl.UNSIGNED_SHORT,
            gl.UNSIGNED_INT,
            UNSIGNED_INT_24_8_WEBGL,
            gl.FLOAT,
            gl2facade.HALF_FLOAT,
            gl.BYTE,
            gl.SHORT,
            gl.INT,
            gl.HALF_FLOAT,
            gl.UNSIGNED_INT_2_10_10_10_REV,
            gl.UNSIGNED_INT_10F_11F_11F_REV,
            gl.UNSIGNED_INT_5_9_9_9_REV,
            gl.UNSIGNED_INT_24_8,
            gl.FLOAT_32_UNSIGNED_INT_24_8_REV,
        );
    }

    return types.indexOf(format) > -1;
}

/**
 * Creates a context specific mapping of webgl format enums to byte sizes (cached).
 * @param context - Context to create or return Format enums to byte size mapping.
 */
function byteSizes(context: Context): Map<GLenum, GLsizei> {

    if (byteSizesByFormatAndContext.has(context)) {
        return byteSizesByFormatAndContext.get(context)!;
    }

    const gl = context.gl;
    const byteSizesByFormat = new Map<GLenum, GLsizei>([

        [gl.ALPHA, 1],
        [gl.LUMINANCE, 1],
        [gl.R8, 1],
        [gl.R8I, 1],
        [gl.R8UI, 1],
        [gl.STENCIL_INDEX8, 1],
        //
        [gl.DEPTH_COMPONENT16, 2],
        [gl.LUMINANCE_ALPHA, 2],
        [gl.R16F, 2],
        [gl.R16I, 2],
        [gl.R16UI, 2],
        [gl.RG8, 2],
        [gl.RG8I, 2],
        [gl.RG8UI, 2],
        [gl.RGB565, 2],
        [gl.RGB5_A1, 2],
        [gl.RGBA4, 2],

        [gl.DEPTH_COMPONENT24, 3],
        [gl.RGB, 3],
        [gl.RGB8, 3],
        [gl.RGB8UI, 3],
        [gl.SRGB, 3],
        [gl.SRGB8, 3],

        [gl.DEPTH24_STENCIL8, 4],
        [gl.DEPTH_COMPONENT32F, 4],
        [gl.R11F_G11F_B10F, 4],
        [gl.R32F, 4],
        [gl.R32I, 4],
        [gl.R32UI, 4],
        [gl.RG16F, 4],
        [gl.RG16I, 4],
        [gl.RG16UI, 4],
        [gl.RGB10_A2, 4],
        [gl.RGB10_A2UI, 4],
        [gl.RGB9_E5, 4],
        [gl.RGBA, 4],
        [gl.RGBA8, 4],
        [gl.RGBA8I, 4],
        [gl.RGBA8UI, 4],
        [gl.SRGB8_ALPHA8, 4],
        [gl.SRGB_ALPHA, 4],
        [gl.SRGB_ALPHA8, 4],
        [gl.SRGB_APLHA8, 4], // https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/texStorage2

        [gl.DEPTH32F_STENCIL8, 5],

        [gl.RGB16F, 6],

        [gl.RG32F, 8],
        [gl.RG32I, 8],
        [gl.RG32UI, 8],
        [gl.RGBA16F, 8],
        [gl.RGBA16I, 8],
        [gl.RGBA16UI, 8],

        [gl.RGB32F, 12],

        [gl.RGBA32F, 16],
        [gl.RGBA32I, 16],
        [gl.RGBA32UI, 16],
    ]);

    if (context.isWebGL1 && context.supportsSRGB) {
        byteSizesByFormat.set(context.sRGB.SRGB_EXT, 3);
        byteSizesByFormat.set(context.sRGB.SRGB_ALPHA_EXT, 4);
        byteSizesByFormat.set(context.sRGB.SRGB8_ALPHA8_EXT, 4);
    }
    if (context.supportsColorBufferFloat) {
        byteSizesByFormat.set(context.colorBufferFloat.RGB32F_EXT, 12);
        byteSizesByFormat.set(context.colorBufferFloat.RGBA32F_EXT, 16);
    }

    byteSizesByFormatAndContext.set(context, byteSizesByFormat);
    return byteSizesByFormat;
}

/**
 * Provides the size in bytes of certain WebGL format enumerator. Please note that some byte sizes might vary based on
 * context attributes or the bound render, thus, DEPTH_COMPONENT and DEPTH_STENCIL are not covered by this function.
 * This function does NOT cover data types that are usually on CPU side, not GPU, e.g., UNSIGNED_BYTE,
 * UNSIGNED_SHORT_5_6_5, HALF_FLOAT, UNSIGNED_SHORT, FLOAT, etc. and will assert when provided with types.
 * @param context - The OpenGL context.
 * @param format - Format identifier of the target internal OpenGL data type.
 * @returns - The size in bytes of one type instance on the GPU.
 */
export function byteSizeOfFormat(context: Context, format: GLenum): number {
    const gl = context.gl;

    if (format === undefined) {
        assert(false, `expected given format to be defined`);
        return 0;
    }

    if (isType(context, format)) {
        assert(false, `expected format instead of type ${format}`);
        return 0;
    }

    if (format === gl.DEPTH_COMPONENT || format === gl.DEPTH_STENCIL) {
        assert(false, `byte size of DEPTH_COMPONENT or DEPTH_STENCIL formats depends on active render buffer`);
        return 0;
    }

    const byteSizesByFormat = byteSizes(context);

    const result = byteSizesByFormat.get(format);
    assert(result !== undefined, `size of format ${format} is unknown`);

    return result ? result : 0;
}
