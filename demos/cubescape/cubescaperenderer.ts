
import { vec3 } from 'webgl-operate';

import {
    Camera,
    Context,
    DefaultFramebuffer,
    EventHandler,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';
//     BlitPass, Camera, Context, DefaultFramebuffer, EventHandler, Framebuffer, Invalidate,
//     MouseEventProvider, Navigation, Program, Renderbuffer, Renderer, Shader, Texture2, Wizard,
// } from 'webgl-operate';

import { Cube } from './cube';


// camera constants
const _gEye = vec3.fromValues(1.0, -0.5, -1.0);
const _gCenter = vec3.fromValues(0.0, -1.0, 0.0);
const _gUp = vec3.fromValues(0.0, 1.0, 0.0);

export class CubescapeRenderer extends Renderer {

    // FBO and Blit
    protected _defaultFBO: DefaultFramebuffer;

    // camera
    protected _camera: Camera;
    protected _navigation: Navigation;

    //     // cubes
    protected _cube: Cube;
    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _aVertex: GLuint;
    protected _numCubes = 128;

    // skyBox and skyTriangle use the same cubeMap
    protected _patches: Texture2D;
    protected _terrain: Texture2D;

    protected _eventHandler: EventHandler;


    protected onUpdate(): boolean {

        this._navigation.update();
        this._eventHandler.update();

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

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        // bind FBO
        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniform1i(this._program.uniform('u_numcubes'), this._numCubes);
        gl.uniform1f(this._program.uniform('u_time'), window.performance.now() * 0.0002);
        this._terrain.bind(gl.TEXTURE0);
        this._patches.bind(gl.TEXTURE1);
        gl.uniform1i(this._program.uniform('u_terrain'), 0);
        gl.uniform1i(this._program.uniform('u_patches'), 1);

        this._cube.bind();
        this._cube.numCubes = this._numCubes;
        this._cube.draw();
        this._cube.unbind();

        this._program.unbind();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void {
        this.invalidate();
    }

    protected onInitialize(context: Context, callback: Invalidate,
        mouseEventProvider: MouseEventProvider): boolean {
        const gl = this._context.gl;

        this._eventHandler = new EventHandler(callback, mouseEventProvider, undefined);
        // this._eventHandler.pushMouseWheelHandler((latests: Array<WheelEvent>, previous: Array<WheelEvent>) => {
        //     this._numCubes = this._numCubes + ((latests[latests.length - 1].wheelDeltaY > 0) ? +1 : -1);
        //     this._numCubes = Math.min(1024, Math.max(8, this._numCubes));
        // });

        // load images
        const internalFormatAndType = Wizard.queryInternalTextureFormat(this._context, gl.RGB, Wizard.Precision.byte);
        this._terrain = new Texture2D(this._context);
        this._terrain.initialize(64, 64, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);
        this._terrain.wrap(gl.REPEAT, gl.REPEAT);
        this._terrain.filter(gl.LINEAR, gl.LINEAR);
        this._terrain.load('demos/data/cubescape-terrain.png');

        this._patches = new Texture2D(this._context);
        this._patches.initialize(64, 16, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);
        this._patches.wrap(gl.REPEAT, gl.REPEAT);
        this._patches.filter(gl.NEAREST, gl.NEAREST);
        this._patches.load('demos/data/cubescape-patches.png');

        // init program
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'cube.vert');
        vert.initialize(require('./cube.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'cube.frag');
        frag.initialize(require('./cube.frag'));
        this._program = new Program(this._context);
        this._program.initialize([vert, frag]);
        this._aVertex = this._program.attribute('a_vertex', 0);
        this._uViewProjection = this._program.uniform('u_viewProjection');

        // init cube geometry
        this._cube = new Cube(this._context, 'cubes'); // TODO not 16 every time
        this._cube.initialize(this._aVertex);

        // init camera
        this._camera = new Camera();
        this._camera.eye = _gEye;
        this._camera.center = _gCenter;
        this._camera.up = _gUp;
        this._camera.near = 0.1;
        this._camera.far = 4.0;

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        return true;
    }

    protected onUninitialize(): void {
        this._cube.uninitialize();

        this._patches.uninitialize();
        this._terrain.uninitialize();

        this._defaultFBO.uninitialize();
    }

}

