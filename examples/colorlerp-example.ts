
/* spellchecker: disable */

import { auxiliaries } from 'webgl-operate';

const log = auxiliaries.log;
const LogLvl = auxiliaries.LogLevel;


import {
    Camera,
    Canvas,
    Color,
    ColorScale,
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


class ColorLerpRenderer extends Renderer {

    protected _extensions = false;

    protected _labelPass: LabelRenderPass;

    protected _labelGenerated1: Position2DLabel;
    protected _labelGenerated2: Position2DLabel;
    protected _labelGenerated3: Position2DLabel;
    protected _labelGenerated4: Position2DLabel;

    protected _labelLinear1: Position2DLabel;
    protected _labelLinear2: Position2DLabel;
    protected _labelLinear3: Position2DLabel;
    protected _labelLinear4: Position2DLabel;
    protected _labelLinear5: Position2DLabel;
    protected _labelLinear6: Position2DLabel;
    protected _labelLinear7: Position2DLabel;
    protected _labelLinear8: Position2DLabel;

    protected _labelNearest1: Position2DLabel;
    protected _labelNearest2: Position2DLabel;
    protected _labelNearest3: Position2DLabel;
    protected _labelNearest4: Position2DLabel;
    protected _labelNearest5: Position2DLabel;
    protected _labelNearest6: Position2DLabel;
    protected _labelNearest7: Position2DLabel;
    protected _labelNearest8: Position2DLabel;

    protected _labelLAB: Position2DLabel;

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
                this.finishLoading();
                this.invalidate();
            })
            .catch((reason) => log(LogLvl.Error, reason));

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

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
        this._altered.alter('clearColor');
        this._altered.alter('frameSize');
        this._altered.alter('multiFrameNumber');
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
     * Sets up an example scene with 2D and 3D labels and sets the corresponding data on LabelGeometries. The
     * FontFace is set on each label by the LabelRenderPass.
     */
    protected setupScene(): void {

        // test interpolation
        this._labelLAB = new Position2DLabel(new Text(`| should be violet-ish |`), Label.Type.Static);

        // generated color
        this._labelGenerated1 = new Position2DLabel(new Text(`| generated 0 |`), Label.Type.Dynamic);
        this._labelGenerated2 = new Position2DLabel(new Text(`| generated 1 |`), Label.Type.Dynamic);
        this._labelGenerated3 = new Position2DLabel(new Text(`| generated 2 |`), Label.Type.Dynamic);
        this._labelGenerated4 = new Position2DLabel(new Text(`| generated 3 |`), Label.Type.Dynamic);

        // color scale linear
        this._labelLinear1 = new Position2DLabel(new Text(`| linear 0 |`), Label.Type.Dynamic);
        this._labelLinear2 = new Position2DLabel(new Text(`| linear 1 |`), Label.Type.Dynamic);
        this._labelLinear3 = new Position2DLabel(new Text(`| linear 2 |`), Label.Type.Dynamic);
        this._labelLinear4 = new Position2DLabel(new Text(`| linear 3 |`), Label.Type.Dynamic);
        this._labelLinear5 = new Position2DLabel(new Text(`| linear 4 |`), Label.Type.Dynamic);
        this._labelLinear6 = new Position2DLabel(new Text(`| linear 5 |`), Label.Type.Dynamic);
        this._labelLinear7 = new Position2DLabel(new Text(`| linear 6 |`), Label.Type.Dynamic);
        this._labelLinear8 = new Position2DLabel(new Text(`| linear 7 |`), Label.Type.Dynamic);

        // color scale nearest
        this._labelNearest1 = new Position2DLabel(new Text(`| nearest 0 |`), Label.Type.Dynamic);
        this._labelNearest2 = new Position2DLabel(new Text(`| nearest 1 |`), Label.Type.Dynamic);
        this._labelNearest3 = new Position2DLabel(new Text(`| nearest 2 |`), Label.Type.Dynamic);
        this._labelNearest4 = new Position2DLabel(new Text(`| nearest 3 |`), Label.Type.Dynamic);
        this._labelNearest5 = new Position2DLabel(new Text(`| nearest 4 |`), Label.Type.Dynamic);
        this._labelNearest6 = new Position2DLabel(new Text(`| nearest 5 |`), Label.Type.Dynamic);
        this._labelNearest7 = new Position2DLabel(new Text(`| nearest 6 |`), Label.Type.Dynamic);
        this._labelNearest8 = new Position2DLabel(new Text(`| nearest 7 |`), Label.Type.Dynamic);


        const generatedLabels = [
            this._labelGenerated1, this._labelGenerated2, this._labelGenerated3, this._labelGenerated4];

        const linearLabels = [
            this._labelLinear1, this._labelLinear2, this._labelLinear3, this._labelLinear4, this._labelLinear5,
            this._labelLinear6, this._labelLinear7, this._labelLinear8];
        const nearestLabels = [
            this._labelNearest1, this._labelNearest2, this._labelNearest3, this._labelNearest4, this._labelNearest5,
            this._labelNearest6, this._labelNearest7, this._labelNearest8];

        this._labelPass.labels = [this._labelLAB, ...generatedLabels, ...linearLabels, ...nearestLabels];

        for (const label of this._labelPass.labels) {
            label.fontSize = 17;
            label.fontSizeUnit = Label.Unit.Pixel;
        }

        // const colors = [
        //     255, 255, 255, 255,
        //     254, 213, 0, 255,
        //     254, 134, 0, 255,
        //     230, 36, 38, 255,
        // ];

        const colors = [
            255, 0, 0, 255,
            0, 0, 255, 255,
        ];

        // const colors = [
        //     255, 255, 255, 255,
        //     0, 0, 0, 255,
        // ];

        const stepCount = 4.0; // colors.length / 4.0;
        const colorScale = ColorScale.fromArray(colors, ColorScale.ArrayType.RGBA, stepCount, [0, 1.0]);

        for (const color of colorScale.colors) {
            log(LogLvl.Info, `generated color: ${color.rgba}`);
        }

        this._labelLAB.color = colorScale.lerp(0.5, Color.Space.LAB)!;

        let i = 0;
        for (const label of generatedLabels) {
            i %= stepCount;
            label.color.fromRGB(...colorScale.colors[i].rgba);
            i++;
        }

        i = 0;
        let l = nearestLabels.length;
        colorScale.hint = ColorScale.InterpolationHint.Nearest;
        for (const label of nearestLabels) {
            const r = colorScale.lerp(i / l, Color.Space.LAB)!;
            log(LogLvl.Info, `lerp (nearest): ${i} ${i / l} ${r.rgba}`);
            label.color = r;
            i++;
        }

        i = 0;
        l = linearLabels.length;
        colorScale.hint = ColorScale.InterpolationHint.Linear;
        for (const label of linearLabels) {
            const r = colorScale.lerp(i / l, Color.Space.LAB)!;
            log(LogLvl.Info, `lerp (linear): ${i} ${i / l} ${r.rgba}`);
            label.color = r;
            i++;
        }
    }

    protected updateLabels(): void {
        this.updateLabelsGenerated();
        this.updateLabelsLinear();
        this.updateLabelsNearest();
    }

    protected updateLabelsGenerated(): void {
        if (!this._labelGenerated1.valid) {
            return;
        }

        const step = this._canvasSize[1] / 3.5;
        const top = 1.5 * step;
        const width = this._canvasSize[0] - 32.0 /* margin */ * Label.devicePixelRatio();

        this._labelGenerated1.position = [-width * 0.5, top - 0.0 * step];
        this._labelGenerated2.position = [-width * 0.5, top - 1.0 * step];
        this._labelGenerated3.position = [-width * 0.5, top - 2.0 * step];
        this._labelGenerated4.position = [-width * 0.5, top - 3.0 * step];
    }

    protected updateLabelsLinear(): void {
        if (!this._labelLinear1.valid) {
            return;
        }

        const step = this._canvasSize[1] / 8.0;
        const top = 3.5 * step;
        const width = this._canvasSize[0] - 32.0 /* margin */ * Label.devicePixelRatio();

        this._labelLinear1.position = [-width * 0.1, top - 0.0 * step];
        this._labelLinear2.position = [-width * 0.1, top - 1.0 * step];
        this._labelLinear3.position = [-width * 0.1, top - 2.0 * step];
        this._labelLinear4.position = [-width * 0.1, top - 3.0 * step];
        this._labelLinear5.position = [-width * 0.1, top - 4.0 * step];
        this._labelLinear6.position = [-width * 0.1, top - 5.0 * step];
        this._labelLinear7.position = [-width * 0.1, top - 6.0 * step];
        this._labelLinear8.position = [-width * 0.1, top - 7.0 * step];
    }

    protected updateLabelsNearest(): void {
        if (!this._labelNearest1.valid) {
            return;
        }

        const step = this._canvasSize[1] / 8.0;
        const top = 3.5 * step;
        const width = this._canvasSize[0] - 32.0 /* margin */ * Label.devicePixelRatio();

        this._labelNearest1.position = [-width * 0.3, top - 0.0 * step];
        this._labelNearest2.position = [-width * 0.3, top - 1.0 * step];
        this._labelNearest3.position = [-width * 0.3, top - 2.0 * step];
        this._labelNearest4.position = [-width * 0.3, top - 3.0 * step];
        this._labelNearest5.position = [-width * 0.3, top - 4.0 * step];
        this._labelNearest6.position = [-width * 0.3, top - 5.0 * step];
        this._labelNearest7.position = [-width * 0.3, top - 6.0 * step];
        this._labelNearest8.position = [-width * 0.3, top - 7.0 * step];
    }

}


export class ColorLerpExample extends Example {

    private _canvas: Canvas;
    private _renderer: ColorLerpRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];
        this._canvas.clearColor = new Color();

        this._renderer = new ColorLerpRenderer();
        this._canvas.renderer = this._renderer;

        return true;
    }

    onUninitialize(): void {
        this._canvas.dispose();
        (this._renderer as Renderer).uninitialize();
    }

    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): ColorLerpRenderer {
        return this._renderer;
    }

}
