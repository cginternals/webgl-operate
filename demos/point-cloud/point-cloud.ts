
/* spellchecker: disable */

import { mat4, quat, vec3, vec4 } from 'gl-matrix';

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

// import { Benchmark } from './benchmark';
import { importPointsFromCSV } from './csv-import';


/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class PointCloudRenderer extends Renderer {

    protected static readonly DEFAULT_POINT_SIZE = 1.0 / 128.0;

    // protected _benchmark: Benchmark;

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _model: mat4;

    protected _particleVBO: Buffer;
    protected _instancesVBO: Buffer;

    protected readonly _uvLocation: GLuint = 0;
    protected readonly _positionLocation: GLuint = 1;

    protected _data: Array<Float32Array> = new Array<Float32Array>(0);
    protected _push = false;
    protected _drawIndex = -1;
    protected _drawRanges: Array<[GLuint, GLuint]>;

    // protected _triangles = 6;

    protected _program: Program;

    protected _pointSize: GLfloat = PointCloudRenderer.DEFAULT_POINT_SIZE;
    protected _billboards: boolean = true;
    protected _alpha2Coverage: boolean = false;
    protected _alphaBlending: boolean = false;
    protected _phongShading: boolean = true;

    protected _renderingConfigAltered = true;

    protected _uModel: WebGLUniformLocation;
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

        // Generate triangle fan geometry of n triangles:

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


        this._instancesVBO = new Buffer(context, 'instancesVBO');
        this._instancesVBO.initialize(gl.ARRAY_BUFFER);
        this._instancesVBO.attribEnable(this._positionLocation, 3, gl.FLOAT, false
            , 3 * floatSize, 0, true, false);
        gl2facade.vertexAttribDivisor(this._positionLocation, 1);
        // this._instancesVBO.data(this._data[i], gl.DYNAMIC_DRAW);


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

        this._uModel = this._program.uniform('u_model');
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

        this._model = mat4.fromRotationTranslationScale(mat4.create(), quat.create()
            , [0.0, 0.0, 0.0], [2.0, 2.0, 2.0]);

        const positions = new Float32Array(3 * 4e6);
        positions.forEach((value, index, array) => array[index] = Math.random() * 5.0 - 2.5);

        this.data = new Array(positions);


        // prepare draw binding

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._particleVBO.bind();
        this._instancesVBO.bind();

        this._program.bind();


        this._alphaBlending = true;
        this._alpha2Coverage = context.antialias;

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

        // return this._altered.any || this._camera.altered || this._renderingConfigAltered;
        return true;

    }
    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        const gl = this._context.gl;

        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
            this._camera.viewport = this._canvasSize;

            gl.uniform2f(this._program.uniform('u_size'), this._pointSize, this._frameSize[0]);
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
        this._camera.altered = false;

        // Create full float32 array containing all provided data set.
        if (this._push) {
            const range = this._drawRanges[this._data.length - 1];
            const buffer = new Float32Array(range[0] + range[1]);
            for (let i = 0; i < this._data.length; ++i) {
                buffer.set(this._data[i], this._drawRanges[i][0]);
            }
            this._instancesVBO.data(buffer, gl.STATIC_DRAW);

            this._push = false;
        }


        if (!this._renderingConfigAltered) {
            return;
        }

        gl.uniform2f(this._program.uniform('u_size'), this._pointSize, this._frameSize[0]);
        gl.uniform2i(this._program.uniform('u_mode'), !this._billboards, this._phongShading);

        // enable alpha to coverage and appropriate blending (if context was initialized with antialiasing enabled)

        if (this._alpha2Coverage) {
            gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
            gl.sampleCoverage(1.0, false);
        } else {
            gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        }

        if (this._alphaBlending) {
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.disable(gl.BLEND);
        }

        this._renderingConfigAltered = false;
    }

    protected onFrame(): void {

        const gl = this._context.gl;
        const gl2facade = this.context.gl2facade;

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.uniformMatrix4fv(this._uModel, false, this._model);
        gl.uniformMatrix4fv(this._uView, false, this._camera.view);
        gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);

        const light = vec4.fromValues(-2.0, 2.0, 4.0, 0.0);
        vec4.normalize(light, vec4.transformMat4(light, light, this._camera.view));

        gl.uniform3f(this._uLight, light[0], light[1], light[2]);

        if (this._drawIndex < 0) {
            return;
        }

        const first = this._drawRanges[this._drawIndex][0];
        const instanceCount = this._drawRanges[this._drawIndex][1] / 3;

        this._instancesVBO.attribEnable(this._positionLocation, 3, gl.FLOAT, false
            , 3 * 4, first * 4, true, false);

        if (this._billboards) {
            gl2facade.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, instanceCount);
        } else {
            gl2facade.drawArraysInstanced(gl.POINTS, 0, 1, instanceCount);
        }
    }

    protected onSwap(): void {

        // if (this._benchmark && this._benchmark.running) {
        //     this._benchmark.frame();
        //     this.invalidate(true);
        // }


        if (this._data.length > 1) {
            this.draw = (this._drawIndex + 1) % this._data.length;
            this.invalidate(true);
        }
    }

    set data(data: Array<Float32Array>) {

        this._data = data;
        this._drawRanges = new Array<[number, number]>(data.length);

        let index = 0;
        for (let i = 0; i < data.length; ++i) {
            this._drawRanges[i] = [index, data[i].length];
            index += data[i].length;
        }
        this.draw = 0;
        this._push = true;
    }

    set draw(index: number) {
        if (this._drawIndex === index) {
            return;
        }
        this._drawIndex = index;
    }

    // benchmark(): void {

    //     if (!this._benchmark) {
    //         this._benchmark = new Benchmark();
    //     }

    //     const values = [0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 2e6, 4e6, 6e6, 8e6, 10e6, 12e6, 14e6, 16e6];

    //     const numPointsRendered = this._numPointsToRender;

    //     this._benchmark.initialize(values.length, 1000, 100,

    //         (frame: number, framesForWarmup: number, framesPerCycle: number, cycle: number): void => {
    //             // called per frame benchmarked ...

    //             const phi = Math.PI * 2.0 * 1.0 / (cycle < 0 ? framesForWarmup : framesPerCycle) * frame;

    //             this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
    //             this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
    //             this._camera.eye = vec3.fromValues(4.0 * Math.sin(phi), 0.0, 4.0 * Math.cos(phi));

    //             if (cycle < 0) { // warmup
    //                 this._numPointsToRender = 1e6;
    //             } else {
    //                 this._numPointsToRender = values[cycle];
    //             }
    //         },

    //         (cycles: number, framesForWarmup: number, framesPerCycle: number, results: Array<number>): void => {

    //             console.log(`BENCHMARK CONFIG`);
    //             console.log(`frameSize: ${this._frameSize}, pointSize: ${this._pointSize}`);
    //             console.log(`alpha2Coverage: ${this._alpha2Coverage}, alphaBlending ${this._alphaBlending}, billboards: ${this._billboards}, phongShading: ${this._phongShading}`);
    //             console.log(`#cycles:  ${cycles}, #framesForWarmup: ${framesForWarmup}, #framesPerCycle: ${framesPerCycle}`);
    //             console.log(`values: ${JSON.stringify(values)}`);
    //             console.log(`BENCHMARK RESULTS`);
    //             console.log(JSON.stringify(results));

    //             this._numPointsToRender = numPointsRendered;
    //         });
    //     this.invalidate(true);
    // }

    set model(model: mat4) {
        this._model = model;
        this.invalidate(true);
    }

    set pointSize(size: GLfloat) {
        if (this._pointSize === size) {
            return;
        }
        this._pointSize = Math.max(0.0, Math.min(128.0, size));
        this._renderingConfigAltered = true;

        this.invalidate();
    }

    get pointSize(): GLfloat {
        return this._pointSize;
    }


    set alpha2Coverage(value: boolean) {
        if (this._alpha2Coverage === value) {
            return;
        }
        this._alpha2Coverage = value;
        this._renderingConfigAltered = true;

        this.invalidate();
    }

    get alpha2Coverage(): boolean {
        return this._alpha2Coverage;
    }


    set alphaBlending(value: boolean) {
        if (this._alphaBlending === value) {
            return;
        }
        this._alphaBlending = value;
        this._renderingConfigAltered = true;

        this.invalidate();
    }

    get alphaBlending(): boolean {
        return this._alphaBlending;
    }


    set billboards(value: boolean) {
        if (this._billboards === value) {
            return;
        }
        this._billboards = value;
        this._renderingConfigAltered = true;

        this.invalidate();
    }

    get billboards(): boolean {
        return this._billboards;
    }


    set phongShading(value: boolean) {
        if (this._phongShading === value) {
            return;
        }
        this._phongShading = value;
        this._renderingConfigAltered = true;

        this.invalidate();
    }

    get phongShading(): boolean {
        return this._phongShading;
    }

}


export class PointCloudDemo extends Demo {

    private _canvas: Canvas;
    private _renderer: PointCloudRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        const aa = auxiliaries.GETparameter('antialias');

        this._canvas = new Canvas(element, {
            antialias: aa === undefined ? true : JSON.parse(aa!),
        });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new PointCloudRenderer();
        this._canvas.renderer = this._renderer;


        const input = document.getElementById('input-file')! as HTMLInputElement;
        // const label = document.getElementById('label-file')! as HTMLLabelElement;
        input.addEventListener('change', () => {
            const progress = document.getElementById('progress-file')! as HTMLProgressElement;
            importPointsFromCSV(input.files!, progress).then(result => this._renderer.data = result);
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
