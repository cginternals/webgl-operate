
/* spellchecker: disable */

import {
    Canvas,
    Context,
    DefaultFramebuffer,
    Framebuffer,
    GaussFilter,
    Invalidate,
    Renderbuffer,
    Renderer,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


class GaussFilterRenderer extends Renderer {

    protected _inputTexture: Texture2D;

    protected _gaussFilter: GaussFilter;
    protected _defaultFBO: DefaultFramebuffer;

    protected _intermediateColor: Texture2D;
    protected _intermediateDepth: Renderbuffer;
    protected _intermediateFBO: Framebuffer;


    /**
     * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param mouseEventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate,
        /* mouseEventProvider: MouseEventProvider, */
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {

        const gl = this._context.gl;

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        this._gaussFilter = new GaussFilter(this._context);
        this._gaussFilter.initialize();
        this._gaussFilter.kernelSize = 13;
        this._gaussFilter.standardDeviation = 6.0;

        this._intermediateColor = new Texture2D(this._context, 'IntermediateTexture');
        this._intermediateDepth = new Renderbuffer(this._context, 'IntermediateRenderbuffer');
        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');

        const internalFormatAndType = Wizard.queryInternalTextureFormat(this._context, gl.RGBA, Wizard.Precision.byte);
        this._inputTexture = new Texture2D(this._context);
        this._inputTexture.initialize(64, 64, internalFormatAndType[0], gl.RGBA, internalFormatAndType[1]);
        this._inputTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._inputTexture.filter(gl.LINEAR, gl.LINEAR);
        this._inputTexture.load('/examples/data/opensans2048p160d16.png');

        return true;
    }

    /**
     * Uninitializes Buffers, Textures, and Program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._inputTexture.uninitialize();

        this._intermediateFBO.uninitialize();
        this._intermediateDepth.uninitialize();
        this._intermediateColor.uninitialize();

        this._gaussFilter.uninitialize();

        this._defaultFBO.uninitialize();

    }

    /**
     * This is invoked in order to check if rendering of a frame is required by means of implementation specific
     * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
     * changed or the renderer was invalidated @see{@link invalidate}.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {
        return true;
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        if (!this._intermediateFBO.initialized) {
            const internalFormatAndType = Wizard.queryInternalTextureFormat(
                this._context, gl.RGBA, Wizard.Precision.byte);
            this._intermediateColor.initialize(
                this._frameSize[0], this._frameSize[1], internalFormatAndType[0], gl.RGBA, internalFormatAndType[1]);
            this._intermediateDepth.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._intermediateColor],
            [gl.DEPTH_ATTACHMENT, this._intermediateDepth]]);
            this._intermediateFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
            this._intermediateFBO.clearDepth(1.0);
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
        }

        //this._altered.reset();
    }

    /**
     * After (1) update and (2) preparation are invoked, a frame is invoked. Renders both 2D and 3D labels.
     * @param frameNumber - for intermediate frames in accumulation rendering
     */
    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
        this._gaussFilter.filter(this._inputTexture, GaussFilter.Direction.Horizontal);

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
        this._gaussFilter.filter(this._intermediateColor, GaussFilter.Direction.Vertical);
    }

}


export class GaussFilterExample extends Example {

    private _canvas: Canvas;
    private _renderer: GaussFilterRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: true });
        // I don't know why, but this has to be set > 2
        this._canvas.controller.multiFrameNumber = 3;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new GaussFilterRenderer();
        this._canvas.renderer = this._renderer;

        return true;
    }

    uninitialize(): void {
        this._canvas.dispose();
        (this._renderer as Renderer).uninitialize();
    }

    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): GaussFilterRenderer {
        return this._renderer;
    }

}
