

/** Namespace that comprises extensions by WebGL version (also cleans up documentation). */
export namespace extensions {

    /**
     * All extensions specified for WebGL. This array is used to verify extension queries in WebGL contexts. Most of
     * these extensions should not be queried in WebGL2.
     */
    export const WEBGL1_EXTENSIONS: Array<string> = [

        'ANGLE_instanced_arrays',

        'EXT_blend_minmax',
        'EXT_color_buffer_half_float',
        'EXT_disjoint_timer_query',
        'EXT_frag_depth',
        'EXT_sRGB',
        'EXT_shader_texture_lod',
        'EXT_texture_filter_anisotropic',

        'OES_element_index_uint',
        'OES_standard_derivatives',
        'OES_texture_float',
        'OES_texture_float_linear',
        'OES_texture_half_float',
        'OES_texture_half_float_linear',
        'OES_vertex_array_object',

        'WEBGL_color_buffer_float',
        'WEBGL_compressed_texture_astc',
        'WEBGL_compressed_texture_atc',
        'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_pvrtc',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'WEBGL_debug_renderer_info',
        'WEBGL_debug_shaders',
        'WEBGL_depth_texture',
        'WEBGL_draw_buffers',
        'WEBGL_lose_context',
    ];

    /**
     * All extensions specified for WebGL2. This array is used to verify extension queries in WebGL2 contexts.
     */
    export const WEBGL2_EXTENSIONS: Array<string> = [

        'EXT_color_buffer_float',
        'EXT_disjoint_timer_query_webgl2',
        'EXT_texture_filter_anisotropic',

        'OES_texture_float_linear',
        'OES_texture_half_float_linear',

        'WEBGL_compressed_texture_astc',
        'WEBGL_compressed_texture_atc',
        'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_pvrtc',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'WEBGL_debug_renderer_info',
        'WEBGL_debug_shaders',
        'WEBGL_lose_context',
    ];

    /**
     * WebGL extensions that are supported by default in WebGL2.
     */
    export const WEBGL2_DEFAULT_EXTENSIONS: Array<string> = [
        'ANGLE_instanced_arrays',

        'EXT_blend_minmax',
        'EXT_frag_depth',
        'EXT_sRGB',
        'EXT_shader_texture_lod',

        'OES_element_index_uint',
        'OES_standard_derivatives',
        'OES_texture_float',
        'OES_texture_half_float',
        'OES_vertex_array_object',

        'WEBGL_depth_texture',
        'WEBGL_draw_buffers',
    ];

}

export default extensions;
