
/* spellchecker: disable */

import { Observable, ReplaySubject } from 'rxjs';

import { vec2, vec4 } from 'gl-matrix';
import { clamp2, parseVec2, parseVec4 } from './gl-matrix-extensions';

import { assert, log, logIf, LogLevel } from './auxiliaries';
import { GLclampf2, GLsizei2, tuple2, tuple4 } from './tuples';


import { Color } from './color';
import { Context } from './context';
import { Controller } from './controller';
import { MouseEventProvider } from './mouseeventprovider';
import { Renderer } from './renderer';
import { Resizable } from './resizable';
import { TouchEventProvider } from './toucheventprovider';
import { Wizard } from './wizard';

/* spellchecker: enable */


/**
 * A canvas is associated to a single canvas element (DOM) and integrates or delegates event handling as well as
 * control over the rendering loop and the attached renderer respectively. Furthermore, the canvas can bind a single
 * renderer (non owning) and sets up communication between controller, renderer, and navigation. The controller invokes
 * the renderer's update, frame, and swap methods. The navigation manipulates the renderer's camera. The renderer can
 * invalidate itself which causes a controller update.
 *
 * Note: Since only the multi-frame number is used by the renderer and the controller, the canvas provides getter,
 * setter, and change callback setter. Debug-frame and frame number are managed exclusively by the controller.
 *
 * Note: the canvas should hold any properties that are required to be passed onto a newly bound renderer (in the case
 * multiple renderer are used with a canvas). The clear color is one example of such a property.
 */
export class Canvas extends Resizable {

    /**
     * Default color that is used if none is set via data attributes.
     */
    protected static readonly DEFAULT_CLEAR_COLOR: Color = new Color([0.203, 0.227, 0.250, 1.0]);

    /**
     * Default frame precision, e.g., accumulation format when multi-frame rendering is used.
     */
    protected static readonly DEFAULT_FRAME_PRECISION: Wizard.Precision = Wizard.Precision.auto;

    /**
     * Default multi-frame number used if none is set via data attributes.
     */
    protected static readonly DEFAULT_MULTI_FRAME_NUMBER = 0;


    /** @see {@link context} */
    protected _context: Context;

    /** @see {@link controller} */
    protected _controller: Controller;

    /** @see {@link renderer} */
    protected _renderer: Renderer | undefined;


    /** @see {@link clearColor} */
    protected _clearColor: Color;


    /**
     * @see {@link framePrecision}
     * This property can be observed, e.g., `aCanvas.framePrecisionObservable.subscribe()`.
     */
    protected _framePrecision: Wizard.Precision;
    protected _framePrecisionSubject = new ReplaySubject<Wizard.Precision>(1);


    /**
     * @see {@link size}
     * This property can be observed, e.g., `aCanvas.sizeObservable.subscribe()`.
     * Zero-initialization prevents drawing on an invalid canvas size, i.e., a canvas size [1, 1] is technically valid
     * for rendering, which might lead to rendering on an [1, 1] canvas before the first 'real' size is set (e.g., via
     * resize event), resulting in visually unpleasant initial frames in some (slow) applications.
     */
    protected _size: GLsizei2 = [0, 0];
    protected _sizeSubject = new ReplaySubject<GLsizei2>(1);

    /**
     * @see {@link frameScale}
     * This property can be observed, `aCanvas.frameScaleObservable.subscribe()`.
     */
    protected _frameScale: GLclampf2;
    protected _frameScaleSubject = new ReplaySubject<GLclampf2>(1);

    /**
     * @see {@link frameSize}
     * This property can be observed, `aCanvas.frameSizeObservable.subscribe()`.
     */
    protected _frameSize: GLsizei2;
    protected _frameSizeSubject = new ReplaySubject<GLsizei2>(1);

    /**
     * Flag used to determine whether frame size or frame scale is the dominant configuration.
     */
    protected _favorSizeOverScale: boolean;


    /** @see {@link element} */
    protected _element: HTMLCanvasElement;

    /** @see {@link mouseEventProvider} */
    protected _mouseEventProvider: MouseEventProvider;

    /** @see {@link touchEventProvider} */
    protected _touchEventProvider: TouchEventProvider;


    /**
     * Create and initialize a multi-frame controller, setup a default multi-frame number and get the canvas's webgl
     * context as well as the canvas resolution. The context and resolution will be passed on to the set renderer and
     * its stages/passes appropriately. The canvas does not provide lazy initialization and is strictly bound to a
     * single canvas element (DOM) that cannot be changed.
     *
     * Note: the multi-frame number can be set using a data attribute in the canvas element called
     * 'data-multi-frame-number'.
     *
     * The canvas supports the following data attributes:
     * - data-multi-frame-number {number} - integer greater than 0
     * - data-clear-color {Color} - rgba color for clearing
     * - data-frame-scale {GLclampf2} - width and height frame scale in [0.0,1.0]
     * - data-frame-size {GLizei2} - width and height frame size in pixel
     * - data-frame-precision {RenderPrecision} - precision for, e.g., frame accumulation
     * , either 'float', 'half', 'byte', or 'auto'.
     *
     * Note: data-frame-size takes precedence if both frame-scale and frame-size data attributes are provided.
     * @param element - Canvas element or element id {string} to be used for querying the canvas element.
     * @param attributes - Overrides the internal default attributes @see{Context.DEFAULT_ATTRIBUTES}.
     */
    constructor(element: HTMLCanvasElement | string, attributes?: WebGLContextAttributes) {
        super(); // setup resize event handling
        this._element = element instanceof HTMLCanvasElement ? element :
            document.getElementById(element) as HTMLCanvasElement;
        this._mouseEventProvider = new MouseEventProvider(this._element, 200);
        this._touchEventProvider = new TouchEventProvider(this._element, 200);

        const dataset = this._element.dataset;

        /* Requesting a context asserts when no context could be created. */
        this._context = Context.request(this._element, attributes);
        this.configureController(dataset);

        this.configureSizeAndScale(dataset);

        /* Retrieve clear color from data attributes or set default. */
        let dataClearColor: vec4 | undefined;
        if (dataset.clearColor) {
            dataClearColor = parseVec4(dataset.clearColor);
            logIf(dataClearColor === undefined, LogLevel.Warning,
                `data-clear-color could not be parsed, given '${dataset.clearColor}'`);
        }
        this._clearColor = dataClearColor ? new Color(tuple4<GLclampf>(dataClearColor)) : Canvas.DEFAULT_CLEAR_COLOR;

        /* Retrieve frame precision (e.g., accumulation format) from data attributes or set default */
        let dataFramePrecision = dataset.accumulationFormat ?
            dataset.accumulationFormat as Wizard.Precision : Canvas.DEFAULT_FRAME_PRECISION;
        if (!(dataFramePrecision in Wizard.Precision)) {
            dataFramePrecision = Canvas.DEFAULT_FRAME_PRECISION;
            log(LogLevel.Warning,
                `unknown frame precision '${dataset.accumulationFormat}' changed to '${dataFramePrecision}'`);
        }
        this._framePrecision = dataFramePrecision;
        this.framePrecisionNext();
    }

    /**
     * Creates and initializes a new controller that is used for this canvas. If provided via data attributes
     * multi-frame number and debug-frame number are set.
     * @param dataset - The attributes data-multi-frame-number and data-debug-frame-number are supported.
     */
    protected configureController(dataset: DOMStringMap): void {
        /* Create and setup a multi-frame controller. */
        this._controller = new Controller();
        this._controller.block(); // Remain in block mode until renderer is bound and configured.

        /* Retrieve multi-frame number from data attributes or set default. */
        let dataMFNum: number | undefined;
        if (dataset.multiFrameNumber) {
            dataMFNum = parseInt(dataset.multiFrameNumber, 10);
            logIf(isNaN(dataMFNum), LogLevel.Warning,
                `data-multi-frame-number could not be parsed, given '${dataset.multiFrameNumber}'`);
        }

        /* Retrieve debug-frame number from data attributes or set default. */
        let dataDFNum: number | undefined;
        if (dataset.debugFrameNumber) {
            dataDFNum = parseInt(dataset.debugFrameNumber, 10);
            logIf(isNaN(dataDFNum), LogLevel.Warning,
                `data-debug-frame-number could not be parsed, given '${dataset.debugFrameNumber}'`);
        }

        this._controller.multiFrameNumber = dataMFNum ? dataMFNum : Canvas.DEFAULT_MULTI_FRAME_NUMBER;
        this._controller.debugFrameNumber = dataDFNum ? dataDFNum : 0;

        const mfNumChanged = dataMFNum ? dataMFNum !== this._controller.multiFrameNumber : false;
        logIf(mfNumChanged, LogLevel.Warning, `data-multi-frame-number changed to `
            + `${this._controller.multiFrameNumber}, given '${dataset.multiFrameNumber}'`);

        const dfNumChanged = dataDFNum ? dataDFNum !== this._controller.debugFrameNumber : false;
        logIf(dfNumChanged, LogLevel.Warning, `data-debug-frame-number changed to `
            + `${this._controller.debugFrameNumber}, given '${dataset.debugFrameNumber}'`);
    }


    /**
     * Initializes the frame size and scale. By default, the scale is 1.0 for width and height and the size reflects
     * the native canvas size.
     * @param dataset - The attributes data-frame-size and data-frame-scale are supported.
     */
    protected configureSizeAndScale(dataset: DOMStringMap): void {

        /* Setup frame scale with respect to the canvas size. */
        let dataFrameScale: vec2 | undefined;
        if (dataset.frameScale) {
            dataFrameScale = parseVec2(dataset.frameScale);
            logIf(dataset.frameScale !== undefined && dataFrameScale === undefined, LogLevel.Warning,
                `data-frame-scale could not be parsed, given '${dataset.frameScale}'`);
        }
        this._frameScale = dataFrameScale ? tuple2<GLfloat>(dataFrameScale) : [1.0, 1.0];

        /* Setup frame size. */
        let dataFrameSize: vec2 | undefined;
        if (dataset.frameSize) {
            dataFrameSize = parseVec2(dataset.frameSize);
            logIf(dataset.frameSize !== undefined && dataFrameSize === undefined, LogLevel.Warning,
                `data-frame-size could not be parsed, given '${dataset.frameSize}'`);
        }
        this._favorSizeOverScale = dataFrameSize !== undefined;
        this._frameSize = dataFrameSize ? tuple2<GLsizei>(dataFrameSize) : [this._size[0], this._size[1]];

        this.onResize(); // invokes frameScaleNext and frameSizeNext
    }


    /**
     * Convenience function that triggers the canvas size retrieval. The native width and height of the canvas dom
     * element is cached (in pixel).
     */
    protected retrieveSize(): void {
        const size = Resizable.elementSize(this._element);
        if (size === undefined) {
            this._size = [0, 0];
            return;
        }
        this._size = [size[0], size[1]];
        this.sizeNext();
    }

    /**
     * Resize is invoked by the resizable mixin. It retrieves the canvas size and promotes it to the renderer.
     */
    protected onResize(): void {
        this.retrieveSize();

        /* If the canvas does not have a size, block rendering. This can happen if the canvas is, e.g., hidden and
        DOM layouting leads to width of zero. */
        if (this._size[0] === 0 || this._size[1] === 0) {
            log(LogLevel.Debug, `canvas width or height is invalid, resize discarded and controller blocked`);
            this._controller.block();
            return;
        }

        /**
         * Set canvas rendering size to pixel size of the canvas. This assures a 1 to 1 mapping of native pixels to
         * fragments and thus should prevent upscaling.
         */
        this._element.width = this._size[0];
        this._element.height = this._size[1];

        if (this._renderer) {
            this._controller.block();
        }

        if (this._favorSizeOverScale) {
            this.frameSize = this._frameSize;
        } else {
            this.frameScale = this._frameScale;
        }

        if (this._renderer) {
            this._controller.unblock();
            /* Swapping here fixes flickering while resizing the canvas for safari. */
            this._renderer.swap();
        }
    }

    /**
     * Utility for communicating this._framePrecision changes to its associated subject.
     */
    protected framePrecisionNext(): void {
        this._framePrecisionSubject.next(this._framePrecision);
    }

    /**
     * Utility for communicating this._size changes to its associated subject.
     */
    protected sizeNext(): void {
        this._sizeSubject.next(this._size);
    }

    /**
     * Utility for communicating this._frameScale changes to its associated subject.
     */
    protected frameScaleNext(): void {
        this._frameScaleSubject.next(this._frameScale);
    }

    /**
     * Utility for communicating this._frameSize changes to its associated subject.
     */
    protected frameSizeNext(): void {
        this._frameSizeSubject.next(this._frameSize);
    }


    /**
     * The renderer (if not null) will be connected to the controller and navigation. The controller will
     * immediately trigger a multi-frame, thereby causing the renderer to render frames.
     *
     * Note that no renderer should be bound to multiple canvases
     * simultaneously. The reference is non owning.
     *
     * @param renderer - Either undefined or an uninitialized renderer.
     */
    protected bind(renderer: Renderer | undefined): void {
        if (this._renderer === renderer) {
            return;
        }
        this.unbind(); // block controller
        if (renderer === undefined) {
            return;
        }
        assert(this._controller.blocked, `expected controller to be blocked`);
        this._renderer = renderer;

        /**
         * Note: a renderer that is to be bound to a canvas is expected to be not initialized. For it, initializable
         * throws on re-initialization. Similarly to the frame callback for the controller, the controller's update
         * method is assigned to the pipelines invalidation event.
         */
        this._renderer.initialize(this.context, (force) => this._controller.update(force),
            this._mouseEventProvider /*, this._keyEventProvider */, this._touchEventProvider);

        this._renderer.frameSize = this._frameSize;
        this._renderer.clearColor = this._clearColor.rgba;
        this._renderer.framePrecision = this._framePrecision;
        this._renderer.debugTexture = -1;

        /**
         * Note: again, no asserts required since controller and renderer already take care of that.
         * Assign the renderer's update, frame, and swap method to the controller's frame and swap event callback.
         * The assignments trigger immediate update and subsequently updates on invalidation.
         */
        this._controller.controllable = this._renderer;
        this._controller.unblock();
    }

    /**
     * Unbinds the current renderer from the canvas as well as the controller and navigation, and uninitializes the
     * renderer.
     */
    protected unbind(): void {
        if (this._renderer === undefined) {
            return;
        }

        this._controller.block();
        /**
         * Since canvas is not the owner of the renderer it should not dispose it. However, the canvas manages the
         * initialization of bound pipelines.
         */
        this._controller.controllable = undefined;
        this._renderer = undefined;
    }


    /**
     * Uninitializes and deletes the controller as well as all other properties.
     */
    dispose(): void {
        super.dispose();

        if (this._renderer) {
            this._renderer.uninitialize();
            this.unbind();
        }
    }

    /**
     * Allows for explicit trigger of onResize, e.g., in case resize event-handling is managed explicitly ...
     */
    resize(): void {
        this.onResize();
    }


    /**
     * Single controller that is managing the rendering control flow of a bound renderer.
     * @returns - The controller used by the canvas.
     */
    get controller(): Controller {
        return this._controller;
    }

    /**
     * The currently bound renderer. If no renderer is bound null is returned. If a renderer is bound, it should
     * always be initialized (renderer initialization handled by the canvas).
     * @returns - The currently bound renderer.
     */
    get renderer(): Renderer | undefined {
        return this._renderer;
    }

    /**
     * Binds a renderer to the canvas. A previously bound renderer will be unbound (see bind and unbind).
     * @param renderer - A renderer object or undefined.
     */
    set renderer(renderer: Renderer | undefined) {
        this.bind(renderer);
    }

    /**
     * Targeted scale for rendering with respect to the canvas size. This property can be observed, e.g.,
     * `canvas.frameScaleObservable.subscribe()`.
     * @returns - The frame scale in [0.0, 1.0].
     */
    get frameScale(): GLclampf2 {
        return this._frameScale;
    }

    /**
     * Set the targeted scale for rendering with respect to the canvas size. The scale will be clamped to [0.0,1.0]. A
     * scale of 0.0 results in 1px frame resolution for the respective component.
     * The frame scale allows to detach the rendering resolution from the native canvas resolution, e.g., in order to
     * decrease rendering cost. The frame resolution can also be specified explicitly by width and height. Non-finite
     * values will be ignored.
     * @param frameScale - Scale of rendering.
     * @returns - The frame scale in [0.0,1.0].
     */
    set frameScale(frameScale: GLclampf2) {
        if (!isFinite(frameScale[0]) || !isFinite(frameScale[1])) {
            log(LogLevel.Warning, `expected finite frame size, non-finite values ignored, given [${frameScale}]`);
            return;
        }
        /* Always apply frame scale, e.g., when canvas is resized scale remains same, but frame size will change. */
        logIf(frameScale[0] < 0.0 || frameScale[0] > 2.0, LogLevel.Info,
            `frame width scale clamped to [0.0,2.0], given ${frameScale[0]}`);
        logIf(frameScale[1] < 0.0 || frameScale[1] > 2.0, LogLevel.Info,
            `frame height scale clamped to [0.0,2.0], given ${frameScale[0]}`);

        const scale = vec2.create();
        clamp2(scale, frameScale, [0.0, 0.0], [2.0, 2.0]);

        const size = vec2.create();
        vec2.mul(size, this._size, scale);
        vec2.max(size, [1, 1], size);
        vec2.round(size, size);

        /* Adjust scale based on rounded (integer) frame size. */
        vec2.div(scale, size, this._size);
        logIf(!vec2.exactEquals(scale, frameScale), 2,
            `frame scale was adjusted to ${scale.toString()}, given ${frameScale.toString()}`);

        this._frameScale = tuple2<GLclampf>(scale);
        this._frameSize = tuple2<GLsizei>(size);
        this._favorSizeOverScale = false;

        this.frameScaleNext();
        this.frameSizeNext();

        if (this._renderer) {
            this._renderer.frameSize = this._frameSize;
        }
    }

    /**
     * Observable that can be used to subscribe to frame scale changes.
     */
    get frameScale$(): Observable<GLclampf2> {
        return this._frameScaleSubject.asObservable();
    }


    /**
     * Targeted resolution (width and height) for rendering in pixel. This property can be observed, e.g.,
     * `canvas.frameSizeObservable.subscribe()`.
     * @returns - The frame size in pixel (must not be physical/native pixels).
     */
    get frameSize(): GLsizei2 {
        return this._frameSize;
    }

    /**
     * Set the targeted size for rendering in pixels. The size will be clamped to [1, canvas-size]. The frame size
     * allows to detach the rendering resolution from the native canvas resolution, e.g., in order to decrease
     * rendering cost. Non-finite values will be ignored.
     * The render resolution can also be specified implicitly by width and height in scale (@see frameScale).
     * @param frameSize - Size for rendering in pixel (must not be physical/native pixels).
     * @returns - The frame size in [1, canvas-size].
     */
    set frameSize(frameSize: GLsizei2) {
        if (!isFinite(frameSize[0]) || !isFinite(frameSize[1])) {
            log(LogLevel.Warning, `expected finite frame size, non-finite values ignored, given [${frameSize}]`);
            return;
        }
        logIf(frameSize[0] < 1 || frameSize[0] > this._size[0], LogLevel.Info,
            `frame width scale clamped to [1,${this._size[0]}], given ${frameSize[0]}`);
        logIf(frameSize[1] < 1 || frameSize[1] > this._size[1], LogLevel.Info,
            `frame height scale clamped to [1, ${this._size[1]}], given ${frameSize[1]}`);

        const size = vec2.create();
        clamp2(size, frameSize, [1.0, 1.0], this._size);
        vec2.round(size, size);

        logIf(!vec2.exactEquals(size, frameSize), LogLevel.Warning,
            `frame size was adjusted to ${size.toString()}, given ${frameSize.toString()}`);

        const scale = vec2.create();
        vec2.div(scale, size, this._size);

        this._frameScale = tuple2<GLclampf>(scale);
        this._frameSize = tuple2<GLsizei>(size);
        /* Switch back to default mode (scale based) when frame size matches canvas size. */
        this._favorSizeOverScale = !vec2.exactEquals(this._frameSize, this._size);

        this.frameScaleNext();
        this.frameSizeNext();

        if (this._renderer) {
            this._renderer.frameSize = this._frameSize;
        }
    }

    /**
     * Observable that can be used to subscribe to frame size changes.
     */
    get frameSize$(): Observable<GLsizei2> {
        return this._frameSizeSubject.asObservable();
    }


    /**
     * Getter for the canvas's clear color. The clear color is provided to the renderer (on bind). Since this is a
     * canvas specific setting it is stored here, not in a renderer or controller.
     * @returns - Color object passed to any renderer bound to this canvas.
     */
    get clearColor(): Color {
        return this._clearColor;
    }

    /**
     * Sets the clear color that is then passed to the currently bound renderer as well as to any pipelines bound in
     * the future. The provided color will be clamped to [0.0;1.0] for every component.
     * @param clearColor - Color object that will be referenced.
     */
    set clearColor(clearColor: Color) {
        this._clearColor = clearColor;
        if (this._renderer) {
            this._renderer.clearColor = this._clearColor.rgba;
        }
    }


    /**
     * Getter for the targeted frame precision. This property can be observed, e.g.,
     * `canvas.framePrecisionObservable.subscribe()`.
     * @returns - Accumulation format as string passed to any renderer bound.
     */
    get framePrecision(): Wizard.Precision {
        return this._framePrecision;
    }

    /**
     * Sets the targeted frame precision that is then passed to the currently bound renderer as well as to any renderers
     * bound in the future. This might be used for frame accumulation in multi-frame based rendering.
     * @param precision - Frame precision, 'float', 'half', 'byte' or 'auto' are supported.
     */
    set framePrecision(precision: Wizard.Precision) {
        this._framePrecision = precision;

        if (this._renderer) {
            this._renderer.framePrecision = this._framePrecision;
            this._framePrecision = this._renderer.framePrecision; // might change due to missing support
        }
        this.framePrecisionNext();
    }

    /**
     * Observable that can be used to subscribe to frame precision changes.
     */
    get framePrecision$(): Observable<string> {
        return this._framePrecisionSubject.asObservable();
    }


    /**
     * Provides access to the WebGL context (leaky abstraction).
     */
    get context(): Context {
        return this._context;
    }

    /**
     * Getter for the created rendering backend (webgl context type).
     * @returns - Backend that was created on construction, either 'webgl' or 'webgl2' based on which one was created
     * successfully. If no context could be created null is returned.
     */
    get backend(): string {
        return this._context.backendString as string;
    }


    /**
     * Size of the canvas measured in physical/native screen pixels. This is the 'managed' canvas width and height. The
     * unmanaged canvas width and height are available via context.gl.canvas.width and context.gl.canvas.height (which
     * should always be the same).
     * This property can be observed, e.g., `allocationRegister.bytesObservable.subscribe()`.
     * @returns - The canvas width and height in physical/native screen pixels as 2-tuple.
     */
    get size(): GLsizei2 {
        return this._size;
    }

    /**
     * Observable that can be used to subscribe to canvas size changes.
     */
    get size$(): Observable<GLsizei2> {
        return this._sizeSubject.asObservable();
    }


    /**
     * Width of the canvas measured in physical/native screen pixels. This is the 'managed' canvas width. The
     * unmanaged canvas width is available via context.gl.canvas_width (which should always be the same).
     * @returns - The canvas width in physical/native screen pixels.
     */
    get width(): GLsizei {
        return this._size[0];
    }

    /**
     * Height of the canvas measured in physical/native screen pixels. This is the 'managed' canvas height. The
     * unmanaged canvas height is available via context.gl.canvas_height (which should always be the same).
     * @returns - The canvas height in physical/native screen pixels.
     */
    get height(): GLsizei {
        return this._size[1];
    }


    /**
     * Canvas element within the HTML5 document.
     */
    get element(): HTMLElement {
        return this._element;
    }


    /**
     * Canvas mouse event provider referring to the canvas element.
     */
    get mouseEventProvider(): MouseEventProvider {
        return this._mouseEventProvider;
    }

    /**
     * Canvas touch event provider referring to the canvas element.
     */
    get touchEventProvider(): TouchEventProvider {
        return this._touchEventProvider;
    }
}
