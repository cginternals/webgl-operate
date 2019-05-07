
import { mat4, vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    ForwardSceneRenderPass,
    Framebuffer,
    GLTFLoader,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Demo } from '../demo';

// tslint:disable:max-classes-per-file

/**
 * @todo comment
 */
export class GltfRenderer extends Renderer {

    //static assetURI = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF/BoxTextured.gltf';
    //static assetURI = '/Users/philipp/Google Drive/Uni/Masterarbeit/assets/adamHead/adamHead.gltf';
    //static assetURI = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SciFiHelmet/glTF/SciFiHelmet.gltf';
    static assetURI = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Sponza/glTF/Sponza.gltf';

    protected _loader: GLTFLoader;

    protected _navigation: Navigation;

    protected _forwardPass: ForwardSceneRenderPass;

    protected _camera: Camera;

    protected _texture: Texture2D;
    protected _framebuffer: Framebuffer;
    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;

    /**
     * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param mouseEventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate,
        mouseEventProvider: MouseEventProvider,
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {

        const gl = this._context.gl;

        this._loader = new GLTFLoader(this._context);

        this._framebuffer = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._framebuffer.initialize();

        this._program = this._loader.pbrProgram;

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uModel = this._program.uniform('u_model');

        /* Create and configure camera. */

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 3.0, 3.0);
        this._camera.near = 0.1;
        this._camera.far = 32.0;

        /* Create and configure navigation */

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        /* Create and configure forward pass. */

        this._forwardPass = new ForwardSceneRenderPass(context);
        this._forwardPass.initialize();

        this._forwardPass.camera = this._camera;
        this._forwardPass.target = this._framebuffer;

        this._forwardPass.program = this._program;
        this._forwardPass.updateModelTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, matrix);
        };
        this._forwardPass.updateViewProjectionTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, matrix);
        };

        this._loader.loadAsset(GltfRenderer.assetURI)
            .then(() => {
                this._forwardPass.scene = this._loader.defaultScene;
                this._invalidate(true);
            });

        return true;
    }

    /**
     * Uninitializes Buffers, Textures, and Program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        // TODO: make sure that all meshes and programs inside of the scene get cleaned

        // this._mesh.uninitialize();
        // this._meshProgram.uninitialize();
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
            this._forwardPass.clearColor = this._clearColor;
        }

        this._navigation.update();
        this._forwardPass.update();

        return this._altered.any || this._camera.altered;
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        this._forwardPass.prepare();

        this._altered.reset();
        this._camera.altered = false;
    }

    /**
     * @todo comment
     * @param frameNumber - for intermediate frames in accumulation rendering.
     */
    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        // gl.enable(gl.CULL_FACE);
        // gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._forwardPass.frame();

        // gl.cullFace(gl.BACK);
        // gl.disable(gl.CULL_FACE);
    }

    /**
     * @todo comment ...
     */
    protected onSwap(): void {
    }
}

export class GltfDemo extends Demo {

    private _canvas: Canvas;
    private _renderer: GltfRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: true });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new GltfRenderer();
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

    get renderer(): GltfRenderer {
        return this._renderer;
    }

}
