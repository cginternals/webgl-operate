
/* spellchecker: disable */

import { vec4 } from 'gl-matrix';

import {
    auxiliaries,
    BlitPass,
    Canvas,
    Context,
    NdcFillingTriangle,
    DefaultFramebuffer,
    EventProvider,
    Framebuffer,
    Invalidate,
    Program,
    Renderer,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class DfdxDfdyRenderer extends Renderer {

    protected _extensions = false;

    protected _colorRenderTexture: Texture2D;
    protected _intermediateFBO: Framebuffer;

    protected _ndcTriangle: NdcFillingTriangle;
    protected _texture: Texture2D;

    protected _program: Program;

    protected _defaultFBO: DefaultFramebuffer;

    protected _blit: BlitPass;

    protected _zoomSrcBounds: vec4;
    protected _zoomDstBounds: vec4;


    /**
     * Initializes and sets up buffer, cube geometry, camera and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param eventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate,
        eventProvider: EventProvider): boolean {

        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        /* Enable required extensions. */

        if (this._extensions === false && this._context.isWebGL1) {
            auxiliaries.assert(this._context.supportsStandardDerivatives,
                `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this._context.standardDerivatives;
            this._extensions = true;
        }

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();

        const internalFormatAndType = Wizard.queryInternalTextureFormat(this._context, gl.RGBA, Wizard.Precision.half);

        this._colorRenderTexture = new Texture2D(this._context, 'ColorRenderTexture');
        this._colorRenderTexture.initialize(1, 1, internalFormatAndType[0], gl.RGBA, internalFormatAndType[1]);
        this._colorRenderTexture.filter(gl.LINEAR, gl.LINEAR);

        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');
        this._intermediateFBO.initialize([
            [gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]]);

        const vert = new Shader(context, gl.VERTEX_SHADER, 'dfdx-dfdy-example.vert');
        vert.initialize(require('./data/dfdx-dfdy-example.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'dfdx-dfdy-example.frag');
        frag.initialize(require('./data/dfdx-dfdy-example.frag'));

        this._program = new Program(context, 'SpaceFillingProgram');
        this._program.initialize([vert, frag], false);

        this._ndcTriangle = new NdcFillingTriangle(this._context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._program.link();
        this._program.bind();

        this._ndcTriangle.initialize(aVertex);

        this._blit = new BlitPass(this._context);
        this._blit.initialize();
        this._blit.framebuffer = this._intermediateFBO;
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.target = this._defaultFBO;
        this._blit.drawBuffer = gl.BACK;

        this.finishLoading();

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._ndcTriangle.uninitialize();
        this._program.uninitialize();

        this._defaultFBO.uninitialize();
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
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

        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);

            const aspect = this._frameSize[0] / this._frameSize[1];
            // Lower-left inset
            this._zoomSrcBounds = vec4.fromValues(
                0.0, 0.0,
                this._frameSize[0] * 0.04, this._frameSize[1] * 0.04 * aspect);

            this._program.bind();
            gl.uniform2f(this._program.uniform('u_frameSize'), this._frameSize[0], this._frameSize[1]);
            this._program.unbind();
        }
        if (this._altered.canvasSize) {
            const aspect = this._canvasSize[0] / this._canvasSize[1];
            this._zoomDstBounds = vec4.fromValues(
                this._canvasSize[0] * (1.0 - 0.37), this._canvasSize[1] * (1.0 - 0.37 * aspect),
                this._canvasSize[0] * (1.0 - 0.02), this._canvasSize[1] * (1.0 - 0.02 * aspect));
        }

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        this._intermediateFBO.bind();
        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._program.bind();

        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();

        this._program.unbind();
    }

    protected onSwap(): void {
        this._blit.frame();

        this._blit.srcBounds = this._zoomSrcBounds;
        this._blit.dstBounds = this._zoomDstBounds;
        this._blit.frame();
        this._blit.srcBounds = this._blit.dstBounds = undefined;
    }

}


export class DfdxDfdyExample extends Example {

    private _canvas: Canvas;
    private _renderer: DfdxDfdyRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.half;
        this._canvas.frameScale = [0.5, 0.5];

        this._renderer = new DfdxDfdyRenderer();
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

    get renderer(): DfdxDfdyRenderer {
        return this._renderer;
    }

}
