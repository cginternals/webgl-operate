
/* spellchecker: disable */

import {
    Canvas,
    Context,
    DefaultFramebuffer,
    Invalidate,
    NdcFillingTriangle,
    Program,
    Shader,
    Renderer,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


class PerlinNoiseRenderer extends Renderer {

    protected _defaultFBO: DefaultFramebuffer;

    protected _ndcTriangle: NdcFillingTriangle;

    protected _program: Program;
    protected _uMethod: WebGLUniformLocation;


    /**
     * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param mouseEventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate,
        /* eventProvider: EventProvider */): boolean {

        /* Create framebuffers, textures, and render buffers. */

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        /* Create and configure ndc triangle for rendering noise onto. */

        const gl = this._context.gl;

        this._ndcTriangle = new NdcFillingTriangle(this._context, 'NdcFillingTriangle');
        this._ndcTriangle.initialize();

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'perlin.vert');
        vert.initialize(require('./data/perlin.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'pattern (in-line)');
        frag.initialize(require('./data/perlin.frag'));

        this._program = new Program(this._context, 'CanvasSizeProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);
        this._program.link();

        this._program.bind();
        this._uMethod = this._program.uniform('u_method');

        const aspect = this._canvasSize[0] / this._canvasSize[1];
        gl.uniform1f(this._program.uniform('u_aspect'), aspect);
        gl.uniform1f(this._program.uniform('u_seed'), Math.random());
        this._program.unbind();

        this.finishLoading();

        return true;
    }

    /**
     * Uninitializes Buffers, Textures, and Program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._ndcTriangle.uninitialize();
        this._program.uninitialize();

        this._defaultFBO.uninitialize();
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
        this._altered.alter('clearColor');
        this._altered.alter('frameSize');
    }

    /**
     * This is invoked in order to check if rendering of a frame is required by means of implementation specific
     * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
     * changed or the renderer was invalidated @see{@link invalidate}.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {

        return this._altered.any;
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        const gl = this._context.gl;

        if (this._altered.canvasSize) {
            const aspect = this._canvasSize[0] / this._canvasSize[1];
            this._program.bind();
            gl.uniform1f(this._program.uniform('u_aspect'), aspect);
            this._program.unbind();
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
    }

    /**
     * After (1) update and (2) preparation are invoked, a frame is invoked. Renders both 2D and 3D labels.
     * @param frameNumber - for intermediate frames in accumulation rendering
     */
    protected onFrame(/*frameNumber: number*/): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._canvasSize[0], this._canvasSize[1]);

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        this._program.bind();

        const t = ((new Date()).getTime() % 10000000) * 0.001;
        gl.uniform1f(this._program.uniform('u_time'), t);

        this._ndcTriangle.bind();


        const b = 1.0;
        const w = this._frameSize[0];
        const h = (this._frameSize[1] - (3.0 - 1.0) * b) / 3.0;

        gl.enable(gl.SCISSOR_TEST);

        // Value Noise
        gl.scissor(0, (h + b) * 0, w, h);
        gl.uniform1i(this._uMethod, 2);
        this._ndcTriangle.draw();

        // Gradient Noise
        gl.scissor(0, (h + b) * 1, w, h);
        gl.uniform1i(this._uMethod, 1);
        this._ndcTriangle.draw();

        // Simplex Noise
        gl.scissor(0, (h + b) * 2, w, h);
        gl.uniform1i(this._uMethod, 0);
        this._ndcTriangle.draw();

        this._ndcTriangle.unbind();
    }

    protected onSwap(): void {
        // this.invalidate(true);
    }

}


export class PerlinNoiseExample extends Example {

    private _canvas: Canvas;
    private _renderer: PerlinNoiseRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new PerlinNoiseRenderer();
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

    get renderer(): PerlinNoiseRenderer {
        return this._renderer;
    }

}
