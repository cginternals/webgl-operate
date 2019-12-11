
/* spellchecker: disable */

import { /*mat4,*/ vec3, vec4 } from 'gl-matrix';

import {
    auxiliaries,
} from 'webgl-operate';

import {
    Buffer,
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    Shader,
    Wizard,
} from 'webgl-operate';

import { Demo } from '../demo';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class PointCloudRenderer extends Renderer {

    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;

    protected static readonly BENCHMARK_CONFIG = {
        rotations: 1,
        frames: 100,
        warmup: 100,
        values: [0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 2e6, 4e6, 6e6, 8e6, 10e6, 12e6, 14e6, 16e6],
    };

    protected _benchmark = false;
    protected _results: Array<[number, number]> = new Array<[number, number]>();
    protected _frames: number;


    protected _camera: Camera;
    protected _navigation: Navigation;


    protected _particleVBO: Buffer;
    protected _instancesVBO: Buffer;

    protected readonly _uvLocation: GLuint = 0;
    protected readonly _positionLocation: GLuint = 1;


    // protected _triangles = 6;

    protected _numPointsAllocated: number;
    protected _numPointsToRender: number;


    protected _program: Program;

    protected _size: GLfloat = PointCloudRenderer.DEFAULT_POINT_SIZE;
    protected _sizeAltered = true;

    protected _uView: WebGLUniformLocation;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uLight: WebGLUniformLocation;

    protected _defaultFBO: DefaultFramebuffer;


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
        const gl = context.gl;
        const gl2facade = context.gl2facade;

        context.enable(['ANGLE_instanced_arrays']);

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();


        const floatSize: number = context.byteSizeOfFormat(gl.R32F);


        const particle = new Float32Array([-1.0, -1.0, +1.0, -1.0, +1.0, +1.0, -1.0, +1.0]);

        // const hypotenuse = Math.sqrt(1 + Math.pow(Math.tan(Math.PI / this._triangles), 2.0));

        // const particle = new Float32Array(2 * (2 + this._triangles));
        // particle[0] = 0.0;
        // particle[1] = 0.0;
        // for (let i = 0; i <= this._triangles; ++i) {
        //     const alpha = i * (2.0 * Math.PI / this._triangles);
        //     particle[i * 2 + 2] = Math.cos(alpha) * hypotenuse;
        //     particle[i * 2 + 3] = Math.sin(alpha) * hypotenuse;
        // }

        this._particleVBO = new Buffer(context, 'particleVBO');
        this._particleVBO.initialize(gl.ARRAY_BUFFER);
        this._particleVBO.attribEnable(this._uvLocation, 2, gl.FLOAT, false
            , 2 * floatSize, 0, true, false);
        gl2facade.vertexAttribDivisor(this._uvLocation, 0);
        this._particleVBO.data(particle, gl.STATIC_DRAW);


        this._numPointsAllocated = 1e6;
        this._numPointsToRender = 1e5;


        const positions = new Float32Array(3 * this._numPointsAllocated);
        positions.forEach((value, index, array) => array[index] = Math.random());

        this._instancesVBO = new Buffer(context, 'instancesVBO');
        this._instancesVBO.initialize(gl.ARRAY_BUFFER);
        this._instancesVBO.attribEnable(this._positionLocation, 3, gl.FLOAT, false
            , 3 * floatSize, 0, true, false);
        gl2facade.vertexAttribDivisor(this._positionLocation, 1);
        this._instancesVBO.data(positions, gl.DYNAMIC_DRAW);


        const vert = new Shader(context, gl.VERTEX_SHADER, 'particle.vert');
        vert.initialize(require('./particle.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'particle.frag');
        frag.initialize(require('./particle.frag'));


        this._program = new Program(context, 'ParticleProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_uv', this._uvLocation);
        this._program.attribute('a_position', this._positionLocation);
        this._program.link();
        this._program.bind();


        this._uView = this._program.uniform('u_view');
        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uLight = this._program.uniform('u_light');


        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 5.0);

        this._camera.near = 0.1;
        this._camera.far = 5.0 + Math.sqrt(32.0); // 1² + 1² -> range in that particles are generated ...

        gl.uniform2f(this._program.uniform('u_nearFar'), this._camera.near, this._camera.far);


        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;


        // prepare draw binding

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        // enable alpha to coverage and appropriate blending (if context was initialized with antialiasing enabled)
        if (context.antialias) {

            gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
            gl.sampleCoverage(1.0, false);
        }

        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);


        this._particleVBO.bind();
        this._instancesVBO.bind();

        this._program.bind();

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._particleVBO.attribDisable(this._uvLocation);
        this._particleVBO.uninitialize();

        this._instancesVBO.attribDisable(this._positionLocation);
        this._instancesVBO.uninitialize();

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
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
        this._camera.altered = false;


        const gl = this._context.gl;

        if (this._sizeAltered) {
            gl.uniform1f(this._program.uniform('u_size'), this._size);
            this._sizeAltered = false;
        }
    }

    protected onFrame(): void {

        const gl = this._context.gl;
        const gl2facade = this.context.gl2facade;

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.uniformMatrix4fv(this._uView, false, this._camera.view);
        gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);

        const light = vec4.fromValues(-2.0, 2.0, 4.0, 0.0);
        vec4.normalize(light, vec4.transformMat4(light, light, this._camera.view));

        gl.uniform3f(this._uLight, light[0], light[1], light[2]);

        gl2facade.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this._numPointsToRender);
        // gl2facade.drawArraysInstanced(gl.POINTS, 0, 1, this._numPointsToRender);
        // gl2facade.drawArraysInstanced(gl.TRIANGLE_FAN, 0, this._triangles + 2, this._numPointsToRender);

    }

    protected onSwap(): void {

        if (this._benchmark === false) {
            return;
        }
        ++this._frames;

        const config = PointCloudRenderer.BENCHMARK_CONFIG;

        const frames: number = this._frames - config.warmup;
        const run: number = frames >= 0 ? Math.floor(frames / config.frames) : -1;


        const phi = Math.PI * 2.0 * config.rotations / config.frames * (frames % config.frames);
        this._camera.eye = vec3.fromValues(4.0 * Math.sin(phi), 0.0, 4.0 * Math.cos(phi));



        if (frames === 1 - config.warmup) {
            console.log('---- benchmark warmup ------');
        }
        if (frames === 0) {
            console.log('---- benchmark started -----');
        }

        if (frames % config.frames === 0 && run > 0) {
            this._results[run - 1][1] = (performance.now() - this._results[run - 1][1]) / config.frames;
            console.log(' --  run = ' + run + ', [value, fps] = ' + this._results[run - 1]);
        }

        if (frames % config.frames === 0 && run >= 0 && run < config.values.length) {
            this._results[run][1] = performance.now();
            this._numPointsToRender = config.values[run];
        }

        if (run >= config.values.length) {

            this._benchmark = false;
            console.log('---- benchmark stopped -----');
            console.log(JSON.stringify(this._results));

        } else {
            this.invalidate(true);
        }

    }

    protected benchmark(): void {

        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.eye = vec3.fromValues(4.0 * Math.sin(0), 0.0, 4.0 * Math.cos(0));

        this._benchmark = true;
        this._frames = 0;

        if (this._results.length === 0) {

            const config = PointCloudRenderer.BENCHMARK_CONFIG;

            this._results.length = config.values.length;
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < config.values.length; ++i) {
                this._results[i] = [config.values[i], 0.0];
            }
        }

        this._numPointsToRender = this._numPointsAllocated;
        this.invalidate(true);
    }

    set size(size: GLfloat) {
        if (this._size === size) {
            return;
        }
        this._size = Math.max(0.0, Math.min(1.0, size));
        this._sizeAltered = true;

        this.invalidate(true);
    }

    get size(): GLfloat {
        return this._size;
    }

}


export class PointCloudDemo extends Demo {

    private _canvas: Canvas;
    private _renderer: PointCloudRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        const alpha2coverage = auxiliaries.GETparameter('alpha2coverage');

        this._canvas = new Canvas(element, {
            antialias: alpha2coverage === undefined ? false : JSON.parse(alpha2coverage!),
        });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new PointCloudRenderer();
        this._canvas.renderer = this._renderer;


        const input = document.getElementById('input-file')! as HTMLInputElement;
        // const label = document.getElementById('label-file')! as HTMLLabelElement;
        input.addEventListener('change', () => {
            const list = input.files!;
            const files = new Array<[string, File]>(list.length);

            for (let i = 0; i < list.length; ++i) {
                files[i] = [list.item(i)!.name, list.item(i)!];
            }
            for (let i = 0; i < list.length; ++i) {
                const reader = new FileReader();
                reader.readAsText(files[i][1]);

                reader.onload = (event) => {
                    let lines = (event.target!.result as string).split(/\r\n|\n/);
                    lines = lines.filter((value: string) => value.trim() !== '');
                    // const numCoordinates = Number.parseInt(lines[0]);

                    // const coords = new Float32Array(numCoordinates * 3);
                    console.log(lines);
                };

                reader.onerror = (event) => console.log(event.target!.error);
            }
            console.log(files.sort());
        });

        return true;
    }

    uninitialize(): void {
        this._canvas.dispose();
        (this._renderer as Renderer).uninitialize();
    }

    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): PointCloudRenderer {
        return this._renderer;
    }

}
