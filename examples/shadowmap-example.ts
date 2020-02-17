
import { mat4, vec2, vec3 } from 'webgl-operate';

import {
    Camera,
    Canvas,
    Context,
    CuboidGeometry,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    PlaneGeometry,
    Program,
    Renderer,
    Shader,
    ShadowPass,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

// tslint:disable:max-classes-per-file


class ShadowMapRenderer extends Renderer {

    protected _cuboids: Array<CuboidGeometry>;
    protected _plane: PlaneGeometry;

    protected _defaultFBO: DefaultFramebuffer;
    protected _navigation: Navigation;

    protected _camera: Camera;
    protected _light: Camera;

    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uColored: WebGLUniformLocation;

    protected _shadowProgram: Program;
    protected _uModelS: WebGLUniformLocation;

    protected _shadowPass: ShadowPass;

    protected onInitialize(context: Context, callback: Invalidate,
        mouseEventProvider: MouseEventProvider,
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {

        context.enable(['ANGLE_instanced_arrays', 'OES_standard_derivatives',
            'WEBGL_color_buffer_float', 'OES_texture_float', 'OES_texture_float_linear']);

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl as WebGLRenderingContext;


        this._cuboids = new Array(4);
        for (let i = 0; i < this._cuboids.length; ++i) {
            this._cuboids[i] = new CuboidGeometry(context, 'cube', true, [0.25, 0.5 + 0.5 * i, 2.0]);
            this._cuboids[i].initialize();
        }

        this._plane = new PlaneGeometry(context, 'plane');
        this._plane.initialize();
        this._plane.scale = vec2.fromValues(100, 100);

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.75, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(1.8, 2.6, 3.4);
        this._camera.near = 2.0;
        this._camera.far = 11.0;


        this._light = new Camera();
        this._light.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._light.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._light.eye = vec3.fromValues(-3.0, 5.0, 4.0);
        this._light.near = 3.0;
        this._light.far = 20.0;


        const vert = new Shader(context, gl.VERTEX_SHADER, 'mesh-shadowed.vert');
        vert.initialize(require('./data/mesh-shadowed.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'mesh-shadowed.frag');
        frag.initialize(require('./data/mesh-shadowed.frag'));

        this._program = new Program(context, 'MeshShadowedProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._cuboids[0].vertexLocation);
        this._program.attribute('a_texCoord', this._cuboids[0].uvCoordLocation);
        this._program.link();
        this._program.bind();

        gl.uniform2f(this._program.uniform('u_lightNearFar'), this._light.near, this._light.far);
        gl.uniformMatrix4fv(this._program.uniform('u_lightViewProjection'), false, this._light.viewProjection);
        gl.uniform3fv(this._program.uniform('u_lightPosition'), this._light.eye);

        gl.uniform1i(this._program.uniform('u_shadowMap'), 0);

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uModel = this._program.uniform('u_model');

        this._uColored = this._program.uniform('u_colored');

        const shadowVert = new Shader(context, gl.VERTEX_SHADER, 'shadow.vert');
        shadowVert.initialize(require('./data/shadow.vert'));
        const shadowFrag = new Shader(context, gl.FRAGMENT_SHADER, 'shadow.frag');
        shadowFrag.initialize(require('./data/shadow.frag'));

        this._shadowProgram = new Program(context);
        this._shadowProgram.initialize([shadowVert, shadowFrag], false);
        this._shadowProgram.attribute('a_vertex', this._cuboids[0].vertexLocation);
        this._shadowProgram.link();
        this._shadowProgram.bind();

        gl.uniform2f(this._shadowProgram.uniform('u_lightNearFar'), this._light.near, this._light.far);
        gl.uniformMatrix4fv(this._shadowProgram.uniform('u_lightViewProjection'), false, this._light.viewProjection);
        gl.uniform3fv(this._shadowProgram.uniform('u_lightPosition'), this._light.eye);

        this._uModelS = this._shadowProgram.uniform('u_model');


        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;


        this._shadowPass = new ShadowPass(context);
        this._shadowPass.initialize(ShadowPass.ShadowMappingType.HardLinear,
            [1024, 1024], [1024, 1024]);

        return true;
    }

    protected onUninitialize(): void {
        super.uninitialize();

        this._defaultFBO.uninitialize();

        for (const cuboid of this._cuboids) {
            cuboid.uninitialize();
        }
        this._plane.uninitialize();

        this._shadowPass.uninitialize();
    }

    protected onUpdate(): boolean {
        this._navigation.update();
        return this._camera.altered;
    }

    protected onPrepare(): void {
        if (this._altered.frameSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl as WebGLRenderingContext;

        this._shadowPass.frame(() => {
            gl.enable(gl.DEPTH_TEST);
            this._shadowProgram.bind();
            this.drawCuboids(this._uModelS);
            this.drawPlane(this._uModelS);
            this._shadowProgram.unbind();
            gl.disable(gl.DEPTH_TEST);
        });

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);

        this._shadowPass.shadowMapTexture.bind(gl.TEXTURE0);

        gl.uniform1i(this._uColored, Number(true));
        this.drawCuboids(this._uModel);

        gl.uniform1i(this._uColored, Number(false));
        this.drawPlane(this._uModel);

        this._program.unbind();
        this._shadowPass.shadowMapTexture.unbind();

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void {

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

export class ShadowMapExample extends Example {

    private _canvas: Canvas;
    private _renderer: ShadowMapRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element);
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._canvas.clearColor.fromHex('ffffff');

        this._renderer = new ShadowMapRenderer();
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

    get renderer(): ShadowMapRenderer {
        return this._renderer;
    }

}
