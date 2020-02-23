
/* spellchecker: disable */

import { auxiliaries, vec2 } from 'webgl-operate';

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
    NdcFillingRectangle,
    Position2DLabel,
    Program,
    Renderer,
    Shader,
    Text,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


class ColorScaleRenderer extends Renderer {

    protected _extensions = false;

    protected _positions = new Array<vec2>();
    protected _presets: Array<[string, string, number, boolean]> = [

        ['smithwalt', 'viridis', 7, false],
        ['smithwalt', 'viridis', 64, false],
        ['smithwalt', 'inferno', 7, false],
        ['smithwalt', 'inferno', 64, false],

        ['marcosci', 'cividis', 7, false],
        ['marcosci', 'cividis', 64, false],
        ['smithwalt', 'magma', 7, false],
        ['smithwalt', 'magma', 64, false],

        ['colorbrewer', 'Greys', 4, true],
        ['colorbrewer', 'Greys', 7, true],
        ['smithwalt', 'plasma', 7, false],
        ['smithwalt', 'plasma', 64, false],

        ['colorbrewer', 'Spectral', 7, true],
        ['colorbrewer', 'Spectral', 64, true],
        ['mikhailov', 'turbo', 16, false],
        ['mikhailov', 'turbo', 128, false],

        ['colorbrewer', 'BrBG', 7, true],
        ['colorbrewer', 'RdBu', 64, true],
        ['colorbrewer', 'RdYlBu', 7, true],
        ['colorbrewer', 'PuOr', 7, true],

        ['colorbrewer', 'OrRd', 4, false],
        ['colorbrewer', 'OrRd', 7, false],
        ['colorbrewer', 'RdPu', 4, false],
        ['colorbrewer', 'RdPu', 7, false],

        ['colorbrewer', 'Accent', 7, false],
        ['colorbrewer', 'Paired', 7, false],
        ['colorbrewer', 'Pastel2', 7, false],
        ['colorbrewer', 'Dark2', 7, false],
    ];

    protected _labelPass: LabelRenderPass;
    protected _labels = new Array<Position2DLabel>();

    protected _textures = new Array<Texture2D>();
    protected _ndcrect: NdcFillingRectangle;
    protected _program: Program;

    protected _uExtent: WebGLUniformLocation;
    protected _uOffset: WebGLUniformLocation;

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

        const gl = context.gl;

        /* Create framebuffers, textures, and render buffers. */

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        this._ndcrect = new NdcFillingRectangle(this._context);
        this._ndcrect.initialize();


        const vert = new Shader(context, gl.VERTEX_SHADER, 'colorscale.vert');
        vert.initialize(require('./data/colorscale.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'colorscale.frag');
        frag.initialize(require('./data/colorscale.frag'));

        this._program = new Program(context, 'ColorScaleProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_position', this._ndcrect.vertexLocation);
        this._program.link();
        this._program.bind();

        this._uExtent = this._program.uniform('u_extent');
        this._uOffset = this._program.uniform('u_offset');
        gl.uniform1i(this._program.uniform('u_texture'), 0);

        this._program.unbind();


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


        const createLabeledColorScaleRect = (i: number
            , source: string, preset: string, steps: number, invert: boolean): void => {

            this._positions[i] = vec2.create();

            this._labels[i] = new Position2DLabel(new Text(`${source}: ${preset} #${steps}`), Label.Type.Dynamic);
            this._labels[i].lineAnchor = Label.LineAnchor.Top;

            this._textures[i] = new Texture2D(context, `Texture${preset}`);
            this._textures[i].initialize(steps, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);

            ColorScale.fromPreset(`data/${source}.json`, preset, steps).then((scale: ColorScale) => {
                scale.invert = invert;
                const data = scale.bitsUI8(Color.Space.RGB, false);
                this._textures[i].data(data, true, false);
            });
        };

        this._positions.length = this._labels.length = this._textures.length = this._presets.length;

        for (let i = 0; i < this._presets.length; ++i) {
            createLabeledColorScaleRect(i,
                this._presets[i][0], this._presets[i][1], this._presets[i][2], this._presets[i][3]);
        }

        this._labelPass.labels = this._labels;

        for (const label of this._labelPass.labels) {
            label.fontSize = 15.0 / Label.devicePixelRatio();
            label.color.fromHex('#fff');
            label.fontSizeUnit = Label.Unit.Pixel;
        }

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

            for (let i = 0; i < this._presets.length; ++i) {
                const [x, y] = [i % 4, Math.floor(i / 4)];
                this._positions[i][0] = (x + 1) * 0.05 + x * 0.45 - 1.0;
                this._positions[i][1] = (y + 1) * 0.15 + y * 0.10 - 1.0 + 0.05;
            }

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

        this._program.bind();

        gl.uniform2f(this._uExtent, 0.40, 0.40 / 7.0 * this._camera.aspect);

        for (let i = 0; i < this._presets.length; ++i) {
            this._textures[i].bind(gl.TEXTURE0);

            gl.uniform2fv(this._uOffset, this._positions[i]);
            this._ndcrect.draw();
        }

        this._program.unbind();
    }

    protected updateLabels(): void {
        if (!this._labelPass.initialized) {
            return;
        }
        const s05 = vec2.fromValues(this._canvasSize[0] * 0.5, this._canvasSize[1] * 0.5);

        for (let i = 0; i < this._presets.length; ++i) {
            this._labels[i].position = vec2.mul(vec2.create(), this._positions[i], s05);
        }
    }

}


export class ColorScaleExample extends Example {

    private _canvas: Canvas;
    private _renderer: ColorScaleRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new ColorScaleRenderer();
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

    get renderer(): ColorScaleRenderer {
        return this._renderer;
    }

}
