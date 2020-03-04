
import { vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EventProvider,
    Framebuffer,
    Invalidate,
    Navigation,
    NdcFillingTriangle,
    Program,
    Renderer,
    Shader,
    Texture2D,
    TextureCube,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

// tslint:disable:max-classes-per-file

class EnvironmentProjectionRenderer extends Renderer {

    protected _defaultFBO: Framebuffer;

    protected _ndcTriangle: NdcFillingTriangle;
    protected _program: Program;

    protected _cubeMap: TextureCube;
    protected _equiRectangularMap: Texture2D;
    protected _sphereMap: Texture2D;
    protected _polarMaps: Array<Texture2D>;

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uViewProjectionInverse: WebGLUniformLocation;

    protected _uViewport: WebGLUniformLocation;
    protected _uTime: WebGLUniformLocation;
    protected _uMode: WebGLUniformLocation;

    protected onInitialize(context: Context, callback: Invalidate, eventProvider: EventProvider): boolean {

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = this._context.gl;

        this._ndcTriangle = new NdcFillingTriangle(this._context, 'NdcFillingTriangle');
        this._ndcTriangle.initialize();

        this.fetchTextures();

        // Initialize program and uniforms
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices');
        vert.initialize(require('./data/env-projections.vert'));

        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'env-projections');
        frag.initialize(require('./data/env-projections.frag'));

        this._program = new Program(this._context, 'EnvProjectionsProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);
        this._program.link();

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_cubemap'), 0);
        gl.uniform1i(this._program.uniform('u_equirectmap'), 1);
        gl.uniform1i(this._program.uniform('u_spheremap'), 2);
        gl.uniform1iv(this._program.uniform('u_polarmap'), [3, 4]);

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uViewProjectionInverse = this._program.uniform('u_viewProjectionInverse');
        this._uViewport = this._program.uniform('u_viewport');
        this._uTime = this._program.uniform('u_time');
        this._uMode = this._program.uniform('u_mode');

        // Initialize camera
        this._camera = new Camera();
        this._camera.eye = vec3.fromValues(0.0, 0.5, -1.0);
        this._camera.center = vec3.fromValues(0.0, 0.4, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.near = 0.1;
        this._camera.far = 4.0;

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        gl.uniform2iv(this._uViewport, this._canvasSize);

        return true;
    }

    protected onUninitialize(): void {
        this._cubeMap.uninitialize();
        this._equiRectangularMap.uninitialize();
        this._sphereMap.uninitialize();

        for (const map of this._polarMaps) {
            map.uninitialize();
        }
    }

    protected onUpdate(): boolean {
        this._navigation.update();
        return this._altered.any || this._camera.altered;
    }

    protected onPrepare(): void {
        if (this._altered.canvasSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }
        this._altered.reset();
    }

    protected onFrame(/*frameNumber: number*/): void {
        if (this.isLoading) {
            return;
        }

        const gl = this._context.gl;

        gl.viewport(0, 0, this._canvasSize[0], this._canvasSize[1]);

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        this._cubeMap.bind(gl.TEXTURE0);
        this._equiRectangularMap.bind(gl.TEXTURE1);
        this._sphereMap.bind(gl.TEXTURE2);
        this._polarMaps[0].bind(gl.TEXTURE3);
        this._polarMaps[1].bind(gl.TEXTURE4);
        this._program.bind();

        gl.uniform2iv(this._uViewport, this._canvasSize);
        gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);
        gl.uniformMatrix4fv(this._uViewProjectionInverse, false, this._camera.viewProjectionInverse);

        const t = ((new Date()).getTime() % 10000000) * 0.001;
        gl.uniform1f(this._uTime, t);

        this._ndcTriangle.bind();

        const b = 1.0;
        const w = (this._frameSize[0] - (4.0 - 1.0) * b) / 4.0;
        const h = this._frameSize[1];

        gl.enable(gl.SCISSOR_TEST);

        gl.scissor((w + b) * 0.0, 0, w, h);
        gl.uniform1i(this._uMode, 2); // sphere map
        this._ndcTriangle.draw();

        gl.scissor((w + b) * 1.0, 0, w, h);
        gl.uniform1i(this._uMode, 1); // equirectangular map
        this._ndcTriangle.draw();

        gl.scissor((w + b) * 2.0, 0, w, h);
        gl.uniform1i(this._uMode, 0); // cube map
        this._ndcTriangle.draw();

        gl.scissor((w + b) * 3.0, 0, w, h);
        gl.uniform1i(this._uMode, 3); // dual paraboloid map
        this._ndcTriangle.draw();

        gl.disable(gl.SCISSOR_TEST);

        this._ndcTriangle.unbind();

        this._program.unbind();
    }

    protected onSwap(): void {
        this.invalidate();
    }

    protected setupTexture2D(texture: Texture2D, unit: number): void {
        const gl = this._context.gl;

        texture.bind(unit);
        // gl.generateMipmap(gl.TEXTURE_2D);

        texture.wrap(gl.REPEAT, gl.REPEAT, false, false);
        texture.filter(gl.NEAREST, gl.NEAREST, false, false);

        this.invalidate(true);
    }

    protected fetchTextures(): void {
        const gl = this._context.gl;

        const promises = new Array();

        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGB, Wizard.Precision.byte);

        this._cubeMap = new TextureCube(this._context);
        this._cubeMap.initialize(592, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        this._cubeMap.fetch({
            positiveX: 'data/cube-map-px.jpg', negativeX: 'data/cube-map-nx.jpg',
            positiveY: 'data/cube-map-py.jpg', negativeY: 'data/cube-map-ny.jpg',
            positiveZ: 'data/cube-map-pz.jpg', negativeZ: 'data/cube-map-nz.jpg',
        }).then(() => {
            const gl = this._context.gl;
            this._cubeMap.filter(gl.NEAREST, gl.NEAREST, true, true);

            this.invalidate(true);
        });


        this._equiRectangularMap = new Texture2D(this._context);
        this._equiRectangularMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._equiRectangularMap.fetch('data/equirectangular-map.jpg').then(() => {
                this.setupTexture2D(this._equiRectangularMap, gl.TEXTURE1);
            }));


        this._sphereMap = new Texture2D(this._context);
        this._sphereMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._sphereMap.fetch('data/sphere-map-ny.jpg').then(() => {
                this.setupTexture2D(this._sphereMap, gl.TEXTURE2);
            }));


        this._polarMaps = new Array(2);
        this._polarMaps[0] = new Texture2D(this._context);
        this._polarMaps[0].initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._polarMaps[0].fetch('data/paraboloid-map-py.jpg').then(() => {
                this.setupTexture2D(this._polarMaps[0], gl.TEXTURE3);
            }));


        this._polarMaps[1] = new Texture2D(this._context);
        this._polarMaps[1].initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._polarMaps[1].fetch('data/paraboloid-map-ny.jpg').then(() => {
                this.setupTexture2D(this._polarMaps[1], gl.TEXTURE4);
            }));

        Promise.all(promises).then(() => {
            this.finishLoading();
        });
    }
}

export class EnvironmentProjectionExample extends Example {

    private _canvas: Canvas;
    private _renderer: EnvironmentProjectionRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new EnvironmentProjectionRenderer();
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

    get renderer(): EnvironmentProjectionRenderer {
        return this._renderer;
    }

}
