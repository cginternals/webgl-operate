
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';
import { byteSizeOfFormat } from './formatbytesizes';

import { AllocationRegister } from './allocationregister';
import { ContextMasquerade } from './contextmasquerade';

import { extensions } from './extensions';
import WEBGL1_EXTENSIONS = extensions.WEBGL1_EXTENSIONS;
import WEBGL2_DEFAULT_EXTENSIONS = extensions.WEBGL2_DEFAULT_EXTENSIONS;
import WEBGL2_EXTENSIONS = extensions.WEBGL2_EXTENSIONS;

import { ExtensionsHash } from './extensionshash';
import { GL2Facade } from './gl2facade';

/* spellchecker: enable */


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

    /**
     * Context creation attribute defaults. The defaults are taken directly from the spec.
     */
    protected static readonly DEFAULT_ATTRIBUTES = {
        alpha: true,
        antialias: false, /* Not defaulted to true, since it might interfere with manual blitting. */
        depth: true,
        failIfMajorPerformanceCaveat: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: false,
    };

    /** @see {@link backend} */
    protected _backend: Context.BackendType | undefined;

    /**
     * Created context. The actual type depends on the created context.
     * @see {@link gl}
     */
    protected _context: WebGLRenderingContext | WebGL2RenderingContext | undefined;

    /** @see {@link mask} */
    protected _mask: ContextMasquerade | undefined;

    /** @see {@link gl2facade} */
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
     * @param attributes - Overrides the internal default attributes @see{Context.DEFAULT_ATTRIBUTES}.
     * @returns - Context providing either a WebGLRenderingContext, WebGL2RenderingContext.
     */
    static request(element: HTMLCanvasElement,
        attributes: WebGLContextAttributes = Context.DEFAULT_ATTRIBUTES): Context {

        const dataset: DOMStringMap = element.dataset;
        const mask = Context.createMasqueradeFromGETorDataAttribute(dataset);

        /** Favor backend specification by masquerade over specification by data attribute. */
        let request = mask ? (mask.backend as string) :
            dataset.backend ? (dataset.backend as string).toLowerCase() : 'auto';

        if (!(request in Context.BackendRequestType)) {
            auxiliaries.log(auxiliaries.LogLevel.Warning,
                `unknown backend '${dataset.backend}' changed to '${Context.BackendRequestType.auto}'`);
            request = 'auto';
        }

        switch (request) {
            case Context.BackendRequestType.webgl:
                break;
            case Context.BackendRequestType.experimental:
            case Context.BackendRequestType.webgl1:
            case Context.BackendRequestType.experimental1:
                request = Context.BackendRequestType.webgl;
                break;
            case Context.BackendRequestType.webgl2:
            case Context.BackendRequestType.experimental2:
                request = Context.BackendRequestType.webgl2;
                break;
            default:
                request = Context.BackendRequestType.auto;
        }

        let context;
        if (request !== Context.BackendRequestType.webgl) {
            context = this.requestWebGL2(element, attributes);
        }
        if (!context) {
            context = this.requestWebGL1(element, attributes);
            auxiliaries.logIf(context !== undefined && request === Context.BackendRequestType.webgl2, auxiliaries.LogLevel.Info,
                `backend changed to '${Context.BackendRequestType.webgl}', given '${request}'`);
        }

        auxiliaries.assert(!!context, `creating a context failed`);
        return new Context(context, mask);
    }

    /**
     * Helper that tries to create a WebGL 1 context (requests to 'webgl' and 'experimental-webgl' are made).
     * @param element - Canvas element to request context from.
     * @param attributes - Overrides the internal default attributes @see{Context.CONTEXT_ATTRIBUTES}.
     * @returns {WebGLRenderingContext} - WebGL context object or null.
     */
    protected static requestWebGL1(element: HTMLCanvasElement,
        attributes: WebGLContextAttributes = Context.DEFAULT_ATTRIBUTES): WebGLRenderingContext | undefined {

        let context = element.getContext(Context.BackendRequestType.webgl, attributes);
        if (context) {
            return context;
        }
        context = element.getContext(Context.BackendRequestType.experimental, attributes) as WebGLRenderingContext;
        return context === null ? undefined : context;
    }

    /**
     * Helper that tries to create a WebGL 2 context (requests to 'webgl2' and 'experimental-webgl2' are made).
     * @param element - Canvas element to request context from.
     * @param attributes - Overrides the internal default attributes @see{Context.CONTEXT_ATTRIBUTES}.
     * @returns {WebGL2RenderingContext} - WebGL2 context object or undefined.
     */
    protected static requestWebGL2(element: HTMLCanvasElement,
        attributes: WebGLContextAttributes = Context.DEFAULT_ATTRIBUTES)
        : WebGL2RenderingContext | undefined {

        let context = element.getContext(Context.BackendRequestType.webgl2, attributes);
        if (context) {
            return context;
        }
        context = element.getContext(Context.BackendRequestType.experimental2, attributes) as WebGL2RenderingContext;
        return context === null ? undefined : context;
    }


    // CONTEXT ATTRIBUTES

    /**
     * Cached attributes of the context.
     */
    protected _attributes: WebGLContextAttributes | undefined = undefined;

    protected queryAttributes(): void {
        const attributes = this._context!.getContextAttributes();

        // Some browsers, e.g., Brave, might disable querying the attributes.
        if (attributes === null) {
            auxiliaries.log(auxiliaries.LogLevel.Error, `querying context attributes failed (probably blocked)`);
            return;
        }

        this._attributes = attributes;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, the drawing buffer has an alpha channel for the purposes of performing OpenGL destination
     * alpha operations and compositing with the page. If the value is false, no alpha buffer is available.
     */
    get alpha(): boolean {
        return this._attributes ? this._attributes!.alpha as boolean : false;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true and the implementation supports antialiasing the drawing buffer will perform antialiasing
     * using its choice of technique (multisample/supersample) and quality. If the value is false or the implementation
     * does not support antialiasing, no antialiasing is performed.
     */
    get antialias(): boolean {
        return this._attributes ? this._attributes!.antialias as boolean : false;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, the drawing buffer has a depth buffer of at least 16 bits. If the value is false, no depth
     * buffer is available.
     */
    get depth(): boolean {
        return this._attributes ? this._attributes!.depth as boolean : false;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, context creation will fail if the implementation determines that the performance of the
     * created WebGL context would be dramatically lower than that of a native application making equivalent OpenGL
     * calls...
     */
    get failIfMajorPerformanceCaveat(): boolean {
        return this._attributes ? this._attributes!.failIfMajorPerformanceCaveat as boolean : false;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true the page compositor will assume the drawing buffer contains colors with premultiplied alpha.
     * If the value is false the page compositor will assume that colors in the drawing buffer are not premultiplied.
     * This flag is ignored if the alpha flag is false. See Premultiplied Alpha for more information on the effects of
     * the premultipliedAlpha flag.
     */
    get premultipliedAlpha(): boolean {
        return this._attributes ? this._attributes!.premultipliedAlpha as boolean : false;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If false, once the drawing buffer is presented as described in theDrawing Buffer section, the contents of the
     * drawing buffer are cleared to their default values. All elements of the drawing buffer (color, depth and stencil)
     * are cleared. If the value is true the buffers will not be cleared and will preserve their values until cleared
     * or overwritten by the author.
     */
    get preserveDrawingBuffer(): boolean {
        return this._attributes ? this._attributes!.preserveDrawingBuffer as boolean : false;
    }

    /**
     * @link https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     * If the value is true, the drawing buffer has a stencil buffer of at least 8 bits. If the value is false, no
     * stencil buffer is available.
     */
    get stencil(): boolean {
        return this._attributes ? this._attributes!.stencil as boolean : false;
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
    supports(extension: string): boolean {
        if (this._mask && this._mask.extensionsConceal.indexOf(extension) > -1) {
            return false;
        }

        switch (this._backend) {
            case Context.BackendType.WebGL1:
                auxiliaries.assert(WEBGL1_EXTENSIONS.indexOf(extension) > -1, `extension ${extension} not available to WebGL1`);
                break;

            case Context.BackendType.WebGL2:
                auxiliaries.assert(WEBGL2_DEFAULT_EXTENSIONS.indexOf(extension) === -1,
                    `extension ${extension} supported by default in WebGL2`);
                auxiliaries.assert(WEBGL2_EXTENSIONS.indexOf(extension) > -1, `extension ${extension} not available to WebGL2`);
                break;

            default:
                break;
        }

        return this._extensions.indexOf(extension) > -1;
    }

    /**
     * Enable provided extensions. Each extension is only enabled if it is supported. Alternatively the extension can
     * be queried for support and accessed (thereby enabled) directly. Thus, this function only acts as convenience
     * interface for something like a mandatory extension configuration etc. Also, some extensions only effect GLSL
     * capabilities and must be enabled explicitly without accessing the extension object.
     * @param extensions - Array of extensions identifier that are to be enabled.
     */
    enable(extensions: Array<string>): void {
        for (const extension of extensions) {
            if (this.isWebGL1 && WEBGL1_EXTENSIONS.indexOf(extension) === -1) {
                continue;
            }
            if (this.isWebGL2 && WEBGL2_EXTENSIONS.indexOf(extension) === -1) {
                continue;
            }
            if (this.supports(extension) === false) {
                continue;
            }
            this.extension(undefined, extension);
        }
    }

    /**
     * Queries all extensions for the current context and stores the result (supported or not supported). This is
     * relevant to avoid continuous searches or regexp matching or substring queries in the complete extension string.
     * Instead, the support is queried once and can be explicitly request in the public interface using properties.
     *
     * This function should get called only once per Context instance.
     */
    protected queryExtensionSupport(): void {
        const extensions = this._context!.getSupportedExtensions();

        // Some browsers, e.g., Brave, might disable querying the supported extensions.
        if (extensions === null) {
            auxiliaries.log(auxiliaries.LogLevel.Error, `querying supported extensions failed (probably blocked)`);
            return;
        }

        // Only handle masquerade here and not within each supports-query?
        for (const extension of extensions) {
            if (this._mask && this._mask.extensionsConceal.indexOf(extension) > -1) {
                continue;
            }

            this._extensions.push(extension);
        }

        if (this._backend === Context.BackendType.WebGL1) {
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

        if (this._backend === Context.BackendType.WebGL2) {
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
            auxiliaries.assert(this.supports(extension), `extension ${extension} expected to be supported`);
            out = this._context!.getExtension(extension);
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

            this._backend = webgl1 ? Context.BackendType.WebGL1 : webgl2 ? Context.BackendType.WebGL2 : undefined;
        }

        auxiliaries.assert(this._backend !== undefined && this._backend.valueOf() !== Context.BackendType.Invalid.valueOf(),
            `context is neither webgl nor webgl2, given ${contextString}`);

        this.queryAttributes();
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


    /** @see {@link allocationRegister} */
    protected _allocationRegister = new AllocationRegister();

    /**
     * The context's GPU allocation register for use of tracking memory allocations.
     */
    get allocationRegister(): AllocationRegister {
        return this._allocationRegister;
    }


    /**
     * The created rendering backend (webgl context type), either 'webgl' or 'webgl2' based on which one was
     * created successfully. If no context could be created undefined is returned.
     * @returns - Backend that was created on construction.
     */
    get backend(): Context.BackendType | undefined {
        return this._backend;
    }

    /**
     * Provides a human-readable string of the backend.
     */
    get backendString(): string | undefined {
        switch (this._backend) {
            case Context.BackendType.WebGL1:
                return 'WebGL';
            case Context.BackendType.WebGL2:
                return 'WebGL2';
            default:
                return undefined;
        }
    }

    /**
     * Provides an array of all extensions supported by the used WebGL1/2 context.
     */
    get extensions(): Array<string> {
        return this._extensions;
    }

    /**
     * Masquerade object applied to a context instance.
     */
    get mask(): ContextMasquerade | undefined {
        return this._mask;
    }

    /**
     * Access to either the WebGLRenderingContext or WebGL2RenderingContext.
     */
    get gl(): any { // WebGLRenderingContext | WebGL2RenderingContext
        return this._context;
    }

    /**
     * WebGL2 facade for WebGL2 API like access to features mandatory to this engine.
     */
    get gl2facade(): GL2Facade {
        return this._gl2;
    }

    /**
     * True if the context is a WebGL1 context, otherwise false.
     */
    get isWebGL1(): boolean {
        return this._backend === Context.BackendType.WebGL1;
    }

    /**
     * True if the context is a WebGL2 context, otherwise false.
     */
    get isWebGL2(): boolean {
        return this._backend === Context.BackendType.WebGL2;
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
            case Context.BackendType.WebGL1:
                return this.WEBGL_color_buffer_float_supported;
            case Context.BackendType.WebGL2:
                return this.EXT_color_buffer_float_supported;
            default:
                return undefined;
        }
    }
    get colorBufferFloat(): any | undefined {
        switch (this._backend) {
            case Context.BackendType.WebGL1:
                return this.extension(this.WEBGL_color_buffer_float, 'WEBGL_color_buffer_float');
            case Context.BackendType.WebGL2:
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
        return (this._context as any).blitFramebuffer !== undefined;
    }

    /**
     * True if WebGL2 readBuffer is supported, false otherwise. This is experimental technology.
     */
    get supportsReadBuffer(): boolean {
        return (this._context as any).readBuffer !== undefined;
    }

    /**
     * True if WebGL2 texImage3D draft is supported, false otherwise. This is experimental technology.
     */
    get supportsTexImage3D(): boolean {
        return (this._context as any).texImage3D !== undefined;
    }


    // PARAMETER QUERIES

    param(pname: GLenum): any {
        auxiliaries.assert(!!this._context, `expected context to be valid`);
        return this._context!.getParameter(pname);
    }

    /**
     * Provides the context's extension hash. The hash can be used for context masquerade.
     */
    hash(): string {
        return ExtensionsHash.encode(this._backend as Context.BackendType, this._extensions);
    }

    /**
     * Queries various parameters (depending on the type of context and support of extensions) and returns them as
     * formatted string.
     * @returns - Array of 2-tuple containing (1) the queried enum as string and (2) the resulting parameter value.
     */
    about(): Array<[string, number | string]> {

        const available = 'ok';
        const unavailable = 'na';

        if (this._backend === Context.BackendType.Invalid) {
            return new Array<[string, number | string]>();
        }

        auxiliaries.assert(!!this._context, `expected context to be valid`);
        const context = this._context!;

        const pNamesAndValues = new Array<[string, number | string]>();

        pNamesAndValues.push(['BACKEND (GLOPERATE)', this.backend as Context.BackendType]);
        pNamesAndValues.push(['CONTEXT_HASH (GLOPERATE)', this.hash()]);

        pNamesAndValues.push(['RENDERER', this.param(context.RENDERER)]);
        pNamesAndValues.push(['VENDOR', this.param(context.VENDOR)]);
        pNamesAndValues.push(['VERSION', this.param(context.VERSION)]);
        pNamesAndValues.push(['SHADING_LANGUAGE_VERSION', this.param(context.SHADING_LANGUAGE_VERSION)]);

        /* Debug Render Info Extension - Unmasked Vendor and Renderer. */
        pNamesAndValues.push(['UNMASKED_VENDOR_WEBGL', !this.supportsDebugRendererInfo ? unavailable :
            this.param(this.debugRendererInfo.UNMASKED_VENDOR_WEBGL)]);
        pNamesAndValues.push(['UNMASKED_RENDERER_WEBGL', !this.supportsDebugRendererInfo ? unavailable :
            this.param(this.debugRendererInfo.UNMASKED_RENDERER_WEBGL)]);

        /* Actual Context Attributes. */
        pNamesAndValues.push(['ALPHA (ATTRIBUTE)', String(this.alpha)]);
        pNamesAndValues.push(['ANTIALIAS (ATTRIBUTE)', String(this.antialias)]);
        pNamesAndValues.push(['DEPTH (ATTRIBUTE)', String(this.depth)]);
        pNamesAndValues.push(['FAIL_IF_MAJOR_PERFORMANCE_CAVEAT (ATTRIBUTE)',
            String(this.failIfMajorPerformanceCaveat)]);
        pNamesAndValues.push(['PREMULTIPLIED_ALPHA (ATTRIBUTE)', String(this.premultipliedAlpha)]);
        pNamesAndValues.push(['PRESERVE_DRAWING_BUFFER (ATTRIBUTE)', String(this.preserveDrawingBuffer)]);
        pNamesAndValues.push(['STENCIL (ATTRIBUTE)', String(this.stencil)]);

        /* Window Info. */
        pNamesAndValues.push(['DEVICE_PIXEL_RATIO (WINDOW)', window.devicePixelRatio]);

        /* Navigator Info. */
        pNamesAndValues.push(['APP_CODE_NAME (NAVIGATOR)', window.navigator.appCodeName]);
        pNamesAndValues.push(['APP_NAME (NAVIGATOR)', window.navigator.appName]);
        pNamesAndValues.push(['APP_VERSION (NAVIGATOR)', window.navigator.appVersion]);
        pNamesAndValues.push(['PLATFORM (NAVIGATOR)', window.navigator.platform]);
        pNamesAndValues.push(['HARDWARE_CONCURRENCY (NAVIGATOR)', window.navigator.appCodeName]);
        pNamesAndValues.push(['VENDOR (NAVIGATOR)', window.navigator.vendor]);
        pNamesAndValues.push(['VENDOR_SUB (NAVIGATOR)', window.navigator.vendorSub]);

        /* Max and min queries - context limitations. */
        pNamesAndValues.push(['MAX_COMBINED_TEXTURE_IMAGE_UNITS',
            this.param(context.MAX_COMBINED_TEXTURE_IMAGE_UNITS)]);
        pNamesAndValues.push(['MAX_CUBE_MAP_TEXTURE_SIZE',
            this.param(context.MAX_CUBE_MAP_TEXTURE_SIZE)]);
        pNamesAndValues.push(['MAX_FRAGMENT_UNIFORM_VECTORS',
            this.param(context.MAX_FRAGMENT_UNIFORM_VECTORS)]);
        pNamesAndValues.push(['MAX_RENDERBUFFER_SIZE',
            this.param(context.MAX_RENDERBUFFER_SIZE)]);
        pNamesAndValues.push(['MAX_TEXTURE_IMAGE_UNITS',
            this.param(context.MAX_TEXTURE_IMAGE_UNITS)]);
        pNamesAndValues.push(['MAX_TEXTURE_SIZE',
            this.param(context.MAX_TEXTURE_SIZE)]);
        pNamesAndValues.push(['MAX_VARYING_VECTORS',
            this.param(context.MAX_VARYING_VECTORS)]);
        pNamesAndValues.push(['MAX_VERTEX_ATTRIBS',
            this.param(context.MAX_VERTEX_ATTRIBS)]);
        pNamesAndValues.push(['MAX_VERTEX_TEXTURE_IMAGE_UNITS',
            this.param(context.MAX_VERTEX_TEXTURE_IMAGE_UNITS)]);
        pNamesAndValues.push(['MAX_VERTEX_UNIFORM_VECTORS',
            this.param(context.MAX_VERTEX_UNIFORM_VECTORS)]);

        const MAX_VIEWPORT_DIMS = this.param(context.MAX_VIEWPORT_DIMS);

        pNamesAndValues.push(['MAX_VIEWPORT_DIMS (WIDTH)', MAX_VIEWPORT_DIMS ? MAX_VIEWPORT_DIMS[0] : null]);
        pNamesAndValues.push(['MAX_VIEWPORT_DIMS (HEIGHT)', MAX_VIEWPORT_DIMS ? MAX_VIEWPORT_DIMS[1] : null]);


        if (this.isWebGL2) {
            const context = this._context as WebGL2RenderingContext;
            pNamesAndValues.push(['MAX_3D_TEXTURE_SIZE',
                this.param(context.MAX_3D_TEXTURE_SIZE)]);
            pNamesAndValues.push(['MAX_ARRAY_TEXTURE_LAYERS',
                this.param(context.MAX_ARRAY_TEXTURE_LAYERS)]);
            pNamesAndValues.push(['MAX_CLIENT_WAIT_TIMEOUT_WEBGL',
                this.param(context.MAX_CLIENT_WAIT_TIMEOUT_WEBGL)]);
            pNamesAndValues.push(['MAX_COLOR_ATTACHMENTS',
                this.param(context.MAX_COLOR_ATTACHMENTS)]);
            pNamesAndValues.push(['MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS',
                this.param(context.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS)]);
            pNamesAndValues.push(['MAX_COMBINED_UNIFORM_BLOCKS',
                this.param(context.MAX_COMBINED_UNIFORM_BLOCKS)]);
            pNamesAndValues.push(['MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS',
                this.param(context.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS)]);
            pNamesAndValues.push(['MAX_DRAW_BUFFERS',
                this.param(context.MAX_DRAW_BUFFERS)]);
            pNamesAndValues.push(['MAX_ELEMENT_INDEX',
                this.param(context.MAX_ELEMENT_INDEX)]);
            pNamesAndValues.push(['MAX_ELEMENTS_INDICES',
                this.param(context.MAX_ELEMENTS_INDICES)]);
            pNamesAndValues.push(['MAX_ELEMENTS_VERTICES',
                this.param(context.MAX_ELEMENTS_VERTICES)]);
            pNamesAndValues.push(['MAX_FRAGMENT_INPUT_COMPONENTS',
                this.param(context.MAX_FRAGMENT_INPUT_COMPONENTS)]);
            pNamesAndValues.push(['MAX_FRAGMENT_UNIFORM_BLOCKS',
                this.param(context.MAX_FRAGMENT_UNIFORM_BLOCKS)]);
            pNamesAndValues.push(['MAX_FRAGMENT_UNIFORM_COMPONENTS',
                this.param(context.MAX_FRAGMENT_UNIFORM_COMPONENTS)]);
            pNamesAndValues.push(['MAX_PROGRAM_TEXEL_OFFSET',
                this.param(context.MAX_PROGRAM_TEXEL_OFFSET)]);
            pNamesAndValues.push(['MAX_SAMPLES',
                this.param(context.MAX_SAMPLES)]);
            pNamesAndValues.push(['MAX_SERVER_WAIT_TIMEOUT',
                this.param(context.MAX_SERVER_WAIT_TIMEOUT)]);
            pNamesAndValues.push(['MAX_TEXTURE_LOD_BIAS',
                this.param(context.MAX_TEXTURE_LOD_BIAS)]);
            pNamesAndValues.push(['MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS',
                this.param(context.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS)]);
            pNamesAndValues.push(['MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS',
                this.param(context.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS)]);
            pNamesAndValues.push(['MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS',
                this.param(context.MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS)]);
            pNamesAndValues.push(['MAX_UNIFORM_BLOCK_SIZE',
                this.param(context.MAX_UNIFORM_BLOCK_SIZE)]);
            pNamesAndValues.push(['MAX_UNIFORM_BUFFER_BINDINGS',
                this.param(context.MAX_UNIFORM_BUFFER_BINDINGS)]);
            pNamesAndValues.push(['MAX_VARYING_COMPONENTS',
                this.param(context.MAX_VARYING_COMPONENTS)]);
            pNamesAndValues.push(['MAX_VERTEX_OUTPUT_COMPONENTS',
                this.param(context.MAX_VERTEX_OUTPUT_COMPONENTS)]);
            pNamesAndValues.push(['MAX_VERTEX_UNIFORM_BLOCKS',
                this.param(context.MAX_VERTEX_UNIFORM_BLOCKS)]);
            pNamesAndValues.push(['MAX_VERTEX_UNIFORM_COMPONENTS',
                this.param(context.MAX_VERTEX_UNIFORM_COMPONENTS)]);
            pNamesAndValues.push(['MIN_PROGRAM_TEXEL_OFFSET',
                this.param(context.MIN_PROGRAM_TEXEL_OFFSET)]);
        }

        if (this.isWebGL1) {
            for (const extension of WEBGL1_EXTENSIONS) {
                pNamesAndValues.push([extension, this.supports(extension) ? available : unavailable]);
            }
        } else if (this.isWebGL2) {
            for (const extension of WEBGL2_DEFAULT_EXTENSIONS) {
                pNamesAndValues.push([`${extension} (default)`, available]);
            }
            for (const extension of WEBGL2_EXTENSIONS) {
                pNamesAndValues.push([extension, this.supports(extension) ? available : unavailable]);
            }
        }

        return pNamesAndValues;
    }

    /**
     * Creates a well formated about string, e.g., for logging.
     */
    aboutString(): string {
        const about = this.about();

        let maxPNameLength = 0;
        for (const tuple of about) {
            maxPNameLength = Math.max(tuple[0].length, maxPNameLength);
        }

        let index = 0;
        let message = ``;

        const extensionSeparator = this.isWebGL2 ? 63 + WEBGL2_DEFAULT_EXTENSIONS.length : -1;
        for (const tuple of about) {
            /* Provide some semantic grouping: Core, Limits, Extensions, ... */
            switch (index) {
                case 2:  // End of Backend and Context Hash
                case 6:  // End of Core Context Info
                case 8:  // End of unmasked vendor and renderer
                case 15: // End of context attributes
                case 16: // End of window attributes
                case 23: // End of navigator attributes
                case 35: // End of WebGL 1 specific Limits
                case 63: // End of WebGL 2 specific Limit, start of extensions
                case extensionSeparator: // End of default Extensions (in case of WebGL2) or -1
                    message += `\n`;
                    break;
                default:
                    break;
            }
            message += `  ${tuple[0]} ${'-'.repeat(maxPNameLength - tuple[0].length)}-- ${tuple[1]}\n`;
            ++index;
        }
        message += `\n`;

        return message;
    }

    /**
     * Logs a well formated list of all queried about params (names and associated values).
     * @param verbosity - Log verbosity that is to be used for logging.
     */
    logAbout(verbosity: auxiliaries.LogLevel = auxiliaries.LogLevel.Info): void {
        auxiliaries.log(verbosity, `context.about\n\n` + this.aboutString());
    }

    /**
     * Invokes `logAbout` @see{@link logAbout}) iff the given statement has resolved to true.
     * @param statement - Result of an expression expected to be true in order to invoke logPerformanceStop.
     * @param verbosity - Log verbosity that is to be used for logging.
     */
    logAboutIf(statement: boolean, verbosity: auxiliaries.LogLevel = auxiliaries.LogLevel.Info): void {
        auxiliaries.logIf(statement, verbosity, `context.about\n\n` + this.aboutString());
    }


    // CONTEXT-RELATED AUXILIARIES

    /**
     * Provides the size in bytes of certain WebGL format enumerator. Please note that some byte sizes might vary based
     * on context attributes or the bound render, thus, DEPTH_COMPONENT and DEPTH_STENCIL are not covered by this
     * function. @see {@link byteSizeOfFormat}
     */
    byteSizeOfFormat(format: GLenum): number {
        return byteSizeOfFormat(this, format);
    }

}

export namespace Context {

    /**
     * Supported OpenGL backend types.
     */
    export enum BackendType {
        Invalid = 'invalid',
        WebGL1 = 'webgl1',
        WebGL2 = 'webgl2',
    }

    /**
     * The list of valid backend identifiers that can be requested and matched to backend types.
     * List adopted from https://developer.mozilla.org/de/docs/Web/API/HTMLCanvasElement/getContext.
     */
    export enum BackendRequestType {
        auto = 'auto',
        webgl = 'webgl',
        experimental = 'experimental-webgl',
        webgl1 = 'webgl1',
        experimental1 = 'experimental-webgl1',
        webgl2 = 'webgl2',
        experimental2 = 'experimental-webgl2',
    }

}
