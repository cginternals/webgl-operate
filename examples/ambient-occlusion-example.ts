/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import { auxiliaries } from 'webgl-operate';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EventProvider,
    ForwardSceneRenderPass,
    Framebuffer,
    Geometry,
    GLTFLoader,
    GLTFPbrMaterial,
    Invalidate,
    Material,
    Navigation,
    NdcFillingTriangle,
    Program,
    Renderer,
    Renderbuffer,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class AmbientOcclusionRenderer extends Renderer {

    protected _loader: GLTFLoader;

    /* Shared Across Passes */

    protected _ndcGeometry: NdcFillingTriangle;

    /* Scene Pass */
    protected _navigation: Navigation;
    protected _camera: Camera;
    protected _forwardPass: ForwardSceneRenderPass;

    protected _sceneColor: Texture2D;
    protected _sceneNormal: Texture2D;
    protected _sceneLinearDepth: Texture2D;
    protected _sceneDepth: Renderbuffer;

    protected _sceneProgram: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uNormalLocation: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    /* // Scene Pass */

    protected _sceneFbo: Framebuffer;

    /* Ambient Occlusion Pass */
    protected _aoNoisyMap: Texture2D;

    protected _aoProgram: Program;

    protected _uDepthTextureLocation: WebGLUniformLocation;
    /* // Ambient Occlusion Pass */

    protected _aoFbo: Framebuffer;

    /* Blur Pass */
    protected _aoMap: Texture2D;

    protected _blurProgram: Program;

    protected _uKernelSize: WebGLUniformLocation;
    protected _uaoMapLocation: WebGLUniformLocation;
    /* // Blur Pass */

    protected _blurredAOFbo: Framebuffer;

    /* Composition Pass */
    protected _compositionProgram: Program;

    protected _uColorLocation: WebGLUniformLocation;
    protected _uDepthLocation: WebGLUniformLocation;
    protected _uAOMapLocation: WebGLUniformLocation;
    /* // Composition Pass */

    protected _outputFbo: DefaultFramebuffer;

    /**
     * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param eventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate, eventProvider: EventProvider): boolean {

        const gl = this._context.gl;

        this._context.enable(['OES_standard_derivatives', 'WEBGL_color_buffer_float',
            'OES_texture_float', 'OES_texture_float_linear']);

        this._loader = new GLTFLoader(this._context);

        /* Initialize Shared Geometry for Postprocessing Passes */

        this._ndcGeometry = new NdcFillingTriangle(this._context);

        /* Create and configure camera. */

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 1.0, 2.0);
        this._camera.near = 0.5;
        this._camera.far = 4.0;

        /* Create and configure navigation */

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        /* Initialize FBOs */

        this._sceneColor = new Texture2D(this._context);
        this._sceneColor.initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
        this._sceneColor.filter(gl.LINEAR, gl.LINEAR);

        this._sceneNormal = new Texture2D(this._context);
        this._sceneNormal.initialize(1, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this._sceneNormal.filter(gl.LINEAR, gl.LINEAR);

        this._sceneLinearDepth = new Texture2D(this._context);
        this._sceneLinearDepth.initialize(1, 1, gl.R32F, gl.RED, gl.FLOAT);
        this._sceneLinearDepth.filter(gl.LINEAR, gl.LINEAR);

        this._sceneDepth = new Renderbuffer(this._context, 'Scene_Depth');
        this._sceneDepth.initialize(1, 1, gl.DEPTH_COMPONENT16);

        this._sceneFbo = new Framebuffer(this._context, 'Scene_FBO');
        this._sceneFbo.initialize([
            [gl.COLOR_ATTACHMENT0, this._sceneColor],
            [gl.COLOR_ATTACHMENT0 + 1, this._sceneNormal],
            [gl.COLOR_ATTACHMENT0 + 2, this._sceneLinearDepth],
            [gl.DEPTH_ATTACHMENT, this._sceneDepth]
        ]);
        this._sceneFbo.clearColor([0.0, 0.0, 0.0, 0.0], gl.COLOR_ATTACHMENT0);
        this._sceneFbo.clearColor([0.5, 0.5, 0.5, 0.0], gl.COLOR_ATTACHMENT0 + 1);
        this._sceneFbo.clearColor([0.0, 0.0, 0.0, 0.0], gl.COLOR_ATTACHMENT0 + 2);

        this._aoNoisyMap = new Texture2D(this._context);
        this._aoNoisyMap.initialize(1, 1, gl.R32F, gl.RED, gl.FLOAT);
        this._aoNoisyMap.filter(gl.LINEAR, gl.LINEAR);

        this._aoFbo = new Framebuffer(this._context, 'AO_FBO');
        this._aoFbo.initialize([
            [gl.COLOR_ATTACHMENT0, this._aoNoisyMap]
        ]);

        this._aoMap = new Texture2D(this._context);
        this._aoMap.initialize(1, 1, gl.R32F, gl.RED, gl.FLOAT);
        this._aoMap.filter(gl.LINEAR, gl.LINEAR);

        this._blurredAOFbo = new Framebuffer(this._context, 'BlurredAO_FBO');
        this._blurredAOFbo.initialize([
            [gl.COLOR_ATTACHMENT0, this._aoMap]
        ]);

        this._outputFbo = new DefaultFramebuffer(this._context, 'Default_FBO');
        this._outputFbo.initialize();

        /* Initialize Programs */

        const vert = new Shader(context, gl.VERTEX_SHADER, 'geometry.vert');
        vert.initialize(require('./data/ssao/geometry.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'geometry.frag');
        frag.initialize(require('./data/ssao/geometry.frag'));

        this._sceneProgram = new Program(context, 'ShadingProgram');
        this._sceneProgram.initialize([vert, frag], true);
        this._sceneProgram.link();
        this._sceneProgram.bind();

        this._uViewProjection = this._sceneProgram.uniform('u_viewProjection');
        this._uModel = this._sceneProgram.uniform('u_model');
        this._uEye = this._sceneProgram.uniform('u_eye');

        this._uNormalLocation = this._sceneProgram.uniform('u_normal');

        /* Create and Configure Scene Forward Pass. */

        this._forwardPass = new ForwardSceneRenderPass(context);
        this._forwardPass.initialize();

        this._forwardPass.camera = this._camera;
        this._forwardPass.target = this._sceneFbo;

        this._forwardPass.program = this._sceneProgram;
        this._forwardPass.updateModelTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uModel, false, matrix);
        };
        this._forwardPass.updateViewProjectionTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uViewProjection, false, matrix);
        };

        this._forwardPass.bindUniforms = () => {
            gl.uniform3fv(this._uEye, this._camera.eye);
            gl.uniform1i(this._uNormalLocation, 2);
        };

        this._forwardPass.bindGeometry = (geometry: Geometry) => {
        };

        this._forwardPass.bindMaterial = (material: Material) => {
            const pbrMaterial = material as GLTFPbrMaterial;
            auxiliaries.assert(pbrMaterial !== undefined, `Material ${material.name} is not a PBR material.`);

            pbrMaterial.normalTexture!.bind(gl.TEXTURE2);
        };

        this.loadAsset();

        /* Initialize Ambient Occlusion Pass */

        /* Initialize Blur Pass */

        /* Initialize Composition Pass */

        return true;
    }

    /**
     * Uninitializes Buffers, Textures, and Program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        // ToDo: make sure that all meshes and programs inside of the scene get cleaned

        // this._mesh.uninitialize();
        // this._meshProgram.uninitialize();
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
            this._camera.aspect = this._frameSize[0] / this._frameSize[1];
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
        const gl = this._context.gl;

        this._forwardPass.prepare();

        if (this._altered.frameSize) {
            this._sceneFbo.resize(this._frameSize[0], this._frameSize[1]);
            this._aoFbo.resize(this._frameSize[0], this._frameSize[1]);
            this._blurredAOFbo.resize(this._frameSize[0], this._frameSize[1]);
        }

        /* This? */
        if (this._altered.canvasSize) {
            this._sceneProgram.bind();
            gl.uniform2f(this._sceneProgram.uniform('u_frameSize'), this._frameSize[0], this._frameSize[1]);
        }
        /* */

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        if (this.isLoading) {
            return;
        }

        this._sceneFbo.bind();
        this._sceneFbo.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT0 + 1, gl.COLOR_ATTACHMENT0 + 2]);

        this._forwardPass.frame();

        this._aoFbo.bind();
        this._aoFbo.clear(gl.COLOR_BUFFER_BIT, false, false);

        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

        this._ndcGeometry.bind();
        this._ndcGeometry.draw();
        this._ndcGeometry.unbind();

        this._aoFbo.bind();
        this._aoFbo.clear(gl.COLOR_BUFFER_BIT, false, false);

        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

        this._ndcGeometry.bind();
        this._ndcGeometry.draw();
        this._ndcGeometry.unbind();

        this._outputFbo.bind();
        this._outputFbo.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

        this._ndcGeometry.bind();
        this._ndcGeometry.draw();
        this._ndcGeometry.unbind();
    }

    protected onSwap(): void {
    }

    /**
     * Load asset from URI specified by the HTML select
     */
    protected loadAsset(): void {
        const uri = '/examples/data/matrix-chair.glb';
        this._forwardPass.scene = undefined;

        this._loader.uninitialize();
        this._loader.loadAsset(uri)
            .then(() => {
                this._forwardPass.scene = this._loader.defaultScene;
                this.finishLoading();
                this.invalidate(true);
            });
    }
}


export class AmbientOcclusionExample extends Example {

    private _canvas: Canvas;
    private _renderer: AmbientOcclusionRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });

        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new AmbientOcclusionRenderer();
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

    get renderer(): AmbientOcclusionRenderer {
        return this._renderer;
    }

}
