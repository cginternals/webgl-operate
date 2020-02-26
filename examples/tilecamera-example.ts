
/* spellchecker: disable */

import { mat4, vec3, vec4 } from 'gl-matrix';

import { tuples } from 'webgl-operate';


import {
    BlitPass,
    Camera,
    Canvas,
    Context,
    CuboidGeometry,
    DefaultFramebuffer,
    Framebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderbuffer,
    Renderer,
    Shader,
    Texture2D,
    TileCameraGenerator,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class TileCameraRenderer extends Renderer {

    static readonly TILE_SIZE: tuples.GLsizei2 = [128, 128];
    static readonly TARGET_SIZE: tuples.GLsizei2 = [3840, 2160];


    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _cuboid: CuboidGeometry;
    protected _texture: Texture2D;

    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;

    protected _defaultFBO: DefaultFramebuffer;

    protected _intermediateFBOs = new Array<Framebuffer>(4);
    protected _colorRenderTextures = new Array<Texture2D>(4);
    protected _depthRenderbuffers = new Array<Renderbuffer>(4);

    protected _targetSize: tuples.GLsizei2 = TileCameraRenderer.TARGET_SIZE;

    protected _blitPass: BlitPass;

    protected _generators = new Array<TileCameraGenerator>(3);

    protected _isLoaded = false;

    /**
     * Initializes and sets up buffer, cube geometry, camera and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param mouseEventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate,
        mouseEventProvider: MouseEventProvider,
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {

        this.showSpinner();

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl;
        const gl2facade = context.gl2facade;

        for (let i = 0; i < this._intermediateFBOs.length; ++i) {
            this._colorRenderTextures[i] = new Texture2D(this._context, 'ColorRenderTexture');
            this._depthRenderbuffers[i] = new Renderbuffer(this._context, 'DepthRenderbuffer');
            this._intermediateFBOs[i] = new Framebuffer(this._context, 'IntermediateFBO');

            this._colorRenderTextures[i].initialize(this._targetSize[0], this._targetSize[1],
                this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            this._depthRenderbuffers[i].initialize(this._targetSize[0], this._targetSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBOs[i].initialize([
                [gl2facade.COLOR_ATTACHMENT0, this._colorRenderTextures[i]],
                [gl.DEPTH_ATTACHMENT, this._depthRenderbuffers[i]]]);

        }

        this._blitPass = new BlitPass(this._context);
        this._blitPass.initialize();

        this._blitPass.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blitPass.srcBounds = vec4.fromValues(0, 0, this._targetSize[0], this._targetSize[1]);
        this._blitPass.filter = gl.LINEAR;

        this._blitPass.target = this._defaultFBO;
        this._blitPass.drawBuffer = gl.BACK;


        this._cuboid = new CuboidGeometry(context, 'Cuboid', true, [4.0, 4.0, 4.0]);
        this._cuboid.initialize();

        const vert = new Shader(context, gl.VERTEX_SHADER, 'mesh.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'mesh.frag');
        frag.initialize(require('./data/mesh.frag'));

        this._program = new Program(context, 'CubeProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._cuboid.vertexLocation);
        this._program.attribute('a_texCoord', this._cuboid.uvCoordLocation);
        this._program.link();
        this._program.bind();


        this._uViewProjection = this._program.uniform('u_viewProjection');
        const identity = mat4.identity(mat4.create());
        gl.uniformMatrix4fv(this._program.uniform('u_model'), gl.FALSE, identity);
        gl.uniform1i(this._program.uniform('u_texture'), 0);
        gl.uniform1i(this._program.uniform('u_textured'), false);


        this._texture = new Texture2D(context, 'Texture');
        this._texture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._texture.wrap(gl.REPEAT, gl.REPEAT);
        this._texture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._texture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);

        this._texture.fetch('./data/blue-painted-planks-diff-1k-modified.webp', false).then(() => {
            const gl = context.gl;

            this._program.bind();
            gl.uniform1i(this._program.uniform('u_textured'), true);

            this._isLoaded = true;
            this.hideSpinner();

            this.invalidate(true);
        });

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 5.0);
        this._camera.near = 0.1;
        this._camera.far = 8.0;

        this._camera.aspect = this._targetSize[0] / this._targetSize[1];
        this._camera.viewport = this._targetSize;



        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;


        for (let i = 0; i < this._generators.length; ++i) {
            this._generators[i] = new TileCameraGenerator();
            this._generators[i].sourceCamera = this._camera;
            this._generators[i].tileSize = TileCameraRenderer.TILE_SIZE;
            this._generators[i].sourceViewport = this._targetSize;
        }
        this._generators[0].algorithm = TileCameraGenerator.Algorithm.ScanLine;
        this._generators[1].algorithm = TileCameraGenerator.Algorithm.HilbertCurve;
        this._generators[2].algorithm = TileCameraGenerator.Algorithm.ZCurve;


        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._cuboid.uninitialize();
        this._program.uninitialize();

        this._defaultFBO.uninitialize();

        for (let i = 0; i < this._intermediateFBOs.length; ++i) {
            this._colorRenderTextures[i].uninitialize();
            this._depthRenderbuffers[i].uninitialize();
            this._intermediateFBOs[i].uninitialize();
        }
        this._blitPass.uninitialize();
    }

    /**
     * This is invoked in order to check if rendering of a frame is required by means of implementation specific
     * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
     * changed or the renderer was invalidated @see{@link invalidate}.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {
        this._navigation.update();

        return this._altered.any || this._camera.altered;
        // || this._tileCameraScanLineGenerator.hasNextTile() ||
        //  this._tileCameraHilbertGenerator.hasNextTile() || this._tileCameraZCurveGenerator.hasNextTile();

    }

    protected getViewportDividableByTwo(viewport: [number, number]): [number, number] {
        const x = (viewport[0] & 1) === 0 ? viewport[0] : viewport[0] - 1;
        const y = (viewport[1] & 1) === 0 ? viewport[1] : viewport[1] + 1;
        return [x, y];
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {

        for (const generator of this._generators) {
            generator.reset();
        }

        if (this._altered.canvasSize) {
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
            for (const fbo of this._intermediateFBOs) {
                fbo.clearColor(this._clearColor);
            }
        }
        if (this._camera.altered) {
            for (const generator of this._generators) {
                generator.sourceCameraChanged();
            }
        }

        this._altered.reset();
        this._camera.altered = false;
    }


    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        // if (frameNumber === 0) {
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT, true, true);
        // }


        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        this._texture.bind(gl.TEXTURE0);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        this._cuboid.bind();


        if (frameNumber === 0) {
            this._intermediateFBOs[0].bind();
            gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
            this._intermediateFBOs[0].clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);
            this._cuboid.draw();
        }


        for (let i = 0; i < this._generators.length; ++i) {

            this._intermediateFBOs[i + 1].bind();
            if (frameNumber === 0) {
                gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
                this._intermediateFBOs[i + 1].clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);
            }
            if (!this._generators[i].nextTile())
                continue;

            const viewport = this._generators[i].viewport;
            gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._generators[i].camera!.viewProjection);
            this._cuboid.draw();
        }


        this._cuboid.unbind();
        this._program.unbind();
        this._texture.unbind(gl.TEXTURE0);

        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
    }

    protected onSwap(): void {

        const w05 = this._canvasSize[0] / 2 - 3;
        const h05 = this._canvasSize[1] / 2 - 3;

        this._blitPass.framebuffer = this._intermediateFBOs[0];
        this._blitPass.dstBounds = vec4.fromValues(2, 4 + h05, 2 + w05, 4 + 2 * h05);
        this._blitPass.frame();

        this._blitPass.framebuffer = this._intermediateFBOs[1];
        this._blitPass.dstBounds = vec4.fromValues(4 + w05, 4 + h05, 4 + 2 * w05, 4 + 2 * h05);
        this._blitPass.frame();

        this._blitPass.framebuffer = this._intermediateFBOs[2];
        this._blitPass.dstBounds = vec4.fromValues(2, 2, 2 + w05, 2 + h05);
        this._blitPass.frame();

        this._blitPass.framebuffer = this._intermediateFBOs[3];
        this._blitPass.dstBounds = vec4.fromValues(4 + w05, 2, 4 + 2 * w05, 2 + h05);
        this._blitPass.frame();
    }

    /**
     * Show a spinner that indicates that the example is still loading.
     */
    protected showSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'inline';
    }

    /**
     * Hide the loading spinner.
     */
    protected hideSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'none';
    }
}

export class TileCameraExample extends Example {

    private _canvas: Canvas;
    private _renderer: TileCameraRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber =
            Math.ceil(TileCameraRenderer.TARGET_SIZE[0] / TileCameraRenderer.TILE_SIZE[0]) *
            Math.ceil(TileCameraRenderer.TARGET_SIZE[1] / TileCameraRenderer.TILE_SIZE[1]);
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new TileCameraRenderer();
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

    get renderer(): TileCameraRenderer {
        return this._renderer;
    }
}
