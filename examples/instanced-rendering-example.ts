/* spellchecker: disable */

import { vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EventProvider,
    Framebuffer,
    GLTFLoader,
    GLTFPrimitive,
    GLTFPbrMaterial,
    Invalidate,
    Navigation,
    Program,
    Renderer,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class InstancedRenderer extends Renderer {

    protected _loader: GLTFLoader;
    protected _primitive: GLTFPrimitive;

    protected _navigation: Navigation;

    protected _camera: Camera;

    protected _texture: Texture2D;
    protected _framebuffer: Framebuffer;
    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;

    /**
     * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param eventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate, eventProvider: EventProvider): boolean {

        const gl = this._context.gl;

        this._loader = new GLTFLoader(this._context);

        this._framebuffer = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._framebuffer.initialize();

        const vert = new Shader(context, gl.VERTEX_SHADER, 'instanced.vert');
        vert.initialize(require('./data/instanced.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'instanced.frag');
        frag.initialize(require('./data/instanced.frag'));

        this._program = new Program(context, 'InstancedProgram');
        this._program.initialize([vert, frag], true);
        this._program.link();
        this._program.bind();

        this._uViewProjection = this._program.uniform('u_viewProjection');

        /* Create and configure camera. */

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.125, 0.25, 0.4);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 1.5);
        this._camera.near = 0.01;
        this._camera.far = 8.0;

        /* Create and configure navigation */

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        this.loadAsset();

        // gl.disable(gl.CULL_FACE);

        return true;
    }

    /**
     * Uninitializes Buffers, Textures, and Program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._loader.uninitialize();
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
        this._altered.alter('clearColor');
        this._altered.alter('frameSize');
        this._altered.alter('multiFrameNumber');
    }

    /**
     * This is invoked in order to check if rendering of a frame is required by means of implementation specific
     * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
     * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
     * changed or the renderer was invalidated @see{@link invalidate}.
     * Updates the navigaten and the AntiAliasingKernel.
     * @returns whether to redraw
     */
    protected onUpdate(): boolean {
        if (this._altered.frameSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }
        if (this._altered.clearColor) {
            // this._forwardPass.clearColor = this._clearColor;
        }

        this._navigation.update();

        return this._altered.any || this._camera.altered;
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        const gl = this._context.gl;

        if (this._altered.canvasSize) {
            this._program.bind();
            gl.uniform2f(this._program.uniform('u_frameSize'), this._frameSize[0], this._frameSize[1]);
        }
        if (this._altered.clearColor) {
            gl.clearColor(this._clearColor[0], this._clearColor[1], this._clearColor[2], this._clearColor[3]);
            gl.uniform4f(this._program.uniform('u_clearColor'),
                this._clearColor[0], this._clearColor[1], this._clearColor[2], this._clearColor[3]);
        }

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {
        if (this.isLoading) {
            return;
        }

        const indexBufferInformation = this._primitive.indexBufferInformation;
        const positionBufferInformation = this._primitive.getVertexBufferInformationFromAttribute('POSITION')!;
        const texCoordBufferInformation = this._primitive.getVertexBufferInformationFromAttribute('TEXCOORD_0')!;
        const material = this._primitive.material as GLTFPbrMaterial;
        const texture = material.baseColorTexture!;

        const gl = this._context.gl;
        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1])

        this._framebuffer.bind();
        this._program.bind();
        texture.bind(gl.TEXTURE0);

        // Setup positions
        gl.enableVertexAttribArray(0);
        positionBufferInformation.buffer.attribEnable(
            0,
            positionBufferInformation.size,
            positionBufferInformation.type,
            positionBufferInformation.normalized,
            positionBufferInformation.stride,
            positionBufferInformation.offset,
            true, true);

        // Setup texture coordinates
        gl.enableVertexAttribArray(1);
        texCoordBufferInformation.buffer.attribEnable(
            1,
            texCoordBufferInformation.size,
            texCoordBufferInformation.type,
            texCoordBufferInformation.normalized,
            texCoordBufferInformation.stride,
            texCoordBufferInformation.offset,
            true, true);

        gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);

        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const instanceCount = 32 ** 3;
        if (indexBufferInformation === undefined) {
            gl.drawArrays(
                this._primitive.drawMode,
                0,
                positionBufferInformation.numVertices,
                instanceCount);
        } else {
            indexBufferInformation.buffer.bind();

            gl.drawElementsInstanced(
                this._primitive.drawMode,
                indexBufferInformation.numIndices,
                indexBufferInformation.type,
                indexBufferInformation.offset,
                instanceCount);
        }
    }

    protected onSwap(): void {
    }

    /**
     * Load asset from URI specified by the HTML select
     */
    protected loadAsset(): void {
        const uri = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF/BoxTextured.gltf';
        this._loader.uninitialize();
        this._loader.loadAsset(uri)
            .then(() => {
                this.finishLoading();
                this._primitive = this._loader.meshes[0].primitives[0];
                this.invalidate(true);
            });
    }
}


export class InstancedRenderingExample extends Example {

    private _canvas: Canvas;
    private _renderer: InstancedRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });

        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new InstancedRenderer();
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

    get renderer(): InstancedRenderer {
        return this._renderer;
    }
}
