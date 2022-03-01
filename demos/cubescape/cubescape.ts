
/* spellchecker: disable */

import { vec3 } from 'webgl-operate';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EventProvider,
    Invalidate,
    Navigation,
    Program,
    Renderer,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Demo } from '../demo';

import { CubeGeometry } from './cubegeometry';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


const _gEye = vec3.fromValues(1.5, -0.2, 1.5); //vec3.fromValues(1.0, -0.5, -1.0);
const _gCenter = vec3.fromValues(0.0, -1.0, 0.0);
const _gUp = vec3.fromValues(0.0, 1.0, 0.0);


class CubescapeRenderer extends Renderer {

    protected _defaultFBO: DefaultFramebuffer;

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _geometry: CubeGeometry;
    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _aVertex: GLuint;
    protected _numCubes = 128;

    protected _patches: Texture2D;
    protected _terrain: Texture2D;


    protected onUpdate(): boolean {

        this._navigation.update();

        return this._altered.any || this._camera.altered;
    }

    protected onPrepare(): void {

        if (this._altered.canvasSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }
        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._geometry.count = this._numCubes;

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        // bind FBO
        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.DEPTH_BUFFER_BIT, true, true);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);
        gl.uniform1i(this._program.uniform('u_numcubes'), this._geometry.count);
        gl.uniform1f(this._program.uniform('u_time'), window.performance.now() * 0.0002);
        this._terrain.bind(gl.TEXTURE0);
        this._patches.bind(gl.TEXTURE1);
        gl.uniform1i(this._program.uniform('u_terrain'), 0);
        gl.uniform1i(this._program.uniform('u_patches'), 1);

        this._geometry.bind();
        this._geometry.draw();
        this._geometry.unbind();

        this._program.unbind();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void {
        this.invalidate();
    }

    protected onInitialize(context: Context, callback: Invalidate,
        eventProvider: EventProvider): boolean {
        const gl = this._context.gl;

        context.enable(['ANGLE_instanced_arrays']);

        const internalFormatAndType = Wizard.queryInternalTextureFormat(this._context, gl.RGB, Wizard.Precision.byte);
        this._terrain = new Texture2D(this._context);
        this._terrain.initialize(64, 64, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);
        this._terrain.wrap(gl.REPEAT, gl.REPEAT);
        this._terrain.filter(gl.LINEAR, gl.LINEAR);
        this._terrain.fetch('/demos/data/cubescape-terrain.png');

        this._patches = new Texture2D(this._context);
        this._patches.initialize(64, 16, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);
        this._patches.wrap(gl.REPEAT, gl.REPEAT);
        this._patches.filter(gl.NEAREST, gl.NEAREST);
        this._patches.fetch('/demos/data/cubescape-patches.png');

        // init cube geometry
        this._geometry = new CubeGeometry(this._context, 'cubes'); // TODO not 16 every time
        this._geometry.initialize();

        // init program
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'cube.vert');
        vert.initialize(require('./cube.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'cube.frag');
        frag.initialize(require('./cube.frag'));

        this._program = new Program(this._context);
        this._program.initialize([vert, frag], false);
        this._program.attribute('a_vertex', this._geometry.vertexLocation);
        this._program.attribute('a_instances', this._geometry.instanceLocation);
        this._program.link();

        this._uViewProjection = this._program.uniform('u_viewProjection');

        // init camera
        if (this._camera === undefined) {
            this._camera = new Camera();
            this._camera.eye = _gEye;
            this._camera.center = _gCenter;
            this._camera.up = _gUp;
            this._camera.near = 0.1;
            this._camera.far = 4.0;
        }

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        return true;
    }

    protected onUninitialize(): void {
        this._geometry.uninitialize();

        this._patches.uninitialize();
        this._terrain.uninitialize();

        this._defaultFBO.uninitialize();
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
        this._altered.alter('clearColor');
    }

}


export class CubescapeDemo extends Demo {

    private _canvas: Canvas;
    private _renderer: CubescapeRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: true });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new CubescapeRenderer();
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

    get renderer(): CubescapeRenderer {
        return this._renderer;
    }

}
