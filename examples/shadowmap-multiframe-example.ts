
/* spellchecker: disable */

import { mat4, vec2, vec3 } from '../../webgl-operate';

import {
    AccumulatePass,
    AntiAliasingKernel,
    BlitPass,
    Camera,
    Canvas,
    Context,
    CuboidGeometry,
    DefaultFramebuffer,
    EventProvider,
    Framebuffer,
    Invalidate,
    Navigation,
    NdcFillingTriangle,
    PlaneGeometry,
    Program,
    Renderbuffer,
    Renderer,
    Shader,
    ShadowPass,
    Texture2D,
    Wizard,
} from '../../webgl-operate';

import { Example } from './example';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


class ShadowMapMultiframeRenderer extends Renderer {

    protected _cuboids: Array<CuboidGeometry>;
    protected _plane: PlaneGeometry;
    protected _ndcTriangle: NdcFillingTriangle;

    protected _defaultFBO: DefaultFramebuffer;
    protected _colorRenderTexture: Texture2D;
    protected _depthRenderbuffer: Renderbuffer;
    protected _intermediateFBO: Framebuffer;

    protected _navigation: Navigation;

    protected _camera: Camera;
    protected _light: Camera;
    protected _lightSamples: Array<vec3>;

    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;

    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uColored: WebGLUniformLocation;
    protected _uLightViewProjection: WebGLUniformLocation;
    protected _uLightPosition: WebGLUniformLocation;

    protected _shadowProgram: Program;
    protected _uModelS: WebGLUniformLocation;
    protected _uLightViewProjectionS: WebGLUniformLocation;
    protected _uLightPositionS: WebGLUniformLocation;

    protected _shadowPass: ShadowPass;
    protected _accumulate: AccumulatePass;
    protected _blit: BlitPass;


    protected onInitialize(context: Context, callback: Invalidate,
        eventProvider: EventProvider): boolean {

        context.enable(['ANGLE_instanced_arrays', 'OES_standard_derivatives',
            'WEBGL_color_buffer_float', 'OES_texture_float', 'OES_texture_float_linear']);

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl as WebGLRenderingContext;
        const gl2facade = this._context.gl2facade;

        this._cuboids = new Array(4);
        for (let i = 0; i < this._cuboids.length; ++i) {
            this._cuboids[i] = new CuboidGeometry(context, 'cube', true, [0.25, 0.5 + 0.5 * i, 2.0]);
            this._cuboids[i].initialize();
        }

        this._plane = new PlaneGeometry(context, 'plane');
        this._plane.initialize();
        this._plane.scale = vec2.fromValues(100, 100);

        this._ndcTriangle = new NdcFillingTriangle(this._context);
        this._ndcTriangle.initialize();


        if (this._camera === undefined) {
            this._camera = new Camera();
            this._camera.center = vec3.fromValues(0.0, 0.75, 0.0);
            this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._camera.eye = vec3.fromValues(1.8, 2.6, 3.4);
            this._camera.near = 2.0;
            this._camera.far = 11.0;
        }

        if (this._light === undefined) {
            this._light = new Camera();
            this._light.center = vec3.fromValues(0.0, 0.0, 0.0);
            this._light.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._light.eye = vec3.fromValues(-3.0, 5.0, 4.0);
            this._light.near = 3.0;
            this._light.far = 20.0;
        }


        this._colorRenderTexture = new Texture2D(this._context, 'ColorRenderTexture');
        this._depthRenderbuffer = new Renderbuffer(this._context, 'DepthRenderbuffer');
        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');

        const vert = new Shader(context, gl.VERTEX_SHADER, 'mesh-shadowed.vert');
        vert.initialize(require('./data/mesh-shadowed.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'mesh-shadowed.frag');
        frag.initialize(require('./data/mesh-shadowed-multiframe.frag'));

        this._program = new Program(context, 'MeshShadowedProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._cuboids[0].vertexLocation);
        this._program.attribute('a_texCoord', this._cuboids[0].uvCoordLocation);
        this._program.link();
        this._program.bind();

        gl.uniform2f(this._program.uniform('u_lightNearFar'), this._light.near, this._light.far);
        gl.uniform1i(this._program.uniform('u_shadowMap'), 0);

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uModel = this._program.uniform('u_model');
        this._uLightViewProjection = this._program.uniform('u_lightViewProjection');
        this._uLightPosition = this._program.uniform('u_lightPosition');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');

        this._uColored = this._program.uniform('u_colored');

        const shadowVert = new Shader(context, gl.VERTEX_SHADER, 'shadow.vert');
        shadowVert.initialize(require('./data/shadow.vert'));
        const shadowFrag = new Shader(context, gl.FRAGMENT_SHADER, 'shadow.frag');
        shadowFrag.initialize(require('./data/shadow-multiframe.frag'));

        this._shadowProgram = new Program(context);
        this._shadowProgram.initialize([shadowVert, shadowFrag], false);
        this._shadowProgram.attribute('a_vertex', this._cuboids[0].vertexLocation);
        this._shadowProgram.link();
        this._shadowProgram.bind();

        gl.uniform2f(this._shadowProgram.uniform('u_lightNearFar'), this._light.near, this._light.far);

        this._uModelS = this._shadowProgram.uniform('u_model');
        this._uLightViewProjectionS = this._shadowProgram.uniform('u_lightViewProjection');
        this._uLightPositionS = this._shadowProgram.uniform('u_lightPosition');


        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;


        this._accumulate = new AccumulatePass(context);
        this._accumulate.initialize(this._ndcTriangle);
        this._accumulate.precision = this._framePrecision;
        this._accumulate.texture = this._colorRenderTexture;


        this._blit = new BlitPass(this._context);
        this._blit.initialize(this._ndcTriangle);
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;

        this._shadowPass = new ShadowPass(context);
        this._shadowPass.initialize(ShadowPass.ShadowMappingType.HardLinear, [1024, 1024]);

        this.finishLoading();

        return true;
    }

    protected onUninitialize(): void {
        super.uninitialize();

        this._defaultFBO.uninitialize();

        for (const cuboid of this._cuboids) {
            cuboid.uninitialize();
        }
        this._plane.uninitialize();
        this._ndcTriangle.uninitialize();

        this._shadowPass.uninitialize();
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
        this._altered.alter('clearColor');
        this._altered.alter('frameSize');
    }

    protected onUpdate(): boolean {
        this._navigation.update();
        return this._camera.altered;
    }

    protected onPrepare(): void {
        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        if (!this._intermediateFBO.initialized) {
            this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);
            this._intermediateFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
        }

        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);

            // /* Create light samples along circle around eye (light position). */

            const n = vec3.sub(vec3.create(), this._light.eye, this._light.center);
            vec3.normalize(n, n);

            const u = vec3.cross(vec3.create(), n, vec3.fromValues(0.0, 1.0, 0.0));
            const v = vec3.cross(vec3.create(), n, u);

            this._lightSamples = new Array<vec3>(this._multiFrameNumber);
            for (let i = 0; i < this._multiFrameNumber; ++i) {
                const p = vec3.clone(this._light.eye);

                const r = Math.random() * 0.25; // Math.sqrt(i / this._multiFrameNumber);
                const theta = Math.random() * Math.PI * 2.0;

                vec3.scaleAndAdd(p, p, u, r * Math.cos(theta));
                vec3.scaleAndAdd(p, p, v, r * Math.sin(theta));

                this._lightSamples[i] = p;
            }

            this._lightSamples.sort((a: vec3, b: vec3) =>
                vec3.sqrDist(a, this._light.eye) - vec3.sqrDist(b, this._light.eye));
        }

        this._accumulate.update();

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl as WebGLRenderingContext;


        this._light.eye = this._lightSamples[frameNumber];

        this._shadowPass.frame(() => {
            gl.enable(gl.DEPTH_TEST);
            this._shadowProgram.bind();
            gl.uniformMatrix4fv(this._uLightViewProjectionS, false, this._light.viewProjection);
            gl.uniform3fv(this._uLightPositionS, this._light.eye);
            this.drawCuboids(this._uModelS);
            this._shadowProgram.unbind();
            gl.disable(gl.DEPTH_TEST);
        });

        this._intermediateFBO.bind();
        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);


        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];


        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);
        gl.uniformMatrix4fv(this._uLightViewProjection, false, this._light.viewProjection);
        gl.uniform3fv(this._uLightPosition, this._light.eye);
        gl.uniform2fv(this._uNdcOffset, ndcOffset);

        this._shadowPass.shadowMapTexture.bind(gl.TEXTURE0);

        gl.uniform1i(this._uColored, Number(true));
        this.drawCuboids(this._uModel);

        gl.uniform1i(this._uColored, Number(false));
        this.drawPlane(this._uModel);

        this._program.unbind();
        this._shadowPass.shadowMapTexture.unbind();

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        this._accumulate.frame(frameNumber);
    }

    protected onSwap(): void {
        this._blit.framebuffer = this._accumulate.framebuffer ?
            this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
        this._blit.frame();
    }

    protected drawCuboids(model: WebGLUniformLocation): void {
        const gl = this._context.gl;

        const M = mat4.create();
        for (let i = 0; i < this._cuboids.length; ++i) {

            const x = i * 0.5 - 0.75;
            const y = this._cuboids[i].extent[1] * 0.5;

            mat4.fromTranslation(M, vec3.fromValues(-x, y, 0.0));
            gl.uniformMatrix4fv(model, false, M);

            this._cuboids[i].bind();
            this._cuboids[i].draw();
        }
    }

    protected drawPlane(model: WebGLUniformLocation): void {
        const gl = this._context.gl;

        gl.uniformMatrix4fv(model, false, this._plane.transformation);
        this._plane.bind();
        this._plane.draw();
    }

}

export class ShadowMapMultiframeExample extends Example {

    private _canvas: Canvas;
    private _renderer: ShadowMapMultiframeRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element);
        this._canvas.framePrecision = Wizard.Precision.half;
        this._canvas.frameScale = [1.0, 1.0];

        this._canvas.clearColor.fromHex('ffffff');
        this._canvas.controller.multiFrameNumber = 128;

        this._renderer = new ShadowMapMultiframeRenderer();
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

    get renderer(): ShadowMapMultiframeRenderer {
        return this._renderer;
    }

}
