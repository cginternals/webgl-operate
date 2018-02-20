
import { vec2, vec4 } from 'gl-matrix';
import { clamp2, clamp4, parseVec2, parseVec4 } from './core/gl-matrix-extensions';

import { log_if, LogLevel } from './core/auxiliaries';
import { clampf2, GLclampf2, GLfloat2, GLsizei2, tuple2, tuple4 } from './core/tuples';

// import { Observable } from './core/observable';
import { Color } from './core/color';
import { Context } from './core/context';
import { Resizable } from './core/resizable';

// import { Controller } from './core/controller';
// import { Navigation } from './core/navigation';
// import { Renderer } from './core/renderer';
// import { SomeNavigation } from './core/somenavigation';


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

    //     protected static readonly DEFAULT_ACCUMULATION_FORMAT: string = 'auto';

    //     /**
    //      * Default multi-frame number used if none is set via data attributes.
    //      */
    //     protected static readonly DEFAULT_MULTI_FRAME_NUMBER: number = 8;


    protected _context: Context;

    //     /**
    //      * Single controller that is managing the rendering control flow of a bound pipeline.
    //      */
    //     protected _controller: Controller;

    //     /**
    //      * Pipeline that is exclusively used by this canvas. Note that no pipeline should be bound to multiple canvases
    //      * simultaneously. The reference is non owning.
    //      */
    //     protected _pipeline: Pipeline;

    //     protected _navigation: Navigation;

    /**
     * Clear color provided to the pipeline (on bind). Since this is a canvas specific setting it is stored here, not
     * in pipeline or controller.
     */
    protected _clearColor: Color;

    //     protected _accumulationFormat: string;

    //     accumulationFormatObservable: Observable<string>;


    /**
     * @see {@link size}
     */
    protected _size: GLsizei2 = [1, 1];

    //     /**
    //      * Size observable that enables observation of value changes of size.
    //      * ```
    //      * aCanvas.sizeObservable.observe(function (canvasSize) { ... });
    //      * ```
    //      */
    //     sizeObservable: Observable<vec2>;

    /**
     * Intermediate frame scale with respect to the canvas size. This is provided to the pipeline for rendering.
     */
    protected _frameScale: GLfloat2;
    //     /**
    //      * Frame scale observable that enables observation of value changes of frame scale.
    //      * ```
    //      * aCanvas.frameScaleObservable.observe(function (frameScale) { ... });
    //      * ```
    //      */
    //     frameScaleObservable: Observable<vec2>;

    /**
     * Intermediate frame size which is provided to the pipeline for rendering.
     */
    protected _frameSize: GLsizei2;
    //     /**
    //      * Frame size observable that enables observation of value changes of frame size.
    //      * ```
    //      * aCanvas.frameSizeObservable.observe(function (frameSize) { ... });
    //      * ```
    //      */
    //     frameSizeObservable: Observable<vec2>;

    /**
     * Flag used to determine whether frame size or frame scale is the dominant configuration.
     */
    protected _favorSizeOverScale: boolean;

    /**
     * Canvas element within the HTML5 document.
     */
    protected _element: HTMLCanvasElement;

    //     protected _eventListenersByType = new Array<[string, { (event: Event): void }]>(
    //         ['contextmenu', (event) => { // disable context menu for canvas
    //             event.preventDefault();
    //             event.stopPropagation();
    //             return false;
    //         }]);

    //     /**
    //      * Create and initialize a multi-frame controller, setup a default multi-frame number and get the canvas's webgl
    //      * context as well as the canvas resolution. The context and resolution will be passed on to the set pipeline and
    //      * its stages appropriately. The canvas does not provide lazy initialization and is strictly bound to a single
    //      * canvas element (DOM) that cannot be changed.
    //      *
    //      * Note: the multi-frame number can be set using a data attribute in the canvas element called
    //      * 'data-multi-frame-number'.
    //      *
    //      * The canvas supports the following data attributes:
    //      * - data-multi-frame-number {number} - integer greater than 0
    //      * - data-clear-color {vec4} - rgba color for clearing
    //      * - data-frame-scale {vec2} - width and height frame scale in [0.0,1.0]
    //      * - data-frame-size {vec2} - width and height frame size in pixel
    //      *
    //      * Note: data-frame-size takes precedence if both frame-scale and frame-size data attributes are provided.
    //      *
    //      * @param element - Canvas element.
    //      */
    constructor(element: HTMLCanvasElement | string) {
        super(); // setup resize event handling

        this._element = element instanceof HTMLCanvasElement ? element :
            document.getElementById(element) as HTMLCanvasElement;

        const dataset = this._element.dataset;

        /* Requesting a context asserts when no context could be created. */
        this._context = Context.request(this._element);
        // this.configureController(dataset);
        // this.configureNavigation();

        this.configureSizeAndScale(dataset);

        /* Retrieve clear color from data attributes or set default. */
        let dataClearColor: vec4 | undefined;
        if (dataset.clearColor) {
            dataClearColor = parseVec4(dataset.clearColor as string);
            log_if(dataset.clearColor !== undefined && dataClearColor === undefined, LogLevel.Dev,
                `data-clear-color could not be parsed, given '${dataset.clearColor}'`);
        }
        this._clearColor = dataClearColor ? new Color(tuple4<GLclampf>(dataClearColor)) : Canvas.DEFAULT_CLEAR_COLOR;

        // // retrieve accumulation format from data attributes or set default
        // const dataAccumFormat = dataset.accumulationFormat;
        // this._accumulationFormat = dataAccumFormat ? dataAccumFormat : Canvas.DEFAULT_ACCUMULATION_FORMAT;

        // this.accumulationFormatObservable = new Observable<string>(() => this.accumulationFormat);


        // for (const eventListener of this._eventListenersByType) {
        //     this._element.addEventListener(eventListener[0], eventListener[1]);
        // }
    }

    /**
     * Creates and initializes a new controller that is used for this canvas. If provided via data attributes
     * multi-frame number and debug-frame number are set.
     * @param dataset - The attributes data-multi-frame-number and data-debug-frame-number are supported.
     */
    protected configureController(dataset: DOMStringMap) {
        /* Create and setup a multi-frame controller. */
        // this._controller = new Controller();
        // this._controller.initialize([]);
        // this._controller.block(); // Remain in block mode until pipeline is bound and configured.

        // const mfNum: number = parseInt(dataset.multiFrameNumber, 10);
        // const dfNum: number = parseInt(dataset.debugFrameNumber, 10);

        // log_if(dataset.multiFrameNumber && isNaN(mfNum), 1, `data-multi-frame-number is not a number`);
        // log_if(dataset.debugFrameNumber && isNaN(dfNum), 1, `data-debug-frame-number is not a number`);

        // // parse date attributes for multi-frame number
        // this._controller.multiFrameNumber = !isNaN(mfNum) ? mfNum : Canvas.DEFAULT_MULTI_FRAME_NUMBER;
        // this._controller.debugFrameNumber = !isNaN(dfNum) ? dfNum : 0;

        // const mfChanged: boolean = dataset.multiFrameNumber && (mfNum !== this._controller.multiFrameNumber ||
        //     mfNum.toString() !== dataset.multiFrameNumber.trim());
        // log_if(mfChanged, 1, `data-multi-frame-number changed to `
        //     + `${this._controller.multiFrameNumber}, given '${dataset.multiFrameNumber}'`);

        // const dfChanged: boolean = dataset.debugFrameNumber && (dfNum !== this._controller.debugFrameNumber ||
        //     dfNum.toString() !== dataset.debugFrameNumber.trim());
        // log_if(dfChanged, 1, `data-debug-frame-number changed to `
        //     + `${this._controller.debugFrameNumber}, given '${dataset.debugFrameNumber}'`);
    }

    /**
     * Create and setup a navigation for camera control.
     */
    protected configureNavigation() {
        // this._navigation = new SomeNavigation();
        // this._navigation.initialize(this._element, () => this._controller.update());
    }

    /**
     * Initializes the frame size and scale. By default, the scale is 1.0 for width and height and the size reflects
     * the native canvas size.
     * @param dataset - The attributes data-frame-size and data-frame-scale are supported.
     */
    protected configureSizeAndScale(dataset: DOMStringMap) {
        /* Retrieve native canvas size. */
        // this.sizeObservable = new Observable<vec2>(() => this.size);

        /* Setup frame scale with respect to the canvas size. */
        let dataFrameScale: vec2 | undefined;
        if (dataset.frameScale) {
            dataFrameScale = parseVec2(dataset.frameScale);
            log_if(dataset.frameScale !== undefined && dataFrameScale === undefined, LogLevel.Dev,
                `data-frame-scale could not be parsed, given '${dataset.frameScale}'`);
        }
        this._frameScale = dataFrameScale ? tuple2<GLfloat>(dataFrameScale) : [1.0, 1.0];
        // this.frameScaleObservable = new Observable<vec2>(() => this.frameScale);

        /* Setup frame size. */
        let dataFrameSize: vec2 | undefined;
        if (dataset.frameSize) {
            dataFrameSize = parseVec2(dataset.frameSize);
            log_if(dataset.frameSize !== undefined && dataFrameSize === undefined, LogLevel.Dev,
                `data-frame-size could not be parsed, given '${dataset.frameSize}'`);
        }
        this._favorSizeOverScale = dataFrameSize !== undefined;
        this._frameSize = dataFrameSize ? tuple2<GLsizei>(dataFrameSize) : [this._size[0], this._size[1]];
        // this.frameSizeObservable = new Observable<vec2>(() => this.frameSize);

        this.onResize();
    }


    /**
     * Convenience function that triggers the canvas size retrieval. The native width and height of the canvas dom
     * element is cached (in pixel).
     */
    protected retrieveSize(): void {
        const size = Resizable.elementSize(this._element);
        this._size = [size[0], size[1]];
    }

    /**
     * Resize is invoked by the resizable mixin. It retrieves the canvas size and promotes it to the multi-frame
     * rendering.
     */
    protected onResize() {
        this.retrieveSize();

        /**
         * Set canvas rendering size to pixel size of the canvas. This assures a 1 to 1 mapping of native pixels to
         * fragments and thus should prevent upscaling.
         */
        this._element.width = this._size[0];
        this._element.height = this._size[1];

        // if (this._pipeline) {
        //     this._controller.block();
        //     this._pipeline.canvasSize = this._size;
        // }

        if (this._favorSizeOverScale) {
            this.frameSize = this._frameSize;
        } else {
            this.frameScale = this._frameScale;
        }

        // if (this._pipeline) {
        //     this._controller.unblock();
        // }

        // this.sizeObservable.changed();
    }


    /**
     * Uninitializes and deletes the controller as well as all other properties.
     */
    dispose() {
        super.dispose();

        // for (const eventListener of this._eventListenersByType) {
        //     this._element.removeEventListener(eventListener[0], eventListener[1]);
        // }

        // this._controller.uninitialize();
        // this._navigation.uninitialize();

        //  if (this._pipeline) {
        //      // we do not destroy the pipeline (not owned)
        //      this._pipeline.uninitialize();
        //  }
    }

    //     /**
    //      * The controller used by the canvas for multi-frame control.
    //      *
    //      * @returns The controller used by the canvas.
    //      */
    //     get controller(): Controller {
    //         return this._controller;
    //     }

    //     get navigation(): Navigation {
    //         return this._navigation;
    //     }


    /**
     * Allows for explicit trigger of onResize, e.g., in case resize event-handling is managed explicitly ...
     */
    resize(): void {
        this.onResize();
    }


    //     /**
    //      * The pipeline (if not null) will be connected to the controller and navigation. The controller will immediately
    //      * trigger a multi-frame, thereby causing the pipeline to render frames.
    //      *
    //      * @todo connect a navigation to the pipeline
    //      *
    //      * @param pipeline - Either null or an uninitialized pipeline.
    //      */
    //     bind(pipeline: Pipeline) {
    //         this._controller.block();

    //         this._pipeline = pipeline;
    //         if (!this._pipeline) {
    //             return;
    //         }

    //         /**
    //          * Note: a pipeline that is to be bound to a canvas is expected to be not initialized. For it, initializable
    //          * throws on re-initialization. Similarly to the frame callback for the controller, the controller's update
    //          * method is assigned to the pipelines invalidation event.
    //          */
    //         this._pipeline.initialize(this.context, () => this._controller.update());

    //         this._pipeline.canvasSize = this._size;
    //         this._pipeline.frameSize = this._frameSize;
    //         this._pipeline.clearColor = this._clearColor;
    //         this._pipeline.accumulationFormat = this._accumulationFormat;

    //         /**
    //          * Note: again, no asserts required since controller and pipeline already take care of that.
    //          *
    //          * Assign the pipeline's update, frame, and swap method to the controller's frame and swap event callback. The
    //          * assignments trigger immediate update and subsequently updates on invalidation.
    //          */
    //         this._controller.updateCallback = (multiFrameNumber: number) => this._pipeline.update(multiFrameNumber);
    //         this._controller.frameCallback = (frameNumber: number) => this._pipeline.frame(frameNumber);
    //         this._controller.swapCallback = () => this._pipeline.swap();

    //         this._navigation.coordsAccess = (x: GLint, y: GLint, zInNDC?: number,
    //             viewProjectionInverse?: mat4) => this._pipeline.coordsAt(x, y, zInNDC, viewProjectionInverse);
    //         this._navigation.idAccess = (x: GLint, y: GLint) => this._pipeline.idAt(x, y);
    //         this._navigation.camera = this._pipeline.camera;

    //         this._controller.unblock();
    //     }

    //     /**
    //      * Unbinds the current pipeline from the canvas as well as the controller and navigation, and uninitializes the
    //      * pipeline.
    //      */
    //     unbind() {
    //         if (!this._pipeline) {
    //             return;
    //         }

    //         this._controller.block();
    //         /**
    //          * Since canvas is not the owner of the pipeline it should not destroy it. However, the canvas manages the
    //          * initialization of bound pipelines.
    //          */
    //         this._controller.updateCallback = undefined;
    //         this._controller.frameCallback = undefined;
    //         this._controller.swapCallback = undefined;
    //     }

    //     /**
    //      * The currently bound pipeline. If no pipeline is bound null is returned. If a pipeline is bound, it should always
    //      * be initialized (pipeline initialization handled by the canvas).
    //      *
    //      * @returns The currently bound pipeline.
    //      */
    //     get pipeline(): Pipeline {
    //         return this._pipeline;
    //     }

    //     /**
    //      * Binds a pipeline to the canvas. A previously bound pipeline will be unbound (see bind and unbind).
    //      *
    //      * @param {Pipeline} pipeline - a pipeline object or null
    //      */
    //     set pipeline(pipeline: Pipeline) {
    //         this.unbind();
    //         this.bind(pipeline);
    //     }

    /**
     * Scale of the multi-frame with respect to the canvas size.
     * @returns - The frame scale in [0.0, 1.0].
     */
    get frameScale(): GLclampf2 {
        return this._frameScale;
    }

    /**
     * Set the scale of the multi-frame with respect to the canvas size. The scale will be clamped to [0.0,1.0]. A
     * scale of 0.0 results in 1px frame resolution for the respective component.
     * The frame scale allows to detach the rendering resolution from the native canvas resolution, e.g., in order to
     * decrease rendering cost. The frame resolution can also be specified explicitly by width and height.
     * @param frameScale - Scale of the multi-frame.
     * @returns - The frame scale in [0.0,1.0].
     */
    set frameScale(frameScale: GLclampf2) {
        /* Always apply frame scale, e.g., when canvas is resized scale remains same, but frame size will change. */
        log_if(frameScale[0] < 0.0 || frameScale[0] > 1.0, LogLevel.Dev,
            `frame width scale clamped to [0.0,1.0], given ${frameScale[0]}`);
        log_if(frameScale[1] < 0.0 || frameScale[1] > 1.0, LogLevel.Dev,
            `frame height scale clamped to [0.0,1.0], given ${frameScale[0]}`);

        const scale = vec2.create();
        clamp2(scale, frameScale, [0.0, 0.0], [1.0, 1.0]);

        const size = vec2.create();
        vec2.mul(size, this._size, scale);
        vec2.max(size, [1, 1], size);
        vec2.round(size, size);

        /* Adjust scale based on rounded (integer) frame size. */
        vec2.div(scale, size, this._size);
        log_if(!vec2.exactEquals(scale, frameScale), 2,
            `frame scale was adjusted to ${scale.toString()}, given ${frameScale.toString()}`);

        this._frameScale = tuple2<GLclampf>(scale);
        this._frameSize = tuple2<GLsizei>(size);
        this._favorSizeOverScale = false;

        // if (this._pipeline) {
        //     this._pipeline.frameSize = this._frameSize;
        // }

        // this.frameScaleObservable.changed();
        // this.frameSizeObservable.changed();
    }


    /**
     * Resolution (width and height) of the multi-frame in pixel.
     * @returns - The frame size in pixel (must not be physical/native pixels).
     */
    get frameSize(): GLsizei2 {
        return this._frameSize;
    }

    /**
     * Set the size of the multi-frame in pixels. The size will be clamped to [1, canvas-size]. The frame size allows to
     * detach the rendering resolution from the native canvas resolution, e.g., in order to decrease rendering cost.
     * The frame resolution can also be specified implicitly by width and height in scale (@see frameScale).
     * @param frameSize - Size of the multi-frame in pixel (must not be physical/native pixels).
     * @returns - The frame size in [1, canvas-size].
     */
    set frameSize(frameSize: GLsizei2) {
        log_if(frameSize[0] < 1 || frameSize[0] > this._size[0], 1,
            `frame width scale clamped to [1,${this._size[0]}], given ${frameSize[0]}`);
        log_if(frameSize[1] < 1 || frameSize[1] > this._size[1], 1,
            `frame height scale clamped to [1, ${this._size[1]}], given ${frameSize[1]}`);

        const size = vec2.create();
        clamp2(size, frameSize, [1.0, 1.0], this._size);
        vec2.round(size, size);

        log_if(!vec2.exactEquals(size, frameSize), 2,
            `frame size was adjusted to ${size.toString()}, given ${frameSize.toString()}`);

        const scale = vec2.create();
        vec2.div(scale, size, this._size);

        this._frameScale = tuple2<GLclampf>(scale);
        this._frameSize = tuple2<GLsizei>(size);
        /* Switch back to default mode (scale based) when frame size matches canvas size. */
        this._favorSizeOverScale = !vec2.exactEquals(this._frameSize, this._size);


        // if (this._pipeline) {
        //     this._pipeline.frameSize = this._frameSize;
        // }

        // this.frameSizeObservable.changed();
        // this.frameScaleObservable.changed();
    }

    /**
     * Getter for the canvas's clear color.
     * @returns - Color object passed to any renderer bound to this canvas.
     */
    get clearColor(): Color {
        return this._clearColor;
    }

    /**
     * Sets the clear color that is then passed to the currently bound pipeline as well as to any pipelines bound in
     * the future. The provided color will be clamped to [0.0;1.0] for every component.
     * @param clearColor - Color object that will be referenced.
     */
    set clearColor(clearColor: Color) {
        this._clearColor = clearColor;
        // if (this._pipeline) {
        //     this._pipeline.clearColor = this._clearColor;
        // }
    }

    //     /**
    //      * Getter for the accumulation format.
    //      *
    //      * @returns Accumulation format as string passed to any pipeline bound.
    //      */
    //     get accumulationFormat(): string {
    //         return this._accumulationFormat;
    //     }

    //     /**
    //      * Sets the accumulation format that is then passed to the currently bound pipeline as well as to any pipelines
    //      * bound in the future.
    //      *
    //      * @param format - Accumulation format as string, 'float', 'half', 'byte' or 'auto' are supported. Any unsupported
    //      * format will result in 'auto'.
    //      */
    //     set accumulationFormat(format: string) {
    //         this._accumulationFormat = format;
    //         if (this._pipeline) {
    //             this._pipeline.accumulationFormat = this._accumulationFormat;
    //             this._accumulationFormat = this._pipeline.accumulationFormat; // might change due to missing support
    //         }
    //         this.accumulationFormatObservable.changed();
    //     }

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
     * @returns - The canvas width and height in physical/native screen pixels as 2-tuple.
     */
    get size(): GLsizei2 {
        return this._size;
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
}
