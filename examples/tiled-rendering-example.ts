
/* spellchecker: disable */

import { mat4, vec3, vec4 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    CuboidGeometry,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
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
    protected _tileNumber = 16;

    protected _tileCameraScanLineGenerator: TileCameraGenerator;
    protected _tileCameraScanLine: Camera;
    protected _tileCameraHilbertGenerator: TileCameraGenerator;
    protected _tileCameraHilbert: Camera;

    // todo remove
    protected test1: TileCameraGenerator;


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
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }
        if (this._camera.altered) {
            this._tileCameraScanLineGenerator.updateCameraProperties();
            this._tileCameraHilbertGenerator.updateCameraProperties();
            const temp = this._tileCameraScanLineGenerator;
            this.test1 = temp;
            this.createTiledCameraUtils();
            console.log('=============');
            console.log('=============');
            console.log(temp);
            console.log(this._tileCameraScanLineGenerator);
        }

        this._altered.reset();
        this._camera.altered = false;
    }

    protected renderOneTilePerQuadrant(): void {
        const gl = this._context.gl;
        let offset: [number, number] = [0, 0];
        // ScanLine
        offset = this._tileCameraScanLineGenerator.offset;
        gl.viewport(offset[0] / 2 + this._frameSize[0] / 2, offset[1] / 2 + this._frameSize[1] / 2,
            this._tileCameraScanLineGenerator.tileSize[0] / 2, this._tileCameraScanLineGenerator.tileSize[1] / 2);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._tileCameraScanLine.viewProjection);
        this._cuboid.draw();

        // Hilbert
        this._tileCameraHilbertGenerator.nextTile();
        offset = this._tileCameraHilbertGenerator.offset;
        gl.viewport(offset[0] / 2, offset[1] / 2,
            this._tileCameraHilbertGenerator.tileSize[0] / 2, this._tileCameraHilbertGenerator.tileSize[1] / 2);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._tileCameraHilbert.viewProjection);
        this._cuboid.draw();

    }

    protected setTileCameraGeneratorTileSize(): void {
        const tileSize: [number, number] = [0, 0];

        const floor0 = Math.floor(this._frameSize[0] / this._tileNumber * 2);
        const ceil0 = Math.ceil(this._frameSize[0] / this._tileNumber) * 2;
        tileSize[0] = (floor0 & 1) === 1 ? ceil0 : floor0;
        const floor1 = Math.floor(this._frameSize[1] / this._tileNumber * 2);
        const ceil1 = Math.ceil(this._frameSize[1] / this._tileNumber * 2);
        tileSize[1] = (floor1 & 1) === 1 ? ceil1 : floor1;

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

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);


        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._texture.bind(gl.TEXTURE0);

        this._program.bind();

        this._cuboid.bind();
        // render everything new

        // render not tiled quater
        gl.viewport(0, this._frameSize[1] / 2, this._frameSize[0] / 2, this._frameSize[1] / 2);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        this._cuboid.draw();

        if (this._tileCameraScanLineGenerator === undefined || this._tileCameraScanLineGenerator === null) {
            this.createTiledCameraUtils();
        }

        // create sleep method to visualize rendering
        /*const sleep: (milliseconds: number) => Promise<void> = (milliseconds: number) => {
            return new Promise((resolve) => setTimeout(resolve, milliseconds));
        };
        const sleep2 = new Promise((resolve) => setTimeout(resolve, 10));*/

        let offset: [number, number] = [0, 0];
        while (this._tileCameraScanLineGenerator.nextTile()) {
            this.test1.nextTile();
            // ScanLine
            offset = this._tileCameraScanLineGenerator.offset;
            console.log('correct');
            //console.log(this._tileCameraScanLine.viewProjection);
            this._tileCameraScanLine.viewProjection;
            console.log('wrong');
            this.test1.camera.viewProjection;
            //console.log(this.test1.camera.viewProjection);
            console.log(mat4.equals(this.test1.camera.viewProjection, this._tileCameraScanLine.viewProjection));
            console.log(mat4.exactEquals(this.test1.camera.viewProjection, this._tileCameraScanLine.viewProjection));
            gl.viewport(offset[0] / 2 + this._frameSize[0] / 2, offset[1] / 2 + this._frameSize[1] / 2,
                this._tileCameraScanLineGenerator.tileSize[0] / 2, this._tileCameraScanLineGenerator.tileSize[1] / 2);
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this.test1.camera.viewProjection);
            this._cuboid.draw();

            // Hilbert
            this._tileCameraHilbertGenerator.nextTile();
            offset = this._tileCameraHilbertGenerator.offset;
            gl.viewport(offset[0] / 2, offset[1] / 2,
                this._tileCameraHilbertGenerator.tileSize[0] / 2, this._tileCameraHilbertGenerator.tileSize[1] / 2);
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._tileCameraHilbert.viewProjection);
            this._cuboid.draw();
            //sleep(1).then(() => this.renderOneTilePerQuadrant());
            //sleep2.then(() => this.renderOneTilePerQuadrant());
        }

        this._tileCameraScanLineGenerator.resetTileRendering();
        this._tileCameraHilbertGenerator.resetTileRendering();
        this.test1.resetTileRendering();

        // restore state
        this._cuboid.unbind();

        this._program.unbind();

        this._texture.unbind(gl.TEXTURE0);

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
    }

    protected onSwap(): void { }

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
