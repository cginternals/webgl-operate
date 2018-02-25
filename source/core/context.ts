
import { assert, log, log_if, LogLevel } from './auxiliaries';

import { AllocationRegister } from './allocationregister';
import { ContextMasquerade } from './contextmasquerade';
import { WEBGL1_EXTENSIONS, WEBGL2_DEFAULT_EXTENSIONS, WEBGL2_EXTENSIONS } from './extensions';
import { GL2Facade } from './gl2facade';


/**
 * Supported OpenGL backend types.
 */
export enum BackendType { Invalid, WebGL1, WebGL2 }


/**
 * A controller for either a WebGLRenderingContext or WebGL2RenderingContext. It requests a context, tracks context
 * attributes, extensions as well as multi frame specific rendering information and a (gpu)allocation registry.
 *
 * An instance of `Context` can be created only implicitly by requesting a context given a canvas element and its
 * dataset:
 * ```
 * const element: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById(canvasID);
 * this.context = Context.request(element); // element.dataset is used for attributes
 * ```
 * The context supports the following data-attributes:
 * ```
 * data-backend: 'auto' | 'webgl' | 'webgl2'
 * data-accumulation-format: 'auto' | 'float' | 'half' | 'byte'
 * ```
 *
 * At run-time, cached context features can be queried without a performance impact, e.g., frequent extension-based
 * branching:
 * ```
 * if(this.context.supportsVertexArrayObject) {
 *     this.context.vertexArrayObject.bindVertexArrayOES(...);
 *     ...
 * }
 * ```
 *
 * For convenience, protected extension names such as `EXT_frag_depth` are not prefixed by an underscore.
 */
export class Context {

    /* tslint:disable:member-ordering variable-name */

    /**
     * The list of valid backend identifiers that can be matched to backend types.
     * List adopted from https://developer.mozilla.org/de/docs/Web/API/HTMLCanvasElement/getContext.
     */
    protected static readonly VALID_BACKENDS =
        /^(auto|webgl|experimental-webgl|webgl1|experimental-webgl1|webgl2|experimental-webgl2)$/;

    /**
     * Context creation attribute defaults.
     */
    protected static readonly CONTEXT_ATTRIBUTES = {
        alpha: true,
        antialias: false,
        depth: false,
        failIfMajorPerformanceCaveat: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: false,
    };

    /**
     * @see {@link backend}
     */
    protected _backend: BackendType | undefined;

    /**
     * Created context. The actual type depends on the created context.
     * @see {@link gl}
     */
    protected _context: any; // WebGLRenderingContext | WebGL2RenderingContext;

    /**
     * @see {@link mask}
     */
    protected _mask: ContextMasquerade | undefined;

    /**
     * @see {@link gl2facade}
     */
    protected _gl2: GL2Facade;


    /**
     * Creates a masquerade object that can be used for debugging. This is intended to be called when requesting a
     * context, i.e., before actually requesting it. For creation of a masquerade object, the following masquerade
     * specifiers are evaluated in the following order:
     *  1. msqrd_h GET parameter,
     *  2. msqrd_p GET parameter,
     *  3. data-msqrd-h attribute of the canvas element, and, finally,
     *  4. data-msqrd-p attribute of the canvas element.
     * If no specifier can be found, no object is created and undefined is returned.
     * @param dataset - Dataset of the canvas element that might provide a data-msqrd-{h,p} attribute.
     * @returns - Masquerade object when a specifier was found. If none was found undefined is returned.
     */
    protected static createMasqueradeFromGETorDataAttribute(dataset: DOMStringMap): ContextMasquerade | undefined {
        const mask = ContextMasquerade.fromGET();
        if (mask) {
            return mask;
        }
        if (dataset.msqrdH) {
            return ContextMasquerade.fromHash(dataset.msqrdH as string);
        }
        if (dataset.msqrdP) {
            return ContextMasquerade.fromPreset(dataset.msqrdP as string);
        }
        return undefined;
    }

    // WEBGL 1 & 2 CONTEXT

    /**
     * Create a WebGL context. Note: this should only be called once in constructor, because the second and subsequent
     * calls to getContext of an element will return null.
     * @param element - Canvas element to request context from.
     * @returns - Context providing either a WebGLRenderingContext, WebGL2RenderingContext.
     */
    static request(element: HTMLCanvasElement): Context {
        const dataset: DOMStringMap = element.dataset;
        const mask = Context.createMasqueradeFromGETorDataAttribute(dataset);

        /** Favor backend specification by masquerade over specification by data attribute. */
        let request = mask ? (mask.backend as string) :
            dataset.backend ? (dataset.backend as string).toLowerCase() : '';

        if (!Context.VALID_BACKENDS.test(request)) {
            log(LogLevel.Dev, `unknown backend '${dataset.backend}' changed to 'auto'`);
            request = 'auto';
        }

        switch (request) {
            case 'webgl':
                break;
            case 'experimental-webgl':
            case 'experimental-webgl1':
            case 'webgl1':
                request = 'webgl';
                break;
            case 'experimental-webgl2':
            case 'webgl2':
                request = 'webgl2';
                break;
            default:
                request = 'auto';
        }

        let context;
        if (request !== 'webgl') {
            context = this.requestWebGL2(element);
        }
        if (!context) {
            context = this.requestWebGL1(element);
            log_if(context !== undefined && request === 'webgl2', LogLevel.Dev,
                `backend changed to 'webgl', given '${request}'`);
        }

        assert(!!context, `creating a context failed`);
        return new Context(context, mask);
    }

    /**
     * Helper that tries to create a WebGL 1 context (requests to 'webgl' and 'experimental-webgl' are made).
     * @param element - Canvas element to request context from.
     * @returns {WebGLRenderingContext} - WebGL context object or null.
     */
    protected static requestWebGL1(element: HTMLCanvasElement) {
        let context = element.getContext('webgl', Context.CONTEXT_ATTRIBUTES);
        if (context) {
            return context;
        }

        context = element.getContext('experimental-webgl', Context.CONTEXT_ATTRIBUTES);

        return context;
    }

    /**
     * Helper that tries to create a WebGL 2 context (requests to 'webgl2' and 'experimental-webgl2' are made).
     * @param element - Canvas element to request context from.
     * @returns {WebGL2RenderingContext} - WebGL2 context object or null.
     */
    protected static requestWebGL2(element: HTMLCanvasElement) {
        let context = element.getContext('webgl2', Context.CONTEXT_ATTRIBUTES);
        if (context) {
            return context;
        }

        context = element.getContext('experimental-webgl2', Context.CONTEXT_ATTRIBUTES);
        return context;
    }


    // CONTEXT ATTRIBUTES

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, the drawing buffer has an alpha channel for the purposes of performing OpenGL destination
     * alpha operations and compositing with the page. If the value is false, no alpha buffer is available.
     */
    get alpha(): boolean {
        return this._context.getContextAttributes().alpha;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true and the implementation supports antialiasing the drawing buffer will perform antialiasing
     * using its choice of technique (multisample/supersample) and quality. If the value is false or the implementation
     * does not support antialiasing, no antialiasing is performed.
     */
    get antialias(): boolean {
        return this._context.getContextAttributes().antialias;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, the drawing buffer has a depth buffer of at least 16 bits. If the value is false, no depth
     * buffer is available.
     */
    get depth(): boolean {
        return this._context.getContextAttributes().depth;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, context creation will fail if the implementation determines that the performance of the
     * created WebGL context would be dramatically lower than that of a native application making equivalent OpenGL
     * calls...
     */
    get failIfMajorPerformanceCaveat(): boolean {
        return this._context.getContextAttributes().failIfMajorPerformanceCaveat;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true the page compositor will assume the drawing buffer contains colors with premultiplied alpha.
     * If the value is false the page compositor will assume that colors in the drawing buffer are not premultiplied.
     * This flag is ignored if the alpha flag is false. See Premultiplied Alpha for more information on the effects of
     * the premultipliedAlpha flag.
     */
    get premultipliedAlpha(): boolean {
        return this._context.getContextAttributes().premultipliedAlpha;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If false, once the drawing buffer is presented as described in theDrawing Buffer section, the contents of the
     * drawing buffer are cleared to their default values. All elements of the drawing buffer (color, depth and stencil)
     * are cleared. If the value is true the buffers will not be cleared and will preserve their values until cleared
     * or overwritten by the author.
     */
    get preserveDrawingBuffer(): boolean {
        return this._context.getContextAttributes().preserveDrawingBuffer;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, the drawing buffer has a stencil buffer of at least 8 bits. If the value is false, no
     * stencil buffer is available.
     */
    get stencil(): boolean {
        return this._context.getContextAttributes().stencil;
    }


    // EXTENSIONS

    /**
     * Cached extension supported by the context.
     */
    protected _extensions: Array<string> = new Array<string>();

    /**
     * Checks if the given extension is supported. Please note that a 'supports' call asserts whether or not the
     * extension is related to the WebGL version. For example, the following code would lead to an Error:
     * ```
     * this.supports('ANGLE_instanced_arrays'); // asserts in WebGL2 since the extension is incorporated by default
     * ```
     * If the context is masked by a ContextMasquerade the support of an extension might be concealed.
     * @param extension - Extension identifier to query support for.
     * @returns - True if the extension is supported, false otherwise.
     */
    protected supports(extension: string): boolean {
        if (this._mask && this._mask.extensionsConceal.indexOf(extension) > -1) {
            return false;
        }

        switch (this._backend) {
            case BackendType.WebGL1:
                assert(WEBGL1_EXTENSIONS.indexOf(extension) > -1, `extension ${extension} not available to WebGL1`);
                break;

            case BackendType.WebGL2:
                assert(WEBGL2_DEFAULT_EXTENSIONS.indexOf(extension) === -1,
                    `extension ${extension} supported by default in WebGL2`);
                assert(WEBGL2_EXTENSIONS.indexOf(extension) > -1, `extension ${extension} not available to WebGL2`);
                break;

            default:
                break;
        }

        return this._extensions.indexOf(extension) > -1;
    }

    /**
     * Queries all extensions for the current context and stores the result (supported or not supported). This is
     * relevant to avoid continuous searches or regexp matching or substring queries in the complete extension string.
     * Instead, the support is queried once and can be explicitly request in the public interface using properties.
     *
     * This function should get called only once per Context instance.
     */
    protected queryExtensionSupport(): void {
        this._extensions = this._context.getSupportedExtensions();

        if (this._backend === BackendType.WebGL1) {
            this.ANGLE_instanced_arrays_supported = this.supports('ANGLE_instanced_arrays');

            this.EXT_blend_minmax_supported = this.supports('EXT_blend_minmax');
            this.EXT_color_buffer_half_float_supported = this.supports('EXT_color_buffer_half_float');
            this.EXT_disjoint_timer_query_supported = this.supports('EXT_disjoint_timer_query');
            this.EXT_frag_depth_supported = this.supports('EXT_frag_depth');
            this.EXT_sRGB_supported = this.supports('EXT_sRGB');
            this.EXT_shader_texture_lod_supported = this.supports('EXT_shader_texture_lod');

            this.OES_element_index_uint_supported = this.supports('OES_element_index_uint');
            this.OES_standard_derivatives_supported = this.supports('OES_standard_derivatives');
            this.OES_texture_float_supported = this.supports('OES_texture_float');
            this.OES_texture_half_float_supported = this.supports('OES_texture_half_float');
            this.OES_vertex_array_object_supported = this.supports('OES_vertex_array_object');

            this.WEBGL_color_buffer_float_supported = this.supports('WEBGL_color_buffer_float');
            this.WEBGL_depth_texture_supported = this.supports('WEBGL_depth_texture');
            this.WEBGL_draw_buffers_supported = this.supports('WEBGL_draw_buffers');
        }

        if (this._backend === BackendType.WebGL2) {
            this.EXT_color_buffer_float_supported = this.supports('EXT_color_buffer_float');
            this.EXT_disjoint_timer_query_webgl2_supported = this.supports('EXT_disjoint_timer_query_webgl2');
        }

        this.EXT_texture_filter_anisotropic_supported = this.supports('EXT_texture_filter_anisotropic');

        this.OES_texture_float_linear_supported = this.supports('OES_texture_float_linear');
        this.OES_texture_half_float_linear_supported = this.supports('OES_texture_half_float_linear');

        this.WEBGL_compressed_texture_astc_supported = this.supports('WEBGL_compressed_texture_astc');
        this.WEBGL_compressed_texture_atc_supported = this.supports('WEBGL_compressed_texture_atc');
        this.WEBGL_compressed_texture_etc_supported = this.supports('WEBGL_compressed_texture_etc');
        this.WEBGL_compressed_texture_etc1_supported = this.supports('WEBGL_compressed_texture_etc1');
        this.WEBGL_compressed_texture_pvrtc_supported = this.supports('WEBGL_compressed_texture_pvrtc');
        this.WEBGL_compressed_texture_s3tc_supported = this.supports('WEBGL_compressed_texture_s3tc');
        this.WEBGL_compressed_texture_s3tc_srgb_supported = this.supports('WEBGL_compressed_texture_s3tc_srgb');
        this.WEBGL_debug_renderer_info_supported = this.supports('WEBGL_debug_renderer_info');
        this.WEBGL_debug_shaders_supported = this.supports('WEBGL_debug_shaders');
        this.WEBGL_lose_context_supported = this.supports('WEBGL_lose_context');
    }

    /**
     * Returns the cached extensions object for the given extension identifier. If no extensions is cached, it is
     * queried. Asserts if the extension is provided by default in the current backend, not supported in general, or
     * unknown to the specification.
     * Please not that the availability of an extension might be concealed by the context's mask.
     * @param out - Member the extension object is cached into.
     * @param extension - Extension identifier to query.
     * @returns - Extension object.
     */
    protected extension(out: any, extension: string): any {
        if (out === undefined) {
            assert(this.supports(extension), `extension ${extension} expected to be supported`);
            out = this._context.getExtension(extension);
        }
        return out;
    }

    /**
     * Context this is of type 'any' for now, since WebGL2RenderingContext not available but supported. This
     * constructor is protected to enforce context creation using `request`. It queries extension support and
     * configures context specifics for convenience, e.g., HALF_FLOAT format.
     */
    protected constructor(context: any, mask: ContextMasquerade | undefined) {
        this._context = context;
        this._mask = mask;

        const contextString = context.toString();

        {
            // WebGL chrome debugger renames Context to CaptureContext
            const webgl1 = /WebGLRenderingContext/.test(contextString) ||
                /CaptureContext/.test(contextString);
            const webgl2 = /WebGL2RenderingContext/.test(contextString);

            this._backend = webgl1 ? BackendType.WebGL1 : webgl2 ? BackendType.WebGL2 : undefined;
        }

        assert(this._backend !== undefined && this._backend.valueOf() !== BackendType.Invalid.valueOf(),
            `context is neither webgl nor webgl2, given ${contextString}`);

        this.queryExtensionSupport();

        // undefine all masked functions
        if (this._mask && this._mask.functionsUndefine) {
            for (const func in this._mask.functionsUndefine) {
                (this._context as any)[func] = undefined;
            }
        }

        // create an instance for a gl2 facade (unifies mandatory interfaces of the webgl and webgl2 api)
        this._gl2 = new GL2Facade(this);
    }


    /**
     * @see {@link allocationRegister}
     */
    protected _allocationRegister = new AllocationRegister();

    /**
     * The context's GPU allocation register for use of tracking memory allocations.
     */
    get allocationRegister(): AllocationRegister {
        return this._allocationRegister;
    }


    /**
     * The created rendering backend (webgl context type), either 'webgl' or 'webgl2' based on which one was
     * created successfully. If no context could be created null is returned.
     * @returns - Backend that was created on construction.
     */
    get backend() {
        return this._backend;
    }

    /**
     * Provides a human-readable string of the backend.
     */
    get backendString(): string | undefined {
        switch (this._backend) {
            case BackendType.WebGL1:
                return 'WebGL';
            case BackendType.WebGL2:
                return 'WebGL2';
            default:
                return undefined;
        }
    }

    /**
     * Provides an array of all extensions supported by the used WebGL1/2 context.
     */
    get extensions() {
        return this._extensions;
    }

    /**
     * Masquerade object applied to a context instance.
     */
    get mask() {
        return this._mask;
    }

    /**
     * Access to either the WebGLRenderingContext or WebGL2RenderingContext.
     */
    get gl() {
        return this._context;
    }

    /**
     * WebGL2 facade for WebGL2 API like access to features mandatory to this engine.
     */
    get gl2facade() {
        return this._gl2;
    }

    /**
     * True if the context is a WebGL1 context, otherwise false.
     */
    get isWebGL1(): boolean {
        return this._backend === BackendType.WebGL1;
    }

    /**
     * True if the context is a WebGL2 context, otherwise false.
     */
    get isWebGL2(): boolean {
        return this._backend === BackendType.WebGL2;
    }


    // EXTENSION QUERIES

    // WebGL1, WebGL2-default
    protected ANGLE_instanced_arrays: any;
    protected ANGLE_instanced_arrays_supported: boolean;
    get supportsInstancedArrays(): boolean {
        return this.ANGLE_instanced_arrays_supported;
    }
    get instancedArrays(): any {
        return this.extension(this.ANGLE_instanced_arrays, 'ANGLE_instanced_arrays');
    }

    // WebGL1, WebGL2-default
    protected EXT_blend_minmax: any;
    protected EXT_blend_minmax_supported: boolean;
    get supportsBlendMinmax(): boolean {
        return this.EXT_blend_minmax_supported;
    }
    get blendMinmax(): any {
        return this.extension(this.EXT_blend_minmax, 'EXT_blend_minmax');
    }

    // WebGL1
    protected EXT_color_buffer_half_float: any;
    protected EXT_color_buffer_half_float_supported: boolean;
    get supportsColorBufferHalfFloat(): boolean {
        return this.EXT_color_buffer_half_float_supported;
    }
    get colorBufferHalfFloat(): any {
        return this.extension(this.EXT_color_buffer_half_float, 'EXT_color_buffer_half_float');
    }

    // WebGL1
    protected EXT_disjoint_timer_query: any;
    protected EXT_disjoint_timer_query_supported: boolean;
    get supportsDisjointTimerQuery(): boolean {
        return this.EXT_disjoint_timer_query_supported;
    }
    get disjointTimerQuery(): any {
        return this.extension(this.EXT_disjoint_timer_query, 'EXT_disjoint_timer_query');
    }

    // WebGL2
    protected EXT_disjoint_timer_query_webgl2: any;
    protected EXT_disjoint_timer_query_webgl2_supported: boolean;
    get supportsDisjointTimerQueryWebGL2(): boolean {
        return this.EXT_disjoint_timer_query_webgl2_supported;
    }
    get disjointTimerQueryWebGL2(): any {
        return this.extension(this.EXT_disjoint_timer_query_webgl2, 'EXT_disjoint_timer_query_webgl2');
    }

    // WebGL1, WebGL2-default
    protected EXT_frag_depth: any;
    protected EXT_frag_depth_supported: boolean;
    get supportsFragDepth(): boolean {
        return this.EXT_frag_depth_supported;
    }
    get fragDepth(): any {
        return this.extension(this.EXT_frag_depth, 'EXT_frag_depth');
    }

    // WebGL1, WebGL2-default
    protected EXT_sRGB: any;
    protected EXT_sRGB_supported: boolean;
    get supportsSRGB(): boolean {
        return this.EXT_sRGB_supported;
    }
    get sRGB(): any {
        return this.extension(this.EXT_sRGB, 'EXT_sRGB');
    }

    // WebGL1, WebGL2-default
    protected EXT_shader_texture_lod: any;
    protected EXT_shader_texture_lod_supported: boolean;
    get supportsShaderTextureLOD(): boolean {
        return this.EXT_shader_texture_lod_supported;
    }
    get shaderTextureLOD(): any {
        return this.extension(this.EXT_shader_texture_lod, 'EXT_shader_texture_lod');
    }

    // WebGL1, WebGL2
    protected EXT_texture_filter_anisotropic: any;
    protected EXT_texture_filter_anisotropic_supported: boolean;
    get supportsTextureFilterAnisotropic(): boolean {
        return this.EXT_texture_filter_anisotropic_supported;
    }
    get textureFilterAnisotropic(): any {
        return this.extension(this.EXT_texture_filter_anisotropic, 'EXT_texture_filter_anisotropic');
    }

    // WebGL1, WebGL2-default
    protected OES_element_index_uint: any;
    protected OES_element_index_uint_supported: boolean;
    get supportsElementIndexUint(): boolean {
        return this.OES_element_index_uint_supported;
    }
    get elementIndexUint(): any {
        return this.extension(this.OES_element_index_uint, 'OES_element_index_uint');
    }

    // WebGL1, WebGL2-default
    protected OES_standard_derivatives: any;
    protected OES_standard_derivatives_supported: boolean;
    get supportsStandardDerivatives(): boolean {
        return this.OES_standard_derivatives_supported;
    }
    get standardDerivatives(): any {
        return this.extension(this.OES_standard_derivatives, 'OES_standard_derivatives');
    }

    // WebGL1, WebGL2-default
    protected OES_texture_float: any;
    protected OES_texture_float_supported: boolean;
    get supportsTextureFloat(): boolean {
        return this.OES_texture_float_supported;
    }
    get textureFloat(): any {
        return this.extension(this.OES_texture_float, 'OES_texture_float');
    }

    // WebGL1, WebGL2
    protected OES_texture_float_linear: any;
    protected OES_texture_float_linear_supported: boolean;
    get supportsTextureFloatLinear(): boolean {
        return this.OES_texture_float_linear_supported;
    }
    get textureFloatLinear(): any {
        return this.extension(this.OES_texture_float_linear, 'OES_texture_float_linear');
    }

    // WebGL1, WebGL2-default
    protected OES_texture_half_float: any;
    protected OES_texture_half_float_supported: boolean;
    get supportsTextureHalfFloat(): boolean {
        return this.OES_texture_half_float_supported;
    }
    get textureHalfFloat(): any {
        return this.extension(this.OES_texture_half_float, 'OES_texture_half_float');
    }

    // WebGL1, WebGL2
    protected OES_texture_half_float_linear: any;
    protected OES_texture_half_float_linear_supported: boolean;
    get supportsTextureHalfFloatLinear(): boolean {
        return this.OES_texture_half_float_linear_supported;
    }
    get textureHalfFloatLinear(): any {
        return this.extension(this.OES_texture_half_float_linear, 'OES_texture_half_float_linear');
    }

    // WebGL1, WebGL2-default
    protected OES_vertex_array_object: any;
    protected OES_vertex_array_object_supported: boolean;
    get supportsVertexArrayObject(): boolean {
        return this.OES_vertex_array_object_supported;
    }
    get vertexArrayObject(): any {
        return this.extension(this.OES_vertex_array_object, 'OES_vertex_array_object');
    }

    // WebGL1
    protected WEBGL_color_buffer_float: any;
    protected WEBGL_color_buffer_float_supported: boolean;
    // WebGL2
    protected EXT_color_buffer_float: any;
    protected EXT_color_buffer_float_supported: boolean;
    get supportsColorBufferFloat(): boolean | undefined {
        switch (this._backend) {
            case BackendType.WebGL1:
                return this.WEBGL_color_buffer_float_supported;
            case BackendType.WebGL2:
                return this.EXT_color_buffer_float_supported;
            default:
                return undefined;
        }
    }
    get colorBufferFloat(): any | undefined {
        switch (this._backend) {
            case BackendType.WebGL1:
                return this.extension(this.WEBGL_color_buffer_float, 'WEBGL_color_buffer_float');
            case BackendType.WebGL2:
                return this.extension(this.EXT_color_buffer_float, 'EXT_color_buffer_float');
            default:
                return undefined;
        }
    }

    // WebGL1, WebGL2
    protected WEBGL_compressed_texture_astc: any;
    protected WEBGL_compressed_texture_astc_supported: boolean;
    get supportsCompressedTextureASTC(): boolean {
        return this.WEBGL_compressed_texture_astc_supported;
    }
    get compressedTextureASTC(): any {
        return this.extension(this.WEBGL_compressed_texture_astc, 'WEBGL_compressed_texture_astc');
    }

    // WebGL1, WebGL2
    protected WEBGL_compressed_texture_atc: any;
    protected WEBGL_compressed_texture_atc_supported: boolean;
    get supportsCompressedTextureATC(): boolean {
        return this.WEBGL_compressed_texture_atc_supported;
    }
    get compressedTextureATC(): any {
        return this.extension(this.WEBGL_compressed_texture_atc, 'WEBGL_compressed_texture_atc');
    }

    // WebGL1, WebGL2
    protected WEBGL_compressed_texture_etc: any;
    protected WEBGL_compressed_texture_etc_supported: boolean;
    get supportsCompressedTextureETC(): boolean {
        return this.WEBGL_compressed_texture_etc_supported;
    }
    get compressedTextureETC(): any {
        return this.extension(this.WEBGL_compressed_texture_etc, 'WEBGL_compressed_texture_etc');
    }

    // WebGL1, WebGL2
    protected WEBGL_compressed_texture_etc1: any;
    protected WEBGL_compressed_texture_etc1_supported: boolean;
    get supportsCompressedTextureETC1(): boolean {
        return this.WEBGL_compressed_texture_etc1_supported;
    }
    get compressedTextureETC1(): any {
        return this.extension(this.WEBGL_compressed_texture_etc1, 'WEBGL_compressed_texture_etc1');
    }

    // WebGL1, WebGL2
    protected WEBGL_compressed_texture_pvrtc: any;
    protected WEBGL_compressed_texture_pvrtc_supported: boolean;
    get supportsCompressedTexturePVRTC(): boolean {
        return this.WEBGL_compressed_texture_pvrtc_supported;
    }
    get compressedTexturePVRTC(): any {
        return this.extension(this.WEBGL_compressed_texture_pvrtc, 'WEBGL_compressed_texture_pvrtc');
    }

    // WebGL1, WebGL2
    protected WEBGL_compressed_texture_s3tc: any;
    protected WEBGL_compressed_texture_s3tc_supported: boolean;
    get supportsCompressedTextureS3TC(): boolean {
        return this.WEBGL_compressed_texture_s3tc_supported;
    }
    get compressedTextureS3TC(): any {
        return this.extension(this.WEBGL_compressed_texture_s3tc, 'WEBGL_compressed_texture_s3tc');
    }

    // WebGL1, WebGL2
    protected WEBGL_compressed_texture_s3tc_srgb: any;
    protected WEBGL_compressed_texture_s3tc_srgb_supported: boolean;
    get supportsCompressedTextureS3TCSRGB(): boolean {
        return this.WEBGL_compressed_texture_s3tc_srgb_supported;
    }
    get compressedTextureS3TCSRGB(): any {
        return this.extension(this.WEBGL_compressed_texture_s3tc_srgb, 'WEBGL_compressed_texture_s3tc_srgb');
    }

    // WebGL1, WebGL2
    protected WEBGL_debug_renderer_info: any;
    protected WEBGL_debug_renderer_info_supported: boolean;
    get supportsDebugRendererInfo(): boolean {
        return this.WEBGL_debug_renderer_info_supported;
    }
    get debugRendererInfo(): any {
        return this.extension(this.WEBGL_debug_renderer_info, 'WEBGL_debug_renderer_info');
    }

    // WebGL1, WebGL2
    protected WEBGL_debug_shaders: any;
    protected WEBGL_debug_shaders_supported: boolean;
    get supportsDebugShaders(): boolean {
        return this.WEBGL_debug_shaders_supported;
    }
    get debugShaders(): any {
        return this.extension(this.WEBGL_debug_shaders, 'WEBGL_debug_shaders');
    }

    // WebGL1, WebGL2-default
    protected WEBGL_depth_texture: any;
    protected WEBGL_depth_texture_supported: boolean;
    get supportsDepthTexture(): boolean {
        return this.WEBGL_depth_texture_supported;
    }
    get depthTexture(): any {
        return this.extension(this.WEBGL_depth_texture, 'WEBGL_depth_texture');
    }

    // WebGL1, WebGL2-default
    protected WEBGL_draw_buffers: any;
    protected WEBGL_draw_buffers_supported: boolean;
    get supportsDrawBuffers(): boolean {
        return this.WEBGL_draw_buffers_supported;
    }
    get drawBuffers(): any {
        return this.extension(this.WEBGL_draw_buffers, 'WEBGL_draw_buffers');
    }

    // WebGL1, WebGL2
    protected WEBGL_lose_context: any;
    protected WEBGL_lose_context_supported: boolean;
    get supportsLoseContext(): boolean {
        return this.WEBGL_lose_context_supported;
    }
    get loseContext(): any {
        return this.extension(this.WEBGL_lose_context, 'WEBGL_lose_context');
    }

    // FUNCTION QUERIES

    /**
     * True if WebGL2 blitFramebuffer is supported, false otherwise. This is experimental technology.
     */
    get supportsBlitFramebuffer(): boolean {
        return this._context.blitFramebuffer !== undefined;
    }

    /**
     * True if WebGL2 readBuffer is supported, false otherwise. This is experimental technology.
     */
    get supportsReadBuffer(): boolean {
        return this._context.readBuffer !== undefined;
    }

}
