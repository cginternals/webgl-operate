
/* spellchecker: disable */

import { mat4, vec3, vec4 } from 'gl-matrix';

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

    protected _colorRenderTexture: Texture2D;
    protected _depthRenderbuffer: Renderbuffer;
    protected _intermediateFBO: Framebuffer;
    protected _defaultFBO: DefaultFramebuffer;
    protected _blit: BlitPass;

    protected _tileNumber = 32;

    protected _tileCameraScanLineGenerator: TileCameraGenerator;
    protected _tileCameraScanLine: Camera;
    protected _tileCameraHilbertGenerator: TileCameraGenerator;
    protected _tileCameraHilbert: Camera;

    protected TIMEOUT_BETWEEN_TILES = 10; // in milliseconds
    protected _alreadyRenderedNotTiled = false;

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

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl;
        const gl2facade = context.gl2facade;

        this._colorRenderTexture = new Texture2D(this._context, 'ColorRenderTexture');
        this._depthRenderbuffer = new Renderbuffer(this._context, 'DepthRenderbuffer');

        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');
        this._blit = new BlitPass(this._context);
        this._blit.initialize();
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;
        this._blit.framebuffer = this._intermediateFBO;

        if (!this._intermediateFBO.initialized) {
            const frameSize = this._frameSize[0] > 0 && this._frameSize[1] > 0 ? this._frameSize : [1, 1];
            this._colorRenderTexture.initialize(frameSize[0], frameSize[1],
                this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            this._depthRenderbuffer.initialize(frameSize[0], frameSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);
        }


        this._cuboid = new CuboidGeometry(context, 'Cuboid', true, [2.5, 2.5, 2.5]);
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

            this.invalidate(true);
        });


        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 5.0);
        this._camera.near = 1.0;
        this._camera.far = 8.0;


        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        this.createTiledCameraUtils();
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

        this._intermediateFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();
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

        return true;
        // return this._altered.any || this._camera.altered;
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
            this._camera.viewport = this._canvasSize;
            this.setTileCameraGeneratorTileSize();
            this._tileCameraScanLineGenerator.resetTileRendering();
            this._tileCameraHilbertGenerator.resetTileRendering();
            this._alreadyRenderedNotTiled = false;
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
            this._intermediateFBO.clearColor(this._clearColor);
        }
        if (this._camera.altered) {
            this._tileCameraScanLineGenerator.updateCameraProperties();
            this._tileCameraHilbertGenerator.updateCameraProperties();
            this._tileCameraScanLineGenerator.resetTileRendering();
            this._tileCameraHilbertGenerator.resetTileRendering();
            this._alreadyRenderedNotTiled = false;
        }
        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        this._altered.reset();
        this._camera.altered = false;
    }

    protected setTileCameraGeneratorTileSize(): void {
        const tileSize: [number, number] = [0, 0];

        // TODO error
        const size0 = Math.floor(this._frameSize[0] / this._tileNumber);
        tileSize[0] = (size0 & 1) === 1 ? size0 + 1 : size0;
        const size1 = Math.floor(this._frameSize[1] / this._tileNumber);
        tileSize[1] = (size1 & 1) === 1 ? size1 + 1 : size1;

        console.log('Tile size: ' + tileSize + ' Frame size: ' + this._frameSize);

        this._tileCameraScanLineGenerator.tileSize = tileSize;
        this._tileCameraHilbertGenerator.tileSize = tileSize;
    }

    protected createTiledCameraUtils(): void {
        this._tileCameraScanLineGenerator = new TileCameraGenerator();
        this._tileCameraScanLineGenerator.sourceCamera = this._camera;
        this._tileCameraScanLineGenerator.sourceViewPort = this._frameSize;
        this._tileCameraScanLineGenerator.padding = vec4.create();
        this._tileCameraScanLine = this._tileCameraScanLineGenerator.camera;
        this._tileCameraScanLineGenerator.algorithm = TileCameraGenerator.IterationAlgorithm.ScanLine;

        this._tileCameraHilbertGenerator = new TileCameraGenerator();
        this._tileCameraHilbertGenerator.sourceCamera = this._camera;
        this._tileCameraHilbertGenerator.sourceViewPort = this._frameSize;
        this._tileCameraHilbertGenerator.padding = vec4.create();
        this._tileCameraHilbert = this._tileCameraHilbertGenerator.camera;
        this._tileCameraHilbertGenerator.algorithm = TileCameraGenerator.IterationAlgorithm.ScanLine;

        this.setTileCameraGeneratorTileSize();
    }

    protected onFrame(): void {
        // prepare
        const gl = this._context.gl;

        this._intermediateFBO.bind();

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._texture.bind(gl.TEXTURE0);

        this._program.bind();

        this._cuboid.bind();
        // render everything new

        if (!this._alreadyRenderedNotTiled) {
            this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);
            // render not tiled quater
            gl.viewport(0, this._frameSize[1] / 2, this._frameSize[0] / 2, this._frameSize[1] / 2);
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
            this._cuboid.draw();
            this._alreadyRenderedNotTiled = true;
        }

        let offset: [number, number] = [0, 0];
        if (this._tileCameraScanLineGenerator.nextTile()) {
            // ScanLine
            offset = this._tileCameraScanLineGenerator.offset;
            gl.viewport(offset[0] / 2 + this._frameSize[0] / 2, offset[1] / 2 + this._frameSize[1] / 2,
                this._tileCameraScanLineGenerator.tileSize[0] / 2, this._tileCameraScanLineGenerator.tileSize[1] / 2);
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
                this._tileCameraScanLineGenerator.camera.viewProjection);
            this._cuboid.draw();
        }

        if (this._tileCameraHilbertGenerator.nextTile()) {
            // Hilbert
            offset = this._tileCameraHilbertGenerator.offset;
            gl.viewport(offset[0] / 2, offset[1] / 2,
                this._tileCameraHilbertGenerator.tileSize[0] / 2, this._tileCameraHilbertGenerator.tileSize[1] / 2);
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE,
                this._tileCameraHilbertGenerator.camera.viewProjection);
            this._cuboid.draw();
            console.log(this._tileCameraHilbertGenerator.tile);
        }


        // restore state
        this._cuboid.unbind();

        this._program.unbind();

        this._texture.unbind(gl.TEXTURE0);

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);

        this._intermediateFBO.unbind();

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        this._blit.frame();
    }

    protected onSwap(): void {
        this.invalidate(true);
    }

}


export class TiledRendererExample extends Example {

    private _canvas: Canvas;
    private _renderer: TiledCubeRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
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
