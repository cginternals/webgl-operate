
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

export class TiledCubeRenderer extends Renderer {

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

    protected _targetSize: tuples.GLsizei2 = [3840, 2160];

    protected _blit: BlitPass;

    // protected _tileNumber = 32;

    // protected _ssaaFactor = 8;

    protected _scanLineGenerator: TileCameraGenerator;
    // protected _tileCameraHilbertGenerator: TileCameraGenerator;
    // protected _tileCameraZCurveGenerator: TileCameraGenerator;

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

        this._blit = new BlitPass(this._context);
        this._blit.initialize();

        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.srcBounds = vec4.fromValues(0, 0, this._targetSize[0], this._targetSize[1]);
        this._blit.filter = gl.LINEAR;

        this._blit.target = this._defaultFBO;
        this._blit.drawBuffer = gl.BACK;

        // this._blit.enforceProgramBlit = true;
        // this._blit.framebuffer = this._intermediateFBO;

        // const frameSize = this._frameSize[0] > 0 && this._frameSize[1] > 0 ?
        //     [this._frameSize[0] * this._ssaaFactor, this._frameSize[1] * this._ssaaFactor] : [1, 1];
        // this._colorRenderTexture.initialize(frameSize[0], frameSize[1],
        //     this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        // this._depthRenderbuffer.initialize(frameSize[0], frameSize[1], gl.DEPTH_COMPONENT16);
        // this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
        //     , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);

        this._cuboid = new CuboidGeometry(context, 'Cuboid', true, [5.0, 5.0, 5.0]);
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

        this._texture.fetch('./data/blue_painted_planks_diff_1k_modified.webp', false).then(() => {
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

        // this.createTiledCameraUtils();


        this._scanLineGenerator = new TileCameraGenerator();
        this._scanLineGenerator.sourceCamera = this._camera;
        this._scanLineGenerator.padding = vec4.create();
        this._scanLineGenerator.algorithm = TileCameraGenerator.IterationAlgorithm.ScanLine;
        this._scanLineGenerator.tileSize = [128, 128];
        this._scanLineGenerator.sourceViewport = this._targetSize;


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
        this._blit.uninitialize();
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

        this._scanLineGenerator.resetTileRendering();

        if (this._altered.canvasSize) {
            // const canvSize = this.getViewportDividableByTwo(this._canvasSize);

            // const canvasSize = this._canvasSize;


            // this._camera.viewport = [canvSize[0] * this._ssaaFactor, canvSize[1] * this._ssaaFactor];
            // this._camera.viewport = [100, 100];
            // this.setTileCameraGeneratorTileSizeAndFrameSize();

            // this._tileCameraScanLineGenerator.resetTileRendering();
            // this._tileCameraHilbertGenerator.resetTileRendering();
            // this._tileCameraZCurveGenerator.resetTileRendering();
        }
        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
            for (const fbo of this._intermediateFBOs) {
                fbo.clearColor(this._clearColor);
            }
        }
        if (this._camera.altered) {
            this._scanLineGenerator.updateCameraProperties();
            // this._tileCameraHilbertGenerator.updateCameraProperties();
            // this._tileCameraZCurveGenerator.updateCameraProperties();

            // this._tileCameraScanLineGenerator.resetTileRendering();
            // this._tileCameraHilbertGenerator.resetTileRendering();
            // this._tileCameraZCurveGenerator.resetTileRendering();
        }
        if (this._altered.frameSize) {
            // this.setTileCameraGeneratorTileSizeAndFrameSize();

            // this._tileCameraScanLineGenerator.resetTileRendering();
            // this._tileCameraHilbertGenerator.resetTileRendering();
            // this._tileCameraZCurveGenerator.resetTileRendering();

            // const frameSize = this.getViewportDividableByTwo(this._frameSize);

            // this._intermediateFBO.resize(this._frameSize[0] * this._ssaaFactor, this._frameSize[1] * this._ssaaFactor);
            // this._camera.viewport = [frameSize[0] * this._ssaaFactor, frameSize[1] * this._ssaaFactor];
        }
        this._altered.reset();
        this._camera.altered = false;
    }

    protected setTileCameraGeneratorTileSizeAndFrameSize(): void {
        // const tileSize: [number, number] = [0, 0];

        // const frameSize = this.getViewportDividableByTwo(this._frameSize);

        // const ssaaFrameSize: [number, number] = [frameSize[0] * this._ssaaFactor,
        // frameSize[1] * this._ssaaFactor];

        // this._tileCameraScanLineGenerator.sourceViewport = ssaaFrameSize;
        // this._tileCameraHilbertGenerator.sourceViewport = ssaaFrameSize;
        // this._tileCameraZCurveGenerator.sourceViewport = ssaaFrameSize;

        // // tile size must be divisible by 2 since we render quaters
        // const size0 = Math.floor(ssaaFrameSize[0] / this._tileNumber);
        // tileSize[0] = (size0 & 1) === 1 ? size0 + 1 : size0;
        // const size1 = Math.floor(ssaaFrameSize[1] / this._tileNumber);
        // tileSize[1] = (size1 & 1) === 1 ? size1 + 1 : size1;

        // // ensure tile size is not zero
        // tileSize[0] = tileSize[0] > 0 ? tileSize[0] : 2;
        // tileSize[1] = tileSize[1] > 0 ? tileSize[1] : 2;

        // this._tileCameraScanLineGenerator.tileSize = tileSize;
        // this._tileCameraHilbertGenerator.tileSize = tileSize;
        // this._tileCameraZCurveGenerator.tileSize = tileSize;
    }

    protected createTiledCameraUtils(): void {

        // this._tileCameraHilbertGenerator = new TileCameraGenerator();
        // this._tileCameraHilbertGenerator.sourceCamera = this._camera;
        // this._tileCameraHilbertGenerator.padding = vec4.create();
        // this._tileCameraHilbertGenerator.algorithm = TileCameraGenerator.IterationAlgorithm.HilbertCurve;

        // this._tileCameraZCurveGenerator = new TileCameraGenerator();
        // this._tileCameraZCurveGenerator.sourceCamera = this._camera;
        // this._tileCameraZCurveGenerator.padding = vec4.create();
        // this._tileCameraZCurveGenerator.algorithm = TileCameraGenerator.IterationAlgorithm.ZCurve;

        // this.setTileCameraGeneratorTileSizeAndFrameSize();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        // if (frameNumber === 0) {
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT, true, true);
        // }


        // gl.enable(gl.SCISSOR_TEST);
        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        this._texture.bind(gl.TEXTURE0);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        this._cuboid.bind();


        this._intermediateFBOs[0].bind();
        if (frameNumber === 0) {
            gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
            this._intermediateFBOs[0].clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);
        }
        this._cuboid.draw();


        this._intermediateFBOs[1].bind();
        if (frameNumber === 0) {
            gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
            this._intermediateFBOs[1].clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);
        }
        if (this._scanLineGenerator.nextTile()) {
            const offset = this._scanLineGenerator.offset;

            gl.viewport(offset[0], offset[1], this._scanLineGenerator.tileSize[0], this._scanLineGenerator.tileSize[1]);
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
                this._scanLineGenerator.camera.viewProjection);
            this._cuboid.draw();
        }


        this._intermediateFBOs[2].bind();
        if (frameNumber === 0) {
            gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
            this._intermediateFBOs[2].clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);
        }
        gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
            this._camera.viewProjection);
        this._cuboid.draw();


        this._intermediateFBOs[3].bind();
        if (frameNumber === 0) {
            gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
            this._intermediateFBOs[3].clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);
        }
        gl.viewport(0, 0, this._targetSize[0], this._targetSize[1]);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
            this._camera.viewProjection);
        this._cuboid.draw();


        // // gl.enable(gl.SCISSOR_TEST);
        // let offset: [number, number] = [0, 0];
        // if (this._tileCameraScanLineGenerator.nextTile()) {
        //     // ScanLine
        //     offset = this._tileCameraScanLineGenerator.offset;
        //     // gl.scissor(frameSize[0] / 2 * this._ssaaFactor, frameSize[1] / 2 * this._ssaaFactor,
        //     //     frameSize[0] / 2 * this._ssaaFactor, frameSize[1] / 2 * this._ssaaFactor);
        //     gl.viewport(
        //         offset[0] / 2 + (frameSize[0] / 2 - 1) * this._ssaaFactor + 1,
        //         offset[1] / 2 + (frameSize[1] / 2 - 1) * this._ssaaFactor + 1,
        //         this._tileCameraScanLineGenerator.tileSize[0] / 2,
        //         this._tileCameraScanLineGenerator.tileSize[1] / 2);
        //     gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
        //         this._tileCameraScanLineGenerator.camera.viewProjection);
        //     this._cuboid.draw();
        // }

        // if (this._tileCameraHilbertGenerator.nextTile()) {
        //     // Hilbert
        //     gl.scissor(0, 0, frameSize[0] / 2 * this._ssaaFactor, frameSize[1] / 2 * this._ssaaFactor);
        //     offset = this._tileCameraHilbertGenerator.offset;
        //     gl.viewport(offset[0] / 2, offset[1] / 2,
        //         this._tileCameraHilbertGenerator.tileSize[0] / 2, this._tileCameraHilbertGenerator.tileSize[1] / 2);
        //     gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
        //         this._tileCameraHilbertGenerator.camera.viewProjection);
        //     this._cuboid.draw();
        // }

        // if (this._tileCameraZCurveGenerator.nextTile()) {
        //     // Z-Curve
        //     gl.scissor(frameSize[0] / 2 * this._ssaaFactor, 0,
        //         frameSize[0] / 2 * this._ssaaFactor, frameSize[1] / 2 * this._ssaaFactor);
        //     offset = this._tileCameraZCurveGenerator.offset;
        //     gl.viewport(frameSize[0] / 2 * this._ssaaFactor + offset[0] / 2, offset[1] / 2,
        //         this._tileCameraZCurveGenerator.tileSize[0] / 2, this._tileCameraZCurveGenerator.tileSize[1] / 2);
        //     gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
        //         this._tileCameraZCurveGenerator.camera.viewProjection);
        //     this._cuboid.draw();
        // }

        // restore state
        // this._cuboid.unbind();
        // this._program.unbind();
        // this._texture.unbind(gl.TEXTURE0);

        // gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
    }

    protected onSwap(): void {

        const w05 = this._canvasSize[0] / 2 - 3;
        const h05 = this._canvasSize[1] / 2 - 3;

        this._blit.framebuffer = this._intermediateFBOs[0];
        this._blit.dstBounds = vec4.fromValues(2, 4 + h05, 2 + w05, 4 + 2 * h05);
        this._blit.frame();

        this._blit.framebuffer = this._intermediateFBOs[1];
        this._blit.dstBounds = vec4.fromValues(4 + w05, 4 + h05, 4 + 2 * w05, 4 + 2 * h05);
        this._blit.frame();

        this._blit.framebuffer = this._intermediateFBOs[2];
        this._blit.dstBounds = vec4.fromValues(2, 2, 2 + w05, 2 + h05);
        this._blit.frame();

        this._blit.framebuffer = this._intermediateFBOs[3];
        this._blit.dstBounds = vec4.fromValues(4 + w05, 2, 4 + 2 * w05, 2 + h05);
        this._blit.frame();
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

export class TiledRendererExample extends Example {

    private _canvas: Canvas;
    private _renderer: TiledCubeRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1024;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new TiledCubeRenderer();
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

    get renderer(): TiledCubeRenderer {
        return this._renderer;
    }
}
