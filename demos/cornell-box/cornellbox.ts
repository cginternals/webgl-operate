
/* spellchecker: disable */

import { auxiliaries, vec3 } from 'webgl-operate';

import {
    AccumulatePass,
    AntiAliasingKernel,
    BlitPass,
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
    Renderbuffer,
    Renderer,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Demo } from '../demo';

import { colors, indices, vertices } from './cornellboxdata';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file


// camera constants
const _gEye = vec3.fromValues(
    +0.000000, +0.005102, -3.861230);
const _gCenter = vec3.fromValues(
    +0.000000, +0.000000, +0.000000);
const _gUp = vec3.fromValues(
    +0.000000, +1.000000, +0.000000);

// corners of axis aligned light cuboid
const light0 = vec3.fromValues(-0.233813, +1 - 2e-2, -0.188126);
const light1 = vec3.fromValues(+0.233813, +1 - 2e-1, +0.187411);


export class CornellBoxRenderer extends Renderer {

    protected _extensions = false;

    // stuff
    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _ndcTriangle: NdcFillingTriangle;

    // program and uniforms
    protected _program: Program;
    protected _uTransform: WebGLUniformLocation;

    protected _uFrame: WebGLUniformLocation;
    protected _uRand: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uViewport: WebGLUniformLocation;

    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;

    // Textures
    protected _hsphereImage: Texture2D;
    protected _lightsImage: Texture2D;

    // blit and accumulate
    protected _accumulate: AccumulatePass;
    protected _blit: BlitPass;

    protected _defaultFBO: DefaultFramebuffer;
    protected _colorRenderTexture: Texture2D;
    protected _depthRenderbuffer: Renderbuffer;
    protected _intermediateFBO: Framebuffer;

    // for webgl1
    protected _verticesImage: Texture2D;
    protected _indicesImage: Texture2D;
    protected _colorsImage: Texture2D;

    protected onUpdate(): boolean {

        // Update camera navigation (process events)
        this._navigation.update();
        return this._altered.any || this._camera.altered;
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

        }

        // resize
        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);
        }

        this._accumulate.update();


        if (this._camera.altered) {
            this._program.bind();

            gl.uniformMatrix4fv(this._uTransform, false, this._camera.viewProjectionInverse);
            gl.uniform3fv(this._uEye, this._camera.eye);
            gl.uniform4f(this._uViewport,
                this._camera.viewport[0],
                this._camera.viewport[1],
                1.0 / this._camera.viewport[0],
                1.0 / this._camera.viewport[1]);
        }

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._intermediateFBO.bind();
        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT, false, false);

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];

        // set uniforms
        this._program.bind();
        gl.uniform1i(this._uFrame, frameNumber);
        gl.uniform1i(this._uRand, Math.floor(Math.random() * 1e6));
        gl.uniform2fv(this._uNdcOffset, ndcOffset);

        this._hsphereImage.bind(gl.TEXTURE0);
        this._lightsImage.bind(gl.TEXTURE1);

        // webgl1
        if (this._context.isWebGL1) {
            this._verticesImage.bind(gl.TEXTURE2);
            this._indicesImage.bind(gl.TEXTURE3);
            this._colorsImage.bind(gl.TEXTURE4);
        }

        // render geometry
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._ndcTriangle.unbind();

        this._intermediateFBO.unbind();

        this._accumulate.frame(frameNumber);
    }

    protected onSwap(): void {
        this._blit.framebuffer = this._accumulate.framebuffer ?
            this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
        this._blit.frame();
    }

    protected onInitialize(context: Context, callback: Invalidate, eventProvider: EventProvider): boolean {
        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        /* Enable required extensions. */

        if (this._extensions === false && this._context.isWebGL1) {
            auxiliaries.assert(this._context.supportsStandardDerivatives,
                `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this._context.standardDerivatives;
            this._extensions = true;
        }

        this._camera = new Camera();
        this._camera.eye = _gEye;
        this._camera.center = _gCenter;
        this._camera.up = _gUp;
        this._camera.near = 0.1;
        this._camera.far = 4.0;

        // Initialize navigation
        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;


        // program
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'cornell.vert');
        vert.initialize(require('./cornell.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'cornell.frag');
        frag.initialize(require(this._context.isWebGL1 ?
            (this._context.supportsTextureFloat ? './cornell1.frag' : './cornell0.frag') :
            './cornell2.frag'));
        this._program = new Program(this._context);
        this._program.initialize([vert, frag], false);

        // attributes
        this._ndcTriangle = new NdcFillingTriangle(this._context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._program.link();

        // uniforms
        this._uTransform = this._program.uniform('u_transform');
        this._uFrame = this._program.uniform('u_frame');
        this._uRand = this._program.uniform('u_rand');
        this._uEye = this._program.uniform('u_eye');
        this._uViewport = this._program.uniform('u_viewport');

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_hsphere'), 0);
        gl.uniform1i(this._program.uniform('u_lights'), 1);
        this._program.unbind();


        this._ndcTriangle.initialize(aVertex);


        // CREATE HEMISPHERE PATH SAMPLES and LIGHT AREA SAMPLES
        this._hsphereImage = new Texture2D(this._context, 'hsphereImage');
        this._lightsImage = new Texture2D(this._context, 'lightsImage');

        const points = this.pointsOnSphere(32 * 32);
        const samplerSize = Math.floor(Math.sqrt(points.length)); // shader expects 32
        const spherePoints = new Float32Array(samplerSize * samplerSize * 3);
        for (let i = 0; i < samplerSize * samplerSize; ++i) {
            spherePoints[3 * i + 0] = points[i][0];
            spherePoints[3 * i + 1] = points[i][1];
            spherePoints[3 * i + 2] = points[i][2];
        }

        // CREATE LIGHT AREA SAMPLES
        const lights = this.pointsInLight(light0, light1, 32 * 32);
        const lights2 = new Float32Array(lights.length * 3);
        let i2 = 0;
        for (const light of lights) {
            lights2[i2++] = light[0];
            lights2[i2++] = light[1];
            lights2[i2++] = light[2];
        }

        // special case for webgl1 and no float support
        if (this._context.isWebGL1 && !this._context.supportsTextureFloat) {
            this._hsphereImage.initialize(32 * 3, 32, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
            this._hsphereImage.data(this.encodeFloatArrayAndScale(spherePoints));
            this._lightsImage.initialize(32 * 3, 32, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
            this._lightsImage.data(this.encodeFloatArrayAndScale(lights2));
        } else {
            const format = Wizard.queryInternalTextureFormat(this._context, gl.RGB, Wizard.Precision.float);
            this._hsphereImage.initialize(samplerSize, samplerSize, format[0], gl.RGB, format[1]);
            this._hsphereImage.data(spherePoints);
            this._lightsImage.initialize(32, 32, format[0], gl.RGB, format[1]);
            this._lightsImage.data(lights2);
        }

        this._hsphereImage.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        this._hsphereImage.filter(gl.NEAREST, gl.NEAREST);
        this._lightsImage.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        this._lightsImage.filter(gl.NEAREST, gl.NEAREST);


        // scene textures for webgl1
        if (this._context.isWebGL1) {
            this._program.bind();
            gl.uniform1i(this._program.uniform('u_vertices'), 2);
            gl.uniform1i(this._program.uniform('u_indices'), 3);
            gl.uniform1i(this._program.uniform('u_colors'), 4);
            this._program.unbind();

            this._verticesImage = new Texture2D(this._context, 'verticesImage');
            this._indicesImage = new Texture2D(this._context, 'indicesImage');
            this._colorsImage = new Texture2D(this._context, 'colorsImage');

            this._indicesImage.initialize(indices.length / 4, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            this._indicesImage.data(indices);

            if (context.supportsTextureFloat) {
                this._verticesImage.initialize(vertices.length / 3, 1, gl.RGB, gl.RGB, gl.FLOAT);
                this._verticesImage.data(vertices);
                this._colorsImage.initialize(colors.length / 3, 1, gl.RGB, gl.RGB, gl.FLOAT);
                this._colorsImage.data(colors);
            } else {
                // no floats => encode float in 3 bytes
                this._verticesImage.initialize(vertices.length / 3 * 3, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
                this._verticesImage.data(this.encodeFloatArrayAndScale(vertices));
                this._colorsImage.initialize(colors.length / 3 * 3, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
                this._colorsImage.data(this.encodeFloatArray(colors));
            }

            this._verticesImage.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
            this._verticesImage.filter(gl.NEAREST, gl.NEAREST);

            this._indicesImage.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
            this._indicesImage.filter(gl.NEAREST, gl.NEAREST);

            this._colorsImage.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
            this._colorsImage.filter(gl.NEAREST, gl.NEAREST);
        }

        this._uNdcOffset = this._program.uniform('u_ndcOffset');

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._colorRenderTexture = new Texture2D(this._context, 'ColorRenderTexture');
        this._depthRenderbuffer = new Renderbuffer(this._context, 'DepthRenderbuffer');
        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');

        this._accumulate = new AccumulatePass(this._context);
        this._accumulate.initialize(this._ndcTriangle);
        this._accumulate.precision = this._framePrecision;
        this._accumulate.texture = this._colorRenderTexture;

        this._blit = new BlitPass(this._context);
        this._blit.initialize(this._ndcTriangle);
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;

        return true;
    }

    protected onUninitialize(): void {
        this._program.uninitialize();
        this._ndcTriangle.uninitialize();

        this._hsphereImage.uninitialize();
        this._lightsImage.uninitialize();

        if (this._context.isWebGL1) {
            this._verticesImage.uninitialize();
            this._indicesImage.uninitialize();
            this._colorsImage.uninitialize();
        }

        this._intermediateFBO.uninitialize();
        this._defaultFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();

        this._blit.uninitialize();
    }


    // https://en.wikipedia.org/wiki/Fisher-Yates_shuffle
    shuffle(deck: Array<vec3>) {
        const randomizedDeck = [];
        const array = deck.slice();
        while (array.length !== 0) {
            const rIndex = Math.floor(array.length * Math.random());
            randomizedDeck.push(array[rIndex]);
            array.splice(rIndex, 1);
        }
        return randomizedDeck;
    }

    pointsInLight(llf: vec3, urb: vec3, minN: number): Array<vec3> {
        const lights = Array<vec3>();

        const min = vec3.min(vec3.create(), llf, urb);
        const max = vec3.max(vec3.create(), llf, urb);
        const size = vec3.subtract(vec3.create(), max, min);

        const r = Math.ceil(Math.sqrt(1.0 * minN));
        const step = vec3.scale(vec3.create(), size, (1.0 - 1e-4) / (r - 1.0)); // the "<=" and floating precision
        for (let x = min[0]; x <= max[0]; x += step[0]) {
            for (let z = min[2]; z <= max[2]; z += step[2]) {
                lights.push(vec3.fromValues(x, auxiliaries.rand(min[1], max[1]), z));
            }
        }
        return this.shuffle(lights);
    }

    pointsOnSphere(numPoints: number): Array<vec3> {
        /* Random directions in tangent space. */
        const donkey = new Array<vec3>(numPoints);
        for (let i = 0; i < donkey.length; ++i) {
            const bound = 1.0 - 1e-4;
            const x = auxiliaries.rand(-bound, bound);
            const z = auxiliaries.rand(-bound, bound);
            const y = Math.sqrt(Math.max(1.0 - x * x - z * z, 1e-4));
            donkey[i] = vec3.normalize(vec3.create(), vec3.fromValues(x, y, z));
        }
        return donkey;
    }

    fract(x: number): number {
        return x > 0 ? x - Math.floor(x) : x - Math.ceil(x);
    }

    encode_float24x1_to_uint8x3(out: vec3, x: number): vec3 {
        out[0] = Math.floor(x * 255.0);
        out[1] = Math.floor(this.fract(x * 255.0) * 255.0);
        out[2] = Math.floor(this.fract(x * 65536.0) * 255.0);
        return out;
    }

    encodeFloatArray(floats: Float32Array): Uint8Array {
        const byteEncodedArray = new Uint8Array(floats.length * 3);
        for (let i = 0; i < floats.length; i++) {
            const encodedVec3 = this.encode_float24x1_to_uint8x3(vec3.create(), floats[i]);
            byteEncodedArray[3 * i + 0] = encodedVec3[0];
            byteEncodedArray[3 * i + 1] = encodedVec3[1];
            byteEncodedArray[3 * i + 2] = encodedVec3[2];
        }
        return byteEncodedArray;
    }

    // scale from [-1..+1] to [0..1] and encode
    encodeFloatArrayAndScale(floats: Float32Array): Uint8Array {
        const byteEncodedArray = new Uint8Array(floats.length * 3);
        for (let i = 0; i < floats.length; i++) {
            const encodedVec3 = this.encode_float24x1_to_uint8x3(vec3.create(), floats[i] * 0.5 + 0.5);
            byteEncodedArray[3 * i + 0] = encodedVec3[0];
            byteEncodedArray[3 * i + 1] = encodedVec3[1];
            byteEncodedArray[3 * i + 2] = encodedVec3[2];
        }
        return byteEncodedArray;
    }

}


export class CornellBoxDemo extends Demo {

    private _canvas: Canvas;
    private _renderer: CornellBoxRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element);
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.float;
        this._canvas.frameScale = [0.3333, 0.3333];
        this._canvas.clearColor.fromHex('d6d8db');
        this._canvas.controller.multiFrameNumber = 1024;

        this._canvas.element.addEventListener('click', () => { this._canvas.controller.update(); });

        this._renderer = new CornellBoxRenderer();
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

    get renderer(): CornellBoxRenderer {
        return this._renderer;
    }

}
