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

    protected _uViewProjectionLocation: WebGLUniformLocation;
    protected _uModelLocation: WebGLUniformLocation;
    protected _uNormalLocation: WebGLUniformLocation;
    protected _uSceneFrameSizeLocation: WebGLUniformLocation;
    protected _uEyeLocation: WebGLUniformLocation;
    /* // Scene Pass */

    protected _sceneFbo: Framebuffer;

    /* Ambient Occlusion Pass */
    protected _aoNoisyMap: Texture2D;

    protected _aoProgram: Program;

    protected _uAOFrameSizeLocation: WebGLUniformLocation;
    protected _uNormalTextureLocation: WebGLUniformLocation;
    protected _uDepthTextureLocation: WebGLUniformLocation;
    protected _uViewProjectionLocation2: WebGLUniformLocation;
    protected _uViewProjectionInverseLocation: WebGLUniformLocation;
    /* // Ambient Occlusion Pass */

    protected _aoFbo: Framebuffer;

    /* Blur Pass */
    protected _aoMap: Texture2D;

    protected _blurProgram: Program;

    protected _uKernelSizeLocation: WebGLUniformLocation;
    protected _uSourceLocation: WebGLUniformLocation;
    protected _uBlurFrameSizeLocation: WebGLUniformLocation;
    /* // Blur Pass */

    protected _blurredAOFbo: Framebuffer;

    /* Composition Pass */
    protected _compositionProgram: Program;

    protected _uColorLocation: WebGLUniformLocation;
    protected _uDepthLocation: WebGLUniformLocation;
    protected _uAOMapLocation: WebGLUniformLocation;
    protected _uCompositionFrameSizeLocation: WebGLUniformLocation;
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
        this._ndcGeometry.initialize();

        /* Create and configure camera. */

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 1.0, 2.0);
        this._camera.near = 0.25;
        this._camera.far = 12.0;

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
        this._sceneFbo.clearColor(this._clearColor, gl.COLOR_ATTACHMENT0);
        this._sceneFbo.clearColor([0.5, 0.5, 0.5, 0.0], gl.COLOR_ATTACHMENT0 + 1);
        this._sceneFbo.clearColor([1.0, 1.0, 1.0, 0.0], gl.COLOR_ATTACHMENT0 + 2);

        this._aoNoisyMap = new Texture2D(this._context);
        this._aoNoisyMap.initialize(1, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this._aoNoisyMap.filter(gl.LINEAR, gl.LINEAR);

        this._aoFbo = new Framebuffer(this._context, 'AO_FBO');
        this._aoFbo.initialize([
            [gl.COLOR_ATTACHMENT0, this._aoNoisyMap]
        ]);

        this._aoMap = new Texture2D(this._context);
        this._aoMap.initialize(1, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this._aoMap.filter(gl.LINEAR, gl.LINEAR);

        this._blurredAOFbo = new Framebuffer(this._context, 'BlurredAO_FBO');
        this._blurredAOFbo.initialize([
            [gl.COLOR_ATTACHMENT0, this._aoMap]
        ]);

        this._outputFbo = new DefaultFramebuffer(this._context, 'Default_FBO');
        this._outputFbo.initialize();

        /* Initialize Programs */

        /* Scene Pass */

        const scene_vert = new Shader(context, gl.VERTEX_SHADER, 'geometry.vert');
        scene_vert.initialize(require('./data/ssao/geometry.vert'));
        const scene_frag = new Shader(context, gl.FRAGMENT_SHADER, 'geometry.frag');
        scene_frag.initialize(require('./data/ssao/geometry.frag'));

        this._sceneProgram = new Program(context, 'SceneProgram');
        this._sceneProgram.initialize([scene_vert, scene_frag], true);
        this._sceneProgram.link();
        this._sceneProgram.bind();

        this._uViewProjectionLocation = this._sceneProgram.uniform('u_viewProjection');
        this._uModelLocation = this._sceneProgram.uniform('u_model');
        this._uEyeLocation = this._sceneProgram.uniform('u_eye');

        this._uNormalLocation = this._sceneProgram.uniform('u_normal');
        this._uSceneFrameSizeLocation = this._sceneProgram.uniform('u_frameSize');

        /* Shared Programs */

        const ndc_triangle_vert = new Shader(context, gl.VERTEX_SHADER, 'ndctriangle.vert');
        ndc_triangle_vert.initialize(require('../source/shaders/ndcvertices.vert'));

        /* AO Pass */

        const ao_frag = new Shader(context, gl.FRAGMENT_SHADER, 'ssao.frag');
        ao_frag.initialize(require('./data/ssao/ssao.frag'));

        this._aoProgram = new Program(context, 'AOProgram');
        this._aoProgram.initialize([ndc_triangle_vert, ao_frag], true);
        this._aoProgram.link();
        this._aoProgram.bind();

        this._uDepthTextureLocation = this._aoProgram.uniform('u_depth');
        this._uNormalTextureLocation = this._aoProgram.uniform('u_normal');
        this._uAOFrameSizeLocation = this._aoProgram.uniform('u_frameSize');
        this._uViewProjectionLocation2 = this._aoProgram.uniform('u_viewProjection');
        this._uViewProjectionInverseLocation = this._aoProgram.uniform('u_viewProjectionInverse');

        /* Blur Pass */

        const blur_frag = new Shader(context, gl.FRAGMENT_SHADER, 'blur.frag');
        blur_frag.initialize(require('./data/ssao/blur.frag'));

        this._blurProgram = new Program(context, 'BlurProgram');
        this._blurProgram.initialize([ndc_triangle_vert, blur_frag], true);
        this._blurProgram.link();
        this._blurProgram.bind();

        this._uKernelSizeLocation = this._blurProgram.uniform('u_kernelSize');
        this._uSourceLocation = this._blurProgram.uniform('u_source');
        this._uBlurFrameSizeLocation = this._blurProgram.uniform('u_frameSize');

        /* Composition Pass */

        const composition_frag = new Shader(context, gl.FRAGMENT_SHADER, 'composition.frag');
        composition_frag.initialize(require('./data/ssao/composition.frag'));

        this._compositionProgram = new Program(context, 'CompositionProgram');
        this._compositionProgram.initialize([ndc_triangle_vert, composition_frag], true);
        this._compositionProgram.link();
        this._compositionProgram.bind();

        this._uColorLocation = this._compositionProgram.uniform('u_color');
        this._uDepthLocation = this._compositionProgram.uniform('u_depth');
        this._uAOMapLocation = this._compositionProgram.uniform('u_aoMap');
        this._uCompositionFrameSizeLocation = this._compositionProgram.uniform('u_frameSize');

        /* Create and Configure Scene Forward Pass. */

        this._forwardPass = new ForwardSceneRenderPass(context);
        this._forwardPass.initialize();

        this._forwardPass.camera = this._camera;
        this._forwardPass.target = this._sceneFbo;

        this._forwardPass.program = this._sceneProgram;
        this._forwardPass.updateModelTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uModelLocation, false, matrix);
        };
        this._forwardPass.updateViewProjectionTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uViewProjectionLocation, false, matrix);
        };

        this._forwardPass.bindUniforms = () => {
            gl.uniform3fv(this._uEyeLocation, this._camera.eye);
            gl.uniform1i(this._uNormalLocation, 2);
            gl.uniform2f(this._uSceneFrameSizeLocation, this._frameSize[0], this._frameSize[1]);
        };

        this._forwardPass.bindGeometry = (geometry: Geometry) => {
        };

        this._forwardPass.bindMaterial = (material: Material) => {
            const pbrMaterial = material as GLTFPbrMaterial;
            auxiliaries.assert(pbrMaterial !== undefined, `Material ${material.name} is not a PBR material.`);

            pbrMaterial.normalTexture!.bind(gl.TEXTURE2);
        };

        this.loadAsset();

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
        const gl = this._context.gl;

        if (this._altered.frameSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
            this._camera.aspect = this._frameSize[0] / this._frameSize[1];
        }

        if (this._altered.clearColor) {
            this._sceneFbo.clearColor(this._clearColor, gl.COLOR_ATTACHMENT0);
            this._forwardPass.clearColor = this._clearColor;
        }

        this._navigation.update();
        this._forwardPass.update();

        if (this._camera.altered) {
            this._aoProgram.bind();
            gl.uniformMatrix4fv(this._uViewProjectionLocation2, false, this._camera.viewProjection);
            gl.uniformMatrix4fv(this._uViewProjectionInverseLocation, false, this._camera.viewProjectionInverse);
        }

        return this._altered.any || this._camera.altered;
    }

    /**
     * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
     * camera-updates.
     */
    protected onPrepare(): void {
        const gl = this._context.gl;

        /* Resize FBOs */

        if (this._altered.frameSize) {
            this._sceneFbo.resize(this._frameSize[0], this._frameSize[1]);
            this._aoFbo.resize(this._frameSize[0], this._frameSize[1]);
            this._blurredAOFbo.resize(this._frameSize[0], this._frameSize[1]);
        }

        /* Prepare Scene Render Pass */

        this._forwardPass.prepare();

        /* Prepare AO Map Pass */

        this._aoProgram.bind();
        gl.uniform2f(this._uAOFrameSizeLocation, this._frameSize[0], this._frameSize[1]);
        gl.uniform1i(this._uNormalTextureLocation, 0);
        gl.uniform1i(this._uDepthTextureLocation, 1);

        /* Prepare Blur Pass */

        this._blurProgram.bind();
        gl.uniform2i(this._uKernelSizeLocation, 3, 3);
        gl.uniform1i(this._uSourceLocation, 0);
        gl.uniform2f(this._uBlurFrameSizeLocation, this._frameSize[0], this._frameSize[1]);

        /* Prepare Composition Pass */

        this._compositionProgram.bind();
        gl.uniform1i(this._uColorLocation, 0);
        gl.uniform1i(this._uDepthLocation, 1);
        gl.uniform1i(this._uAOMapLocation, 2);
        gl.uniform2f(this._uCompositionFrameSizeLocation, this._frameSize[0], this._frameSize[1]);

        /* Remainder */

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        if (this.isLoading) {
            return;
        }

        /* Scene Pass */

        this._sceneFbo.bind();

        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT0 + 1, gl.COLOR_ATTACHMENT0 + 2]);

        this._sceneFbo.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.clearBufferfv(gl.COLOR, 1, [0.5, 0.5, 0.5, 1.0]);
        gl.clearBufferfv(gl.COLOR, 2, [1.0, 1.0, 1.0, 1.0]);

        this._sceneProgram.bind();

        this._forwardPass.frame();

        /* Ambient Occlusion Pass */

        this._aoFbo.bind();

        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

        this._aoFbo.clear(gl.COLOR_BUFFER_BIT, false, false);

        this._sceneNormal.bind(gl.TEXTURE0);
        this._sceneLinearDepth.bind(gl.TEXTURE1);

        this._aoProgram.bind();

        this._ndcGeometry.bind();
        this._ndcGeometry.draw();
        this._ndcGeometry.unbind();

        /* Blur Pass */

        this._blurredAOFbo.bind();

        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

        this._blurredAOFbo.clear(gl.COLOR_BUFFER_BIT, false, false);

        this._aoNoisyMap.bind(gl.TEXTURE0);

        this._blurProgram.bind();

        this._ndcGeometry.bind();
        this._ndcGeometry.draw();
        this._ndcGeometry.unbind();
    }

    protected onSwap(): void {
        const gl = this._context.gl;

        if (this.isLoading) {
            return;
        }

        /* Composition Pass */

        this._outputFbo.bind();

        gl.drawBuffers([gl.BACK]);

        this._outputFbo.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        this._sceneColor.bind(gl.TEXTURE0);
        this._sceneLinearDepth.bind(gl.TEXTURE1);
        this._aoMap.bind(gl.TEXTURE2);

        this._compositionProgram.bind();

        this._ndcGeometry.bind();
        this._ndcGeometry.draw();
        this._ndcGeometry.unbind();
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
