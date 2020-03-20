
/* spellchecker: disable */

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EventProvider,
    Invalidate,
    Navigation,
    NdcFillingTriangle,
    Program,
    Renderer,
    Shader,
    Wizard,
} from 'webgl-operate';

import { Demo } from '../demo';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


export class MetaballsRenderer extends Renderer {

    protected _camera: Camera;
    protected _navigation: Navigation;
    protected _ndcTriangle: NdcFillingTriangle;

    protected _program: Program;

    protected _defaultFBO: DefaultFramebuffer;

    protected onUpdate(): boolean {

        // Update camera navigation (process events)
        this._navigation.update();
        return this._altered.any || this._camera.altered;
    }

    protected onPrepare(): void {
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
            this._camera.viewport = this._canvasSize;
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(): void {
        const gl = this._context.gl;

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._program.bind();

        // render geometry
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();

        this._program.unbind();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void { }

    protected onInitialize(context: Context, callback: Invalidate,
        eventProvider: EventProvider): boolean {

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl;


        this._ndcTriangle = new NdcFillingTriangle(this._context);
        this._ndcTriangle.initialize();


        const vert = new Shader(context, gl.VERTEX_SHADER, 'metaballs.vert');
        vert.initialize(require('./metaballs.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'metaballs.frag');
        frag.initialize(require('./metaballs.frag'));


        this._program = new Program(context, 'MetaballsProgram');
        this._program.initialize([vert, frag], false);
        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);


        this._program.link();
        this._program.bind();

        this.createMetaballsTexture(context);

        this._camera = new Camera();

        this._navigation = new Navigation(callback, eventProvider.mouseEventProvider);
        this._navigation.camera = this._camera;

        return true;
    }

    protected onUninitialize(): void {
        super.uninitialize();
        this._ndcTriangle.uninitialize();

        this._program.uninitialize();

        this._defaultFBO.uninitialize();
    }

    protected createMetaballsTexture(context: Context): void {
        const metaballs = new Float32Array([
            // x,  y,   z,  metaball-energy
            0.0, -0.5, 0.9, 1.0,
            -0.2, 0.2, 0.7, 1.5,
            0.9, -0.2, 0.9, 1.0,
            0.5, 0.3,  0.2, 1.0,
        ]);
        const numberOfMetaballs = metaballs.length / 4;

        const gl = context.gl;
        const metaballsTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, metaballsTexture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, numberOfMetaballs, 1, 0,
            gl.RGBA, gl.FLOAT, metaballs);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, metaballsTexture);
        gl.uniform1i(this._program.uniform('u_metaballsTexture'), 0);
        gl.uniform1i(this._program.uniform('u_metaballsTextureSize'), numberOfMetaballs);
    }

    protected createLightsTexture(context: Context): void {
        const lights = new Float32Array([
            // x,  y,   z,  shininess-factor
            0.0, -0.5, 0.9, 1.0
        ]);
        const numberOfMetaballs = lights.length / 4;

        const gl = context.gl;
        const lightsTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, lightsTexture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, numberOfMetaballs, 1, 0,
            gl.RGBA, gl.FLOAT, lights);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, lightsTexture);
        gl.uniform1i(this._program.uniform('u_lightsTexture'), 0);
        gl.uniform1i(this._program.uniform('u_lightsTextureSize'), numberOfMetaballs);
    }
}


export class MetaballsDemo extends Demo {

    private _canvas: Canvas;
    private _renderer: MetaballsRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element);
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.float;
        this._canvas.clearColor.fromHex('d6d8db');
        this._canvas.frameScale = [1.0, 1.0];

        this._canvas.element.addEventListener('click', () => { this._canvas.controller.update(); });

        this._renderer = new MetaballsRenderer();
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

    get renderer(): MetaballsRenderer {
        return this._renderer;
    }
}
