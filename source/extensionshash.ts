
import { assert } from './auxiliaries';

import { Context } from './context';
import { WEBGL1_EXTENSIONS, WEBGL2_EXTENSIONS } from './extensions';

export class ExtensionsHash {

    protected static readonly WEBGL_BACKENDS: Array<string> = ['webgl1', 'webgl2'];

    protected static readonly WEBGL_EXTENSIONS_BY_BACKEND = new Map<number, Array<string>>([
        [0, WEBGL1_EXTENSIONS],
        [1, WEBGL2_EXTENSIONS],
    ]);

    /**
     * All known WebGL extensions (regardless of WebGL version). When new extensions become known, a new internal
     * version has to be created, comprising all extensions again (some removed, some added w.r.t. previous versions).
     */
    protected static readonly EXTENSIONS_BY_VERSION = new Map<number, Array<string>>([[
        0b000, [
            'ANGLE_instanced_arrays',
            'EXT_blend_minmax',
            'EXT_color_buffer_float',
            'EXT_color_buffer_half_float',
            'EXT_disjoint_timer_query',
            'EXT_disjoint_timer_query_webgl2',
            'EXT_frag_depth',
            'EXT_shader_texture_lod',
            'EXT_sRGB',
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
        ]],
    ]);

    /**
     * Hash versioning is used to account for future, yet unknown/unpublished extensions while maintaining support for
     * existing hashes.
     */
    protected static readonly LATEST_VERSION = 0b000;

    protected static readonly BASE64_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-+';

    /**
     * Encodes a number of bitfield semantics (of 6 bits) into a base64 character.
     * @param base64 - Bitfield of 6 bits (as number).
     */
    protected static encode64(bitfield: number): string {
        assert(bitfield >= 0b000000 && bitfield <= 0b111111,
            `expected bitfield in range [ 0b000000, 0b111111 ], given ${bitfield}`);
        return ExtensionsHash.BASE64_ALPHABET[bitfield];
    }

    /**
     * Decodes a single base64 encoded character to a number of bitfield semantics.
     * @param base64 - Single base64 encoded character (string).
     */
    protected static decode64(base64: string): number {
        assert(base64.length === 1, `expected single base64 character, given '${base64}'`);
        const bitfield = ExtensionsHash.BASE64_ALPHABET.indexOf(base64);
        assert(bitfield > -1, `unknown base64 character, given '${base64}'`);
        return bitfield;
    }

    /**
     * Generates a hash that encodes the contexts webgl backend and extension support. This is intended to be queried
     * whenever support for a given context on a foreign client is due. The hash can be used as masquerade input.
     * @param backend - WebGL backend: 'webgl1' or 'webgl2'.
     * @param supported - Array of supported extensions to be encoded.
     */
    static encode(backend: Context.BackendType, supported: Array<string>): string {
        const version = ExtensionsHash.LATEST_VERSION; // should always be set to the latest version
        const extensions = ExtensionsHash.EXTENSIONS_BY_VERSION.get(version) as Array<string>;

        const backendIndex = ExtensionsHash.WEBGL_BACKENDS.indexOf(backend);
        assert(backendIndex > -1, `expected valid backend ${ExtensionsHash.WEBGL_BACKENDS}, given ${backend} `);

        let hash: string = ExtensionsHash.encode64((version << 3) | (backendIndex + 1));
        if (supported.length === 0) {
            return hash;
        }

        let support = 0b000000;
        for (let i = 0; i < extensions.length; ++i) {
            support |= (supported.indexOf(extensions[i]) > -1 ? 0b100000 >> (i % 6) : 0b0);
            if (i % 6 < 5 && i < extensions.length - 1) {
                continue;
            }
            /* Convert every pack of 6 bits into a base64 encoded string and append it to the hash. */
            hash += ExtensionsHash.encode64(support);
            support = 0b000000;
        }
        return hash;
    }

    /**
     * Decodes a hash into a WebGL backend and supported extensions.
     * @param hash - Versioned extension hash.
     * @returns - Tuple of webgl backend and an array of extensions.
     */
    static decode(hash: string): [string, Array<string>] {

        const hashHead = ExtensionsHash.decode64(hash[0]);
        const version = hashHead >> 3;

        const backendIndex = (hashHead & 0b000111) - 1;
        assert(backendIndex < ExtensionsHash.WEBGL_BACKENDS.length,
            `expected valid backend index, given ${backendIndex}`);

        const backend = ExtensionsHash.WEBGL_BACKENDS[backendIndex];

        assert(ExtensionsHash.EXTENSIONS_BY_VERSION.has(version), `expected valid hash version, given ${version}`);
        const extensions = ExtensionsHash.EXTENSIONS_BY_VERSION.get(version) as Array<string>;

        const expectedHashLength = Math.ceil(extensions.length / 6) + 1;
        assert(hash.length === expectedHashLength,
            `expected hash of version ${version} to have a length of ${expectedHashLength}, given ${hash}`);

        const supported = new Array<string>();
        for (let i = 1; i < hash.length; ++i) {
            const bitfield = ExtensionsHash.decode64(hash[i]);
            const offset = (i - 1) * 6;

            /* loop explicitly unrolled */
            if (bitfield & 0b100000) {
                supported.push(extensions[offset + 0]);
            }
            if (bitfield & 0b010000) {
                supported.push(extensions[offset + 1]);
            }
            if (bitfield & 0b001000) {
                supported.push(extensions[offset + 2]);
            }
            if (bitfield & 0b000100) {
                supported.push(extensions[offset + 3]);
            }
            if (bitfield & 0b000010) {
                supported.push(extensions[offset + 4]);
            }
            if (bitfield & 0b000001) {
                supported.push(extensions[offset + 5]);
            }
        }
        return [backend, supported];
    }

    /**
     * For a given set of extensions, this generates the complementary set of extensions for a given backend.
     * @param backend - WebGL backend: 'webgl1' or 'webgl2'.
     * @param extensions - Array of extensions to be complemented to all extensions available to the backend.
     */
    static complement(backend: string, extensions: Array<string>): Array<string> {
        const backendIndex = ExtensionsHash.WEBGL_BACKENDS.indexOf(backend);
        assert(backendIndex > -1, `expected valid backend ${ExtensionsHash.WEBGL_BACKENDS}, given ${backend} `);

        const webglExtensions = ExtensionsHash.WEBGL_EXTENSIONS_BY_BACKEND.get(backendIndex) as Array<string>;
        return webglExtensions.filter((ext) => extensions.indexOf(ext) < 0);
    }

}
