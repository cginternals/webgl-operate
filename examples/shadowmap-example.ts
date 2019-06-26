
import { mat4, vec3 } from 'webgl-operate';

// import { Plane } from '../demos/shadow-mapping/plane';

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
import { vec2 } from 'gl-matrix';

// tslint:disable:max-classes-per-file


class ShadowMapRenderer extends Renderer {

    // private static readonly SHADOWMAP_SIZE: [number, number] = [1024, 1024];
    // private static readonly BLURRED_SHADOWMAP_SIZE: [number, number] = [512, 512];

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

    // protected _uShadowViewMatrix: WebGLUniformLocation;
    // protected _uShadowProjectionMatrix: WebGLUniformLocation;
    // protected _uShadowFarPlane: WebGLUniformLocation;


    // protected _uMeshViewMatrix: WebGLUniformLocation;
    // protected _uMeshProjectionMatrix: WebGLUniformLocation;
    // protected _uMeshFarPlane: WebGLUniformLocation;
    // protected _uMeshDepthTexture: WebGLUniformLocation;


    protected onInitialize(context: Context, callback: Invalidate,
        mouseEventProvider: MouseEventProvider,
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {

        context.enable(['ANGLE_instanced_arrays', 'OES_standard_derivatives',
            'WEBGL_color_buffer_float', 'OES_texture_float']);

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl;


        this._cuboids = new Array(4);
        for (let i = 0; i < this._cuboids.length; ++i) {
            this._cuboids[i] = new CuboidGeometry(context, 'cube', true, [0.25, 0.5 + 0.5 * i, 2.0]);
            this._cuboids[i].initialize();
        }

        this._plane = new PlaneGeometry(context, 'plane');
        this._plane.initialize();
        this._plane.scale = vec2.fromValues(10, 10);

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(2.8868, 2.8868, 2.8868);
        this._camera.near = 1.0;
        this._camera.far = 12.0;


        this._light = new Camera();
        this._light.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._light.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._light.eye = vec3.fromValues(-2.0, 4.0, 2.0);
        this._light.near = 1.0;
        this._light.far = 8.0;


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
        gl.uniformMatrix4fv(this._program.uniform('u_lightView'), gl.GL_FALSE, this._light.view);
        gl.uniformMatrix4fv(this._program.uniform('u_lightProjection'), gl.GL_FALSE, this._light.projection);

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
        gl.uniformMatrix4fv(this._shadowProgram.uniform('u_lightView'), gl.GL_FALSE, this._light.view);
        gl.uniformMatrix4fv(this._shadowProgram.uniform('u_lightProjection'), gl.GL_FALSE, this._light.projection);

        this._uModelS = this._shadowProgram.uniform('u_model');


        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;


        this._shadowPass = new ShadowPass(context);
        this._shadowPass.initialize(ShadowPass.ShadowMappingType.HardShadowMapping, [1024, 1024], [512, 512]);

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

        return true;
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
        const gl = this._context.gl;

        this._shadowPass.frame(() => {
            this._shadowProgram.bind();
            this.drawCuboids(this._uModelS);
            this._shadowProgram.unbind();
        });

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        this._shadowPass.shadowMapTexture.bind(gl.TEXTURE0);

        gl.uniform1i(this._uColored, true);
        this.drawCuboids(this._uModel);

        gl.uniform1i(this._uColored, false);
        this.drawPlane(this._uModel);

        this._program.unbind();
        this._shadowPass.shadowMapTexture.unbind();

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
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
            gl.uniformMatrix4fv(model, gl.GL_FALSE, M);

            this._cuboids[i].bind();
            this._cuboids[i].draw();
        }
    }

    protected drawPlane(model: WebGLUniformLocation): void {
        const gl = this._context.gl;

        gl.uniformMatrix4fv(model, gl.GL_FALSE, this._plane.transformation);
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
        this._canvas.framePrecision = Wizard.Precision.float;
        this._canvas.frameScale = [1.0, 1.0];

        this._canvas.clearColor.fromHex('ffffff');
        this._canvas.controller.multiFrameNumber = 64;

        // this._canvas.element.addEventListener('click', () => { this._canvas.controller.update(); });

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
