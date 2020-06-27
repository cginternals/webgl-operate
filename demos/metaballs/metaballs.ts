/* spellchecker: disable */

import { vec3 } from 'webgl-operate';

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
    TextureCube,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Demo } from '../demo';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


export class MetaballsRenderer extends Renderer {

    protected _uInverseViewProjection: WebGLUniformLocation;
    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _ndcTriangle: NdcFillingTriangle;
    protected _cubeMap: TextureCube;
    protected _metaballsTexture: Texture2D;
    protected numberOfMetaballs = 7;
    protected numberOfMetaballAttributes = 2; // number of vec4's per metaball.
    protected _metaballsPhysicsTexture: Texture2D;
    protected _metaballColorsTexture: Texture2D;

    protected _program: Program;
    protected _physicsProgram: Program;
    protected _defaultFBO: DefaultFramebuffer;
    protected _physicsFBO: Framebuffer;
    protected _lastRenderingTime = 0.0;

    protected onUpdate(): boolean {

        // Update camera navigation (process events)
        this._navigation.update();
        //return this._altered.any || this._camera.altered;
        return true;
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
        this._altered.alter('clearColor');
        this._altered.alter('frameSize');
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

    protected renderPhysicsToTexture(): void {
        const gl = this._context.gl;
        const targetTextureWidth = this.numberOfMetaballs * this.numberOfMetaballAttributes;
        const targetTextureHeight = 1;

        this._physicsFBO.bind();
        this._physicsFBO.attachTexture(gl.COLOR_ATTACHMENT0, this._metaballsPhysicsTexture);
        gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

        this._physicsProgram.bind();

        this._metaballsTexture.bind(gl.TEXTURE0);

        const newTime = new Date().getTime() / 1000;
        const deltaTime = newTime - this._lastRenderingTime;
        gl.uniform1f(this._physicsProgram.uniform('u_deltaTime'), deltaTime);

        this._lastRenderingTime = newTime;


        // render geometry
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();

        this._metaballsTexture.unbind();
        this._physicsProgram.unbind();

        const data = new Float32Array(targetTextureWidth * targetTextureHeight * 4);
        gl.readPixels(0, 0, targetTextureWidth, targetTextureHeight, gl.RGBA, gl.FLOAT, data);
        console.log(data);
        this._physicsFBO.unbind();
    }

    protected onFrame(): void {
        const gl = this._context.gl;

        this.renderPhysicsToTexture();
        this.performTexturePingPong();

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        // Bind Program
        this._program.bind();

        // Bind textures and uniforms
        this._metaballsPhysicsTexture.bind(gl.TEXTURE0);
        this._metaballColorsTexture.bind(gl.TEXTURE1);
        this._cubeMap.bind(gl.TEXTURE3);

        gl.uniformMatrix4fv(this._uInverseViewProjection, gl.GL_FALSE, this._camera.viewProjectionInverse);

        // render geometry
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();

        this._program.unbind();

        //const data = new Uint8Array(this._frameSize[0] * this._frameSize[1] * 4);
        //gl.readPixels(0, 0, this._frameSize[0], this._frameSize[1], gl.RGBA, gl.UNSIGNED_BYTE, data);
        //console.log(data);

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected performTexturePingPong(): void {
        const tempReference = this._metaballsPhysicsTexture;
        this._metaballsPhysicsTexture = this._metaballsTexture;
        this._metaballsTexture = tempReference;
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

        this.createMetaballsTexture();
        this.createCubeMapTexture();
        this.setUpPhysicsRendering();

        this._uInverseViewProjection = this._program.uniform('u_inverseViewProjection');
        this._camera = new Camera();
        this._camera.eye = vec3.fromValues(0.0, 0.5, -2.0);
        this._camera.center = vec3.fromValues(0.0, 0.4, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.near = 0.1;
        this._camera.far = 4.0;

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        this._lastRenderingTime = new Date().getTime() / 1000;

        return true;
    }

    protected onUninitialize(): void {
        super.uninitialize();
        this._cubeMap.uninitialize();
        this._ndcTriangle.uninitialize();

        this._program.uninitialize();

        this._defaultFBO.uninitialize();
    }

    protected setUpPhysicsRendering(): void {
        const gl = this._context.gl;
        const targetTextureWidth = this.numberOfMetaballs * this.numberOfMetaballAttributes;
        const targetTextureHeight = 1;

        this._metaballsPhysicsTexture = new Texture2D(this._context, 'metaballsPhysics');
        this._metaballsPhysicsTexture.initialize(targetTextureWidth, targetTextureHeight,
            gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this._metaballsPhysicsTexture.filter(gl.NEAREST, gl.NEAREST);

        this._physicsFBO = new Framebuffer(this._context, 'PhysicsFBO');
        this._physicsFBO.initialize([[gl.COLOR_ATTACHMENT0, this._metaballsPhysicsTexture]]);
        this._physicsFBO.resize(targetTextureWidth, targetTextureHeight);

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'physics.vert');
        vert.initialize(require('./physics.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'physics.frag');
        frag.initialize(require('./physics.frag'));

        this._physicsProgram = new Program(this._context, 'MetaballsPhysicsProgram');
        this._physicsProgram.initialize([vert, frag], false);
        this._physicsProgram.attribute('a_vertex', this._ndcTriangle.vertexLocation);

        this._physicsFBO.bind();
        gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

        this._physicsProgram.link();
        this._physicsProgram.bind();

        gl.uniform1i(this._physicsProgram.uniform('u_metaballsTexture'), 0);
        // TODO refactor magic number
        gl.uniform1i(this._physicsProgram.uniform('u_metaballsTextureSize'),
            this.numberOfMetaballs * this.numberOfMetaballAttributes);
    }

    protected createMetaballsTexture(): void {
        // const metaballs = new Float32Array(numberOfMetaballs * 4);
        // metaballs.forEach((val, i, array) => array[i] = Math.random() + 0.5);
        const metaballs = new Float32Array([
            // x,  y,   z,  metaball-energy, velocity x, y, z, placeholder
            -0.3, -0.3, 0.9, 0.7, 0.0, 0.0, 0.0, 0.0,
            -0.8, 0.1, 0.4, 0.7, 0.0, 0.0, 0.0, 0.0,
            0.4, -0.4, 0.6, 0.7, 0.0, 0.0, 0.0, 0.0,
            0.5, 0.7, 0.2, 0.7, 0.0, 0.0, 0.0, 0.0,
            -0.5, 0.5, 0.2, 0.7, 0.0, 0.0, 0.0, 0.0,
            0.0, 0.5, 0.2, 0.7, 0.0, 0.0, 0.0, 0.0,
            0.2, -0.1, -0.5, 0.5, 0.0, 0.0, 0.0, 0.0,
        ]);

        const metaballColors = new Float32Array(this.numberOfMetaballs * 4);
        for (let i = 0; i < this.numberOfMetaballs; i += 4) {
            let temp = vec3.fromValues(Math.random(), Math.random(), Math.random());
            vec3.normalize(temp, temp);
            metaballColors[i + 0] = (Math.random() / 2.0) + 0.5;  //r
            metaballColors[i + 1] = (Math.random() / 2.0) + 0.5;  //g
            metaballColors[i + 2] = (Math.random() / 2.0) + 0.5;  //b
            metaballColors[i + 3] = 1.0;                          //a
        }
        //console.log(metaballColors);
        //metaballColors.forEach((val, i, array) => array[i] = Math.random());
        /*const metaballColors = new Float32Array([
            // r, g, b, a
            0.105, 0.768, 0.011, 1.0,
            0.968, 0.411, 0.737, 1.0,
            0.325, 0.454, 0.992, 1.0,
            0.986, 0.274, 0.290, 1.0,
            0.986, 0.274, 0.290, 1.0,
            0.968, 0.411, 0.737, 1.0,
            0.105, 0.768, 0.011, 1.0,
        ]);*/
        const gl = this._context.gl;

        this._metaballsTexture = new Texture2D(this._context, 'metaballsTexture');
        this._metaballsTexture.initialize(metaballs.length / 4, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this._metaballsTexture.filter(gl.NEAREST, gl.NEAREST);
        this._metaballsTexture.data(metaballs);
        gl.uniform1i(this._program.uniform('u_metaballsTexture'), 0);
        gl.uniform1i(this._program.uniform('u_metaballsTextureSize'), metaballs.length / 4);

        this._metaballColorsTexture = new Texture2D(this._context, 'metaballColorsTexture');
        this._metaballColorsTexture.initialize(metaballColors.length / 4, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this._metaballColorsTexture.data(metaballColors);
        gl.uniform1i(this._program.uniform('u_metaballColorsTexture'), 1);
        gl.uniform1i(this._program.uniform('u_metaballsColorTextureSize'), metaballColors.length / 4);
    }

    protected createCubeMapTexture(): void {
        const gl = this._context.gl;

        gl.uniform1i(this._program.uniform('u_cubemap'), 3);
        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGB, Wizard.Precision.byte);
        this._cubeMap = new TextureCube(this._context);
        this._cubeMap.initialize(592, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);
        this._cubeMap.fetch({
            positiveX: '/demos/data/cube-map-px.jpg', negativeX: '/demos/data/cube-map-nx.jpg',
            positiveY: '/demos/data/cube-map-py.jpg', negativeY: '/demos/data/cube-map-ny.jpg',
            positiveZ: '/demos/data/cube-map-pz.jpg', negativeZ: '/demos/data/cube-map-nz.jpg',
        }).then(() => {
            const gl = this._context.gl;
            this._cubeMap.filter(gl.LINEAR, gl.LINEAR, true, true);

            this.invalidate(true);
        });
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
