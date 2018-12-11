
/* spellchecker: disable */

import { auxiliaries } from 'webgl-operate';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    FontFace,
    Invalidate,
    Label,
    LabelRenderPass,
    Position2DLabel,
    Renderer,
    Text,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


class LabelAnchorRenderer extends Renderer {

    protected _extensions = false;

    protected _labelPass: LabelRenderPass;

    protected _labelTop: Position2DLabel;
    protected _labelAscent: Position2DLabel;
    protected _labelCenter: Position2DLabel;
    protected _labelBaseline: Position2DLabel;
    protected _labelDescent: Position2DLabel;
    protected _labelBottom: Position2DLabel;


    protected _camera: Camera;

    protected _defaultFBO: DefaultFramebuffer;


    protected _fontFace: FontFace | undefined;

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

        /* Create framebuffers, textures, and render buffers. */

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        /* Create and configure test navigation. */

        this._camera = new Camera();

        /* Create and configure label pass. */

        this._labelPass = new LabelRenderPass(context);
        this._labelPass.initialize();
        this._labelPass.camera = this._camera;
        this._labelPass.target = this._defaultFBO;
        this._labelPass.depthMask = false;

        FontFace.fromFile('./data/opensans2048p160d16.fnt', context)
            .then((fontFace) => {
                for (const label of this._labelPass.labels) {
                    label.fontFace = fontFace;
                }
                this._fontFace = fontFace;
                this.updateLabels();
                this.invalidate();
            })
            .catch((reason) => auxiliaries.log(auxiliaries.LogLevel.Error, reason));

        this.setupScene();

        return true;
    }

    /**
     * Uninitializes Buffers, Textures, and Program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._defaultFBO.uninitialize();
        this._labelPass.uninitialize();
    }

    /**
     * This is invoked in order to check if rendering of a frame is required by means of implementation specific
     * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
     * changed or the renderer was invalidated @see{@link invalidate}.
     * Updates the navigaten and the AntiAliasingKernel.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {

        for (const label of this._labelPass.labels) {
            if (label.altered || label.color.altered) {
                return true;
            }
        }
        return this._altered.any || this._camera.altered;
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {

        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
            this._camera.viewport = this._canvasSize;

            this.updateLabels();
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._labelPass.update();

        this._altered.reset();
        this._camera.altered = false;
    }

    /**
     * After (1) update and (2) preparation are invoked, a frame is invoked. Renders both 2D and 3D labels.
     * @param frameNumber - for intermediate frames in accumulation rendering
     */
    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._camera.viewport[0], this._camera.viewport[1]);

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
        this._labelPass.frame();
    }

    /**
     * After (1) update, (2) preparation, and (3) frame are invoked, a swap is invoked for multi-frame rendering.
     */
    protected onSwap(): void {
    }

    /**
     * Sets up an example scene with 2D and 3D labels and sets the corresponding data on LabelGeometries. The
     * FontFace is set on each label by the LabelRenderPass.
     */
    protected setupScene(): void {

        /** Wrapped labels, showcasing Ellipsis and NewLine */

        const kafka = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in \
his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his \
brown belly, slightly domed and divided by arches into stiff sections.';

        this._labelTop = new Position2DLabel(new Text(`Label.Anchor.Top |  ${kafka}`), Label.Type.Dynamic);
        this._labelTop.lineAnchor = Label.LineAnchor.Top;

        this._labelAscent = new Position2DLabel(new Text(`Label.Anchor.Ascent |  ${kafka}`), Label.Type.Dynamic);
        this._labelAscent.lineAnchor = Label.LineAnchor.Ascent;

        this._labelCenter = new Position2DLabel(new Text(`Label.Anchor.Center |  ${kafka}`), Label.Type.Dynamic);
        this._labelCenter.lineAnchor = Label.LineAnchor.Center;

        this._labelBaseline = new Position2DLabel(new Text(`Label.Anchor.Baseline |  ${kafka}`), Label.Type.Dynamic);
        this._labelBaseline.lineAnchor = Label.LineAnchor.Baseline;

        this._labelDescent = new Position2DLabel(new Text(`Label.Anchor.Descent |  ${kafka}`), Label.Type.Dynamic);
        this._labelDescent.lineAnchor = Label.LineAnchor.Descent;

        this._labelBottom = new Position2DLabel(new Text(`Label.Anchor.Bottom |  ${kafka}`), Label.Type.Dynamic);
        this._labelBottom.lineAnchor = Label.LineAnchor.Bottom;

        this._labelPass.labels = [this._labelTop, this._labelAscent, this._labelCenter,
        this._labelBaseline, this._labelDescent, this._labelBottom];

        for (const label of this._labelPass.labels) {
            label.fontSize = 20;
            label.color.fromHex('#fff');
            label.fontSizeUnit = Label.Unit.Pixel;
        }
    }

    protected updateLabels(): void {
        if (!this._labelBaseline.valid) {
            return;
        }

        const step = this._canvasSize[1] / 6.0;
        const top = 2.5 * step;
        const width = this._canvasSize[0] - 32.0 /* margin */ * Label.devicePixelRatio();

        this._labelTop.position = [-width * 0.5, top - 0.0 * step];
        this._labelAscent.position = [-width * 0.5, top - 1.0 * step];
        this._labelCenter.position = [-width * 0.5, top - 2.0 * step];
        this._labelBaseline.position = [-width * 0.5, top - 3.0 * step];
        this._labelDescent.position = [-width * 0.5, top - 4.0 * step];
        this._labelBottom.position = [-width * 0.5, top - 5.0 * step];
    }

}


export class LabelAnchorExample extends Example {

    private _canvas: Canvas;
    private _renderer: LabelAnchorRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: true });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new LabelAnchorRenderer();
        this._canvas.renderer = this._renderer;

        const hrStyle = 'z-index: 1; position: absolute; width: 99%; margin: 0;'
            + 'border-color: #27aae1; border-style: dashed; border-width: 1px;';

        const hr0 = document.createElement('hr');
        hr0.setAttribute('style', `${hrStyle} top:  8.3333%;`);
        const hr1 = document.createElement('hr');
        hr1.setAttribute('style', `${hrStyle} top: 25.0000%;`);
        const hr2 = document.createElement('hr');
        hr2.setAttribute('style', `${hrStyle} top: 41.6666%;`);
        const hr3 = document.createElement('hr');
        hr3.setAttribute('style', `${hrStyle} top: 58.3333%;`);
        const hr4 = document.createElement('hr');
        hr4.setAttribute('style', `${hrStyle} top: 75.0000%;`);
        const hr5 = document.createElement('hr');
        hr5.setAttribute('style', `${hrStyle} top: 91.6666%;`);

        const parent = this._canvas.element!.parentElement!;
        const reference = this._canvas.element!;
        parent.insertBefore(hr0, reference);
        parent.insertBefore(hr1, reference);
        parent.insertBefore(hr2, reference);
        parent.insertBefore(hr3, reference);
        parent.insertBefore(hr4, reference);
        parent.insertBefore(hr5, reference);

        return true;
    }

    uninitialize(): void {
        this._canvas.dispose();
        (this._renderer as Renderer).uninitialize();
    }

    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): LabelAnchorRenderer {
        return this._renderer;
    }

}
