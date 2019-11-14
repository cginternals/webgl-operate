
import { mat3, mat4, vec2, vec3 } from 'gl-matrix';


import { auxiliaries } from 'webgl-operate';

import {
    AccumulatePass,
    AntiAliasingKernel,
    BlitPass,
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    ForwardSceneRenderPass,
    Framebuffer,
    Geometry,
    GLTFAlphaMode,
    GLTFLoader,
    GLTFPbrMaterial,
    GLTFPrimitive,
    Invalidate,
    Material,
    MouseEventProvider,
    Navigation,
    NdcFillingTriangle,
    Program,
    Renderbuffer,
    Renderer,
    Shader,
    ShadowPass,
    Texture2D,
    TextureCube,
    Wizard,
} from 'webgl-operate';

import { PostProcessingPass } from './postprocessingpass';
import { Scene } from './scene';

import { Demo } from '../demo';
import { DiskLight } from './arealight';

// tslint:disable:max-classes-per-file

/**
 * @todo comment
 */
export class ThesisRenderer extends Renderer {

    protected _loader: GLTFLoader;
    protected _loading: boolean;

    protected _navigation: Navigation;

    protected _forwardPass: ForwardSceneRenderPass;
    protected _accumulatePass: AccumulatePass;
    protected _blitPass: BlitPass;
    protected _postProcessingPass: PostProcessingPass;
    protected _shadowPass: ShadowPass;

    protected _camera: Camera;

    protected _currentScene: Scene;
    protected _datsunScene: Scene;
    protected _kitchenScene: Scene;
    protected _cornellScene: Scene;

    protected _intermediateFBO: Framebuffer;
    protected _colorRenderTexture: Texture2D;
    protected _depthRenderbuffer: Renderbuffer;

    protected _preDepthFBO: Framebuffer;
    protected _normalDepthTexture: Texture2D;
    protected _preDepthRenderbuffer: Renderbuffer;
    protected _depthProgram: Program;

    protected _defaultFramebuffer: Framebuffer;
    protected _ndcTriangle: NdcFillingTriangle;
    protected _program: Program;
    protected _shadowProgram: Program;
    protected _emptyTexture: Texture2D;

    protected _specularEnvironment: TextureCube;
    protected _brdfLUT: Texture2D;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uView: WebGLUniformLocation;
    protected _uProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uNormalMatrix: WebGLUniformLocation;
    protected _uViewNormalMatrix: WebGLUniformLocation;
    protected _uCameraNearFar: WebGLUniformLocation;

    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uFrameNumber: WebGLUniformLocation;

    protected _uBaseColor: WebGLUniformLocation;
    protected _uBaseColorTexCoord: WebGLUniformLocation;
    protected _uMetallicRoughness: WebGLUniformLocation;
    protected _uMetallicRoughnessTexCoord: WebGLUniformLocation;
    protected _uNormal: WebGLUniformLocation;
    protected _uNormalTexCoord: WebGLUniformLocation;
    protected _uEmissive: WebGLUniformLocation;
    protected _uEmissiveTexCoord: WebGLUniformLocation;
    protected _uOcclusion: WebGLUniformLocation;
    protected _uOcclusionTexCoord: WebGLUniformLocation;

    protected _uEye: WebGLUniformLocation;
    protected _uGeometryFlags: WebGLUniformLocation;
    protected _uPbrFlags: WebGLUniformLocation;
    protected _uBaseColorFactor: WebGLUniformLocation;
    protected _uMetallicFactor: WebGLUniformLocation;
    protected _uRoughnessFactor: WebGLUniformLocation;
    protected _uEmissiveFactor: WebGLUniformLocation;
    protected _uNormalScale: WebGLUniformLocation;
    protected _uBlendMode: WebGLUniformLocation;
    protected _uBlendCutoff: WebGLUniformLocation;

    protected _uSphereLightCenter: WebGLUniformLocation;
    protected _uSphereLightRadius: WebGLUniformLocation;
    protected _uSphereLightLuminance: WebGLUniformLocation;

    protected _uSpecularEnvironment: WebGLUniformLocation;
    protected _uBRDFLookupTable: WebGLUniformLocation;
    protected _uShadowMap: WebGLUniformLocation;
    protected _uLastFrame: WebGLUniformLocation;
    protected _uNormalDepth: WebGLUniformLocation;

    protected _uSSAORange: WebGLUniformLocation;
    protected _uSSRRange: WebGLUniformLocation;
    protected _uExposure: WebGLUniformLocation;
    protected _uIBLStrength: WebGLUniformLocation;

    protected _uLightView: WebGLUniformLocation;
    protected _uLightProjection: WebGLUniformLocation;
    protected _uLightNearFar: WebGLUniformLocation;

    protected _uModelS: WebGLUniformLocation;
    protected _uViewS: WebGLUniformLocation;
    protected _uViewProjectionS: WebGLUniformLocation;
    protected _uLightNearFarS: WebGLUniformLocation;

    protected _uModelD: WebGLUniformLocation;
    protected _uViewProjectionD: WebGLUniformLocation;
    protected _uViewD: WebGLUniformLocation;
    protected _uCameraNearFarD: WebGLUniformLocation;

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
        const gl2facade = this._context.gl2facade;

        this._loader = new GLTFLoader(this._context);

        this._cornellScene = new Scene('http://35.196.123.235/assets/cornell.glb',
            new Camera(vec3.fromValues(-0.255, 3.09, -8.0), vec3.fromValues(0.135, 1.192, -0.46)),
            0.2, 20);
        this._cornellScene.addDiskLight(new DiskLight(
            vec3.fromValues(0.13, 2.32, -0.23),
            0.15,
            vec3.fromValues(303, 303, 303),
            vec3.fromValues(0, -1, 0),
            90.0));

        this._datsunScene = new Scene(
            'http://35.196.123.235/assets/datsun.glb',
            new Camera(vec3.fromValues(-1.9631, 1.89, 6.548), vec3.fromValues(0.292, -0.327, -0.13)),
            0.2, 30);
        this._datsunScene.addDiskLight(new DiskLight(
            vec3.fromValues(-3.04, 3.0, -1.4),
            0.15,
            vec3.fromValues(901, 901, 901),
            vec3.fromValues(0.67636, -0.66746, 0.31148),
            110.0));
        this._datsunScene.addDiskLight(new DiskLight(
            vec3.fromValues(2.62, 3.0, -1.4),
            0.15,
            vec3.fromValues(901, 901, 901),
            vec3.fromValues(-0.62057, -0.71058, 0.33160),
            110.0));
        this._datsunScene.addDiskLight(new DiskLight(
            vec3.fromValues(-2.12, 3.0, 2.1),
            0.15,
            vec3.fromValues(901, 901, 901),
            vec3.fromValues(0.50102, -0.70899, -0.49629),
            110.0));
        this._datsunScene.addDiskLight(new DiskLight(
            vec3.fromValues(2.14, 3.0, 2.1),
            0.15,
            vec3.fromValues(901, 901, 901),
            vec3.fromValues(-0.50454, -0.70731, -0.49511),
            110.0));

        this._kitchenScene = new Scene(
            'http://35.196.123.235/assets/kitchen.glb',
            new Camera(vec3.fromValues(-0.65597, 2.2284, 6.2853), vec3.fromValues(0.24971, 1.1144, -0.7265)),
            0.1, 10);
        this._kitchenScene.addDiskLight(new DiskLight(
            vec3.fromValues(-0.54, 1.6, -1.17),
            0.025,
            vec3.fromValues(5001, 5001, 5001),
            vec3.fromValues(0, -1, 0),
            160.0));
        this._kitchenScene.addDiskLight(new DiskLight(
            vec3.fromValues(0.88, 1.6, -1.17),
            0.025,
            vec3.fromValues(5001, 5001, 5001),
            vec3.fromValues(0, -1, 0),
            160.0));
        this._kitchenScene.addDiskLight(new DiskLight(
            vec3.fromValues(1.62, 1.6, -1.17),
            0.025,
            vec3.fromValues(5001, 5001, 5001),
            vec3.fromValues(0, -1, 0), 160.0));
        this._kitchenScene.addDiskLight(new DiskLight(
            vec3.fromValues(0.16, 1.6, -1.17),
            0.025,
            vec3.fromValues(5001, 5001, 5001),
            vec3.fromValues(0, -1, 0),
            160.0));
        this._kitchenScene.addDiskLight(new DiskLight(
            vec3.fromValues(1.92, 1.6, -0.86),
            0.025,
            vec3.fromValues(5001, 5001, 5001),
            vec3.fromValues(0, -1, 0),
            160.0));
        this._kitchenScene.addDiskLight(new DiskLight(
            vec3.fromValues(1.92, 1.6, -0.22),
            0.025,
            vec3.fromValues(5001, 5001, 5001),
            vec3.fromValues(0, -1, 0),
            160.0));

        this._emptyTexture = new Texture2D(this._context, 'EmptyTexture');
        this._emptyTexture.initialize(1, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

        this._defaultFramebuffer = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFramebuffer.initialize();

        this._ndcTriangle = new NdcFillingTriangle(this._context);
        this._ndcTriangle.initialize();

        /* Initialize program, we do not use the default gltf shader here */
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'gltf_thesis.vert');
        vert.initialize(require('./data/gltf_thesis.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'gltf_thesis.frag');
        frag.initialize(require('./data/gltf_thesis.frag'));
        this._program = new Program(this._context, 'ThesisPbrProgram');
        this._program.initialize([vert, frag]);

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uView = this._program.uniform('u_view');
        this._uProjection = this._program.uniform('u_projection');
        this._uModel = this._program.uniform('u_model');
        this._uNormalMatrix = this._program.uniform('u_normalMatrix');
        this._uViewNormalMatrix = this._program.uniform('u_viewNormalMatrix');
        this._uCameraNearFar = this._program.uniform('u_cameraNearFar');

        this._uBaseColor = this._program.uniform('u_baseColor');
        this._uBaseColorTexCoord = this._program.uniform('u_baseColorTexCoord');

        this._uMetallicRoughness = this._program.uniform('u_metallicRoughness');
        this._uMetallicRoughnessTexCoord = this._program.uniform('u_metallicRoughnessTexCoord');

        this._uNormal = this._program.uniform('u_normal');
        this._uNormalTexCoord = this._program.uniform('u_normalTexCoord');

        this._uEmissive = this._program.uniform('u_emissive');
        this._uEmissiveTexCoord = this._program.uniform('u_emissiveTexCoord');

        this._uOcclusion = this._program.uniform('u_occlusion');
        this._uOcclusionTexCoord = this._program.uniform('u_occlusionTexCoord');

        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uFrameNumber = this._program.uniform('u_frameNumber');

        this._uEye = this._program.uniform('u_eye');
        this._uGeometryFlags = this._program.uniform('u_geometryFlags');
        this._uPbrFlags = this._program.uniform('u_pbrFlags');
        this._uBaseColorFactor = this._program.uniform('u_baseColorFactor');
        this._uMetallicFactor = this._program.uniform('u_metallicFactor');
        this._uRoughnessFactor = this._program.uniform('u_roughnessFactor');
        this._uEmissiveFactor = this._program.uniform('u_emissiveFactor');
        this._uNormalScale = this._program.uniform('u_normalScale');
        this._uBlendMode = this._program.uniform('u_blendMode');
        this._uBlendCutoff = this._program.uniform('u_blendCutoff');

        this._uSphereLightCenter = this._program.uniform('u_sphereLight.center');
        this._uSphereLightRadius = this._program.uniform('u_sphereLight.radius');
        this._uSphereLightLuminance = this._program.uniform('u_sphereLight.luminance');

        this._uSpecularEnvironment = this._program.uniform('u_specularEnvironment');
        this._uBRDFLookupTable = this._program.uniform('u_brdfLUT');
        this._uLastFrame = this._program.uniform('u_lastFrame');
        this._uShadowMap = this._program.uniform('u_shadowMap');
        this._uNormalDepth = this._program.uniform('u_normalDepth');

        this._uLightView = this._program.uniform('u_lightView');
        this._uLightProjection = this._program.uniform('u_lightProjection');
        this._uLightNearFar = this._program.uniform('u_lightNearFar');

        this._uSSAORange = this._program.uniform('u_ssaoRange');
        this._uSSRRange = this._program.uniform('u_ssrRange');
        this._uIBLStrength = this._program.uniform('u_iblStrength');

        /* Initialize shadow program */
        const shadowVert = new Shader(this._context, gl.VERTEX_SHADER, 'gltf_thesis.vert');
        shadowVert.initialize(require('./data/gltf_thesis.vert'));
        const shadowFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'gltf_thesis_shadow.frag');
        shadowFrag.initialize(require('./data/gltf_thesis_shadow.frag'));
        this._shadowProgram = new Program(this._context, 'ThesisShadowProgram');
        this._shadowProgram.initialize([shadowVert, shadowFrag]);

        this._uModelS = this._shadowProgram.uniform('u_model');
        this._uViewS = this._shadowProgram.uniform('u_view');
        this._uViewProjectionS = this._shadowProgram.uniform('u_viewProjection');
        this._uLightNearFarS = this._shadowProgram.uniform('u_lightNearFar');

        /* Initialize pre depth program */
        const depthVert = new Shader(this._context, gl.VERTEX_SHADER, 'gltf_thesis.vert');
        depthVert.initialize(require('./data/gltf_thesis.vert'));
        const depthFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'gltf_thesis_depth.frag');
        depthFrag.initialize(require('./data/gltf_thesis_depth.frag'));
        this._depthProgram = new Program(this._context, 'ThesisDepthProgram');
        this._depthProgram.initialize([depthVert, depthFrag]);

        this._uViewD = this._depthProgram.uniform('u_view');
        this._uViewProjectionD = this._depthProgram.uniform('u_viewProjection');
        this._uCameraNearFarD = this._depthProgram.uniform('u_cameraNearFar');
        this._uModelD = this._depthProgram.uniform('u_model');

        /* Camera will be setup by the scenes */
        this._camera = new Camera();

        /* Create and configure navigation */

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        /**
         * Setup intermediate FBO and textures
         */
        this._colorRenderTexture = new Texture2D(this._context, 'ColorRenderTexture');
        this._depthRenderbuffer = new Renderbuffer(this._context, 'DepthRenderbuffer');
        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');

        /**
         * Setup pre depth FBO
         */
        this._preDepthFBO = new Framebuffer(this._context, 'PreDepthFBO');
        this._normalDepthTexture = new Texture2D(this._context, 'NormalDepthTexture');
        this._preDepthRenderbuffer = new Renderbuffer(this._context, 'PreDepthRenderbuffer');

        /* Create and configure forward pass. */

        this._forwardPass = new ForwardSceneRenderPass(context);
        this._forwardPass.initialize();

        this._forwardPass.camera = this._camera;
        this._forwardPass.target = this._intermediateFBO;

        this._forwardPass.program = this._program;
        this._forwardPass.bindUniforms = () => {
            gl.uniform3fv(this._uEye, this._camera.eye);

            gl.uniform1i(this._uBaseColor, 0);
            gl.uniform1i(this._uMetallicRoughness, 1);
            gl.uniform1i(this._uNormal, 2);
            gl.uniform1i(this._uOcclusion, 3);
            gl.uniform1i(this._uEmissive, 4);
            gl.uniform1i(this._uSpecularEnvironment, 5);
            gl.uniform1i(this._uBRDFLookupTable, 6);
            gl.uniform1i(this._uShadowMap, 7);
            gl.uniform1i(this._uNormalDepth, 8);
            gl.uniform1i(this._uLastFrame, 9);

            this._specularEnvironment.bind(gl.TEXTURE5);
            this._brdfLUT.bind(gl.TEXTURE6);
        };
        this._forwardPass.updateViewProjectionTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uViewProjection, gl.FALSE, matrix);
        };

        this._accumulatePass = new AccumulatePass(context);
        this._accumulatePass.initialize(this._ndcTriangle);
        this._accumulatePass.precision = this._framePrecision;
        this._accumulatePass.texture = this._colorRenderTexture;

        this._postProcessingPass = new PostProcessingPass(context);
        this._postProcessingPass.initialize(this._ndcTriangle);

        this._shadowPass = new ShadowPass(context);
        this._shadowPass.initialize(ShadowPass.ShadowMappingType.HardShadowMapping, [2048, 2048]);

        this._blitPass = new BlitPass(this._context);
        this._blitPass.initialize(this._ndcTriangle);
        this._blitPass.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blitPass.drawBuffer = gl.BACK;
        this._blitPass.target = this._defaultFramebuffer;

        /**
         * Start loading environment.
         */
        this.loadEnvironmentMap();

        /**
         * Setup debugging widgets.
         */
        const assetSelect = window.document.getElementById('asset-select')! as HTMLSelectElement;
        assetSelect.onchange = (_) => {
            this.loadAsset();
        };

        const debugSelect = window.document.getElementById('debug-select')! as HTMLSelectElement;
        debugSelect.onchange = (_) => {
            this.setDebugMode();
        };

        const exposureRange = window.document.getElementById('exposure-range')! as HTMLInputElement;
        exposureRange.onchange = (_) => {
            this._postProcessingPass.exposure = parseFloat(exposureRange.value) / 10.0;
            this._invalidate(true);
        };

        const iblRange = window.document.getElementById('ibl-range')! as HTMLInputElement;
        iblRange.onchange = (_) => {
            this._program.bind();
            gl.uniform1f(this._uIBLStrength, parseFloat(iblRange.value) / 20.0);
            this._program.unbind();
            this._invalidate(true);
        };
        iblRange.onchange(new Event(''));

        const ssaoRange = window.document.getElementById('ssao-range')! as HTMLInputElement;
        ssaoRange.onchange = (_) => {
            this._program.bind();
            gl.uniform1f(this._uSSAORange, parseFloat(ssaoRange.value) / 100.0);
            this._program.unbind();
            this._invalidate(true);
        };
        ssaoRange.onchange(new Event(''));

        const ssrRange = window.document.getElementById('ssr-range')! as HTMLInputElement;
        ssrRange.onchange = (_) => {
            this._program.bind();
            gl.uniform1f(this._uSSRRange, parseFloat(ssrRange.value) / 100.0);
            this._program.unbind();
            this._invalidate(true);
        };
        ssrRange.onchange(new Event(''));

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
        if (this._altered.frameSize || this._camera.altered) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        if (this._altered.canvasSize || this._camera.altered) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
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
        const gl2facade = this._context.gl2facade;

        if (this._forwardPass.scene === undefined) {
            this.loadAsset();
        }

        if (!this._intermediateFBO.initialized) {
            this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                this._context.isWebGL2 ? gl.RGBA32F : gl.RGBA, gl.RGBA, gl.FLOAT);
            this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);
        }

        if (!this._preDepthFBO.initialized) {
            this._normalDepthTexture.initialize(this._frameSize[0], this._frameSize[1],
                this._context.isWebGL2 ? gl.RGBA32F : gl.RGBA,
                this._context.isWebGL2 ? gl.RGBA : gl.RGBA,
                gl.FLOAT);
            this._preDepthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
            this._preDepthFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._normalDepthTexture]
                , [gl.DEPTH_ATTACHMENT, this._preDepthRenderbuffer]]);
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);
        }

        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }

        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
            this._forwardPass.clearColor = this._clearColor;
        }

        this._forwardPass.prepare();
        this._accumulatePass.update();

        this._postProcessingPass.texture = this._accumulatePass.framebuffer!.texture(gl2facade.COLOR_ATTACHMENT0)!;
        this._postProcessingPass.update();

        this._altered.reset();
        this._camera.altered = false;
    }

    protected preDepthPass(): void {
        const gl = this._context.gl;

        this._preDepthFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
        gl.viewport(0, 0, this._preDepthFBO.width, this._preDepthFBO.height);

        this._depthProgram.bind();
        gl.uniform2fv(this._uCameraNearFarD, vec2.fromValues(this._camera.near, this._camera.far));
        gl.uniformMatrix4fv(this._uViewD, gl.FALSE, this._camera.view);
        gl.uniformMatrix4fv(this._uViewProjectionD, gl.FALSE, this._camera.viewProjection);

        this._forwardPass.program = this._depthProgram;
        this._forwardPass.target = this._preDepthFBO;
        this._forwardPass.bindMaterial = (_: Material) => { };
        this._forwardPass.bindGeometry = (_: Geometry) => { };
        this._forwardPass.updateModelTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uModelD, gl.FALSE, matrix);
        };

        this._forwardPass.drawCalls();
    }

    protected shadowPass(frameNumber: number): void {
        const gl = this._context.gl;

        const currentLight = frameNumber % this._currentScene.diskLights.length;
        const light = this._currentScene.diskLights[currentLight];
        const offset = vec3.random(vec3.create(), light.radius);
        const eye = vec3.add(vec3.create(), light.center, offset);
        const center = vec3.add(vec3.create(), eye, light.direction);
        const lightCamera = new Camera();

        lightCamera.eye = eye;
        lightCamera.center = center;
        lightCamera.up = vec3.fromValues(1.0, 0.0, 0.0);
        lightCamera.near = 0.1;
        lightCamera.far = 30.0;
        lightCamera.fovy = light.fovy;
        const lightNearFar = vec2.fromValues(lightCamera.near, lightCamera.far);

        this._shadowPass.frame(() => {
            this._shadowProgram.bind();

            gl.uniformMatrix4fv(this._uViewProjectionS, gl.FALSE, lightCamera.viewProjection);
            gl.uniformMatrix4fv(this._uViewS, gl.FALSE, lightCamera.view);
            gl.uniform2fv(this._uLightNearFarS, lightNearFar);

            this._forwardPass.bindMaterial = (_: Material) => { };
            this._forwardPass.bindGeometry = (_: Geometry) => { };
            this._forwardPass.updateModelTransform = (matrix: mat4) => {
                gl.uniformMatrix4fv(this._uModelS, gl.FALSE, matrix);
            };
            this._forwardPass.drawCalls();

            this._shadowProgram.unbind();
        });

        // Update mesh programs values for shadow map application
        this._program.bind();
        gl.uniformMatrix4fv(this._uLightView, gl.FALSE, lightCamera.view);
        gl.uniformMatrix4fv(this._uLightProjection, gl.FALSE, lightCamera.projection);
        gl.uniform2fv(this._uLightNearFar, lightNearFar);
        this._program.unbind();
    }

    protected onFrame(frameNumber: number): void {
        if (this._loading) {
            return;
        }

        auxiliaries.assert(this._forwardPass.scene !== undefined, `Scene undefined in onFrame.`);

        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        if (frameNumber === 1) {
            this.preDepthPass();
        }

        if (frameNumber > 0) {
            this.shadowPass(frameNumber);
        }

        this._program.bind();

        // Update per frame uniforms
        gl.uniform1i(this._uFrameNumber, frameNumber);
        gl.uniformMatrix4fv(this._uView, gl.FALSE, this._camera.view);
        gl.uniformMatrix4fv(this._uProjection, gl.FALSE, this._camera.projection);
        gl.uniform2fv(this._uCameraNearFar, vec2.fromValues(this._camera.near, this._camera.far));

        const viewNormalMatrix = mat3.create();
        mat3.normalFromMat4(viewNormalMatrix, this._camera.view);
        gl.uniformMatrix3fv(this._uViewNormalMatrix, gl.FALSE, viewNormalMatrix);

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];
        gl.uniform2fv(this._uNdcOffset, ndcOffset);

        this._shadowPass.shadowMapTexture.bind(gl.TEXTURE7);
        this._normalDepthTexture.bind(gl.TEXTURE8);

        const lastFrame = this._accumulatePass.framebuffer!.texture(gl2facade.COLOR_ATTACHMENT0)!;
        lastFrame.bind(gl.TEXTURE9);

        this._forwardPass.program = this._program;
        this._forwardPass.target = this._intermediateFBO;
        this._forwardPass.bindMaterial = (material: Material) => {
            const pbrMaterial = material as GLTFPbrMaterial;
            auxiliaries.assert(pbrMaterial !== undefined, `Material ${material.name} is not a PBR material.`);

            /**
             * Base color texture
             */
            if (pbrMaterial.baseColorTexture !== undefined) {
                pbrMaterial.baseColorTexture.bind(gl.TEXTURE0);
                gl.uniform1i(this._uBaseColorTexCoord, pbrMaterial.baseColorTexCoord);
            } else {
                this._emptyTexture.bind(gl.TEXTURE0);
            }

            /**
             * Metallic Roughness texture
             */
            if (pbrMaterial.metallicRoughnessTexture !== undefined) {
                pbrMaterial.metallicRoughnessTexture.bind(gl.TEXTURE1);
                gl.uniform1i(this._uMetallicRoughnessTexCoord, pbrMaterial.metallicRoughnessTexCoord);
            } else {
                this._emptyTexture.bind(gl.TEXTURE1);
            }

            /**
             * Normal texture
             */
            if (pbrMaterial.normalTexture !== undefined) {
                pbrMaterial.normalTexture.bind(gl.TEXTURE2);
                gl.uniform1i(this._uNormalTexCoord, pbrMaterial.normalTexCoord);
            } else {
                this._emptyTexture.bind(gl.TEXTURE2);
            }

            /**
             * Occlusion texture
             */
            if (pbrMaterial.occlusionTexture !== undefined) {
                pbrMaterial.occlusionTexture.bind(gl.TEXTURE3);
                gl.uniform1i(this._uOcclusionTexCoord, pbrMaterial.occlusionTexCoord);
            } else {
                this._emptyTexture.bind(gl.TEXTURE3);
            }

            /**
             * Emission texture
             */
            if (pbrMaterial.emissiveTexture !== undefined) {
                pbrMaterial.emissiveTexture.bind(gl.TEXTURE4);
                gl.uniform1i(this._uEmissiveTexCoord, pbrMaterial.emissiveTexCoord);
            } else {
                this._emptyTexture.bind(gl.TEXTURE4);
            }

            /**
             * Material properties
             */
            gl.uniform4fv(this._uBaseColorFactor, pbrMaterial.baseColorFactor);
            gl.uniform3fv(this._uEmissiveFactor, pbrMaterial.emissiveFactor);
            gl.uniform1f(this._uMetallicFactor, pbrMaterial.metallicFactor);
            gl.uniform1f(this._uRoughnessFactor, pbrMaterial.roughnessFactor);
            gl.uniform1f(this._uNormalScale, pbrMaterial.normalScale);
            gl.uniform1i(this._uPbrFlags, pbrMaterial.flags);

            if (pbrMaterial.alphaMode === GLTFAlphaMode.OPAQUE) {
                gl.disable(gl.BLEND);
                gl.uniform1i(this._uBlendMode, 0);
            } else if (pbrMaterial.alphaMode === GLTFAlphaMode.MASK) {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                gl.uniform1i(this._uBlendMode, 1);
                gl.uniform1f(this._uBlendCutoff, pbrMaterial.alphaCutoff);
            } else if (pbrMaterial.alphaMode === GLTFAlphaMode.BLEND) {
                gl.enable(gl.BLEND);
                // We premultiply in the shader
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

                gl.uniform1i(this._uBlendMode, 2);
            } else {
                auxiliaries.log(auxiliaries.LogLevel.Warning, 'Unknown blend mode encountered.');
            }
        };
        this._forwardPass.bindGeometry = (geometry: Geometry) => {
            const primitive = geometry as GLTFPrimitive;
            gl.uniform1i(this._uGeometryFlags, primitive.flags);
        };
        this._forwardPass.updateModelTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uModel, gl.FALSE, matrix);

            const normalMatrix = mat3.create();
            mat3.normalFromMat4(normalMatrix, matrix);
            gl.uniformMatrix3fv(this._uNormalMatrix, gl.FALSE, normalMatrix);
        };
        this._forwardPass.frame();

        this._accumulatePass.frame(frameNumber);

        this._postProcessingPass.texture = this._accumulatePass.framebuffer!.texture(gl2facade.COLOR_ATTACHMENT0)!;
        this._postProcessingPass.frame();
    }

    protected onSwap(): void {
        this._blitPass.framebuffer = this._postProcessingPass.framebuffer;
        this._blitPass.frame();
    }

    /**
     * Load asset from URI specified by the HTML select
     */
    protected loadAsset(): void {
        const assetSelect = window.document.getElementById('asset-select')! as HTMLSelectElement;

        let scene: Scene | undefined;
        if (assetSelect.value === 'Datsun') {
            scene = this._datsunScene;
        } else if (assetSelect.value === 'Kitchen') {
            scene = this._kitchenScene;
        } else if (assetSelect.value === 'Cornell') {
            scene = this._cornellScene;
        }

        auxiliaries.assert(scene !== undefined, `Unknown scene ${assetSelect.value}.`);

        if (scene === undefined) {
            auxiliaries.log(auxiliaries.LogLevel.Error, `Scene ${assetSelect.value} could not be loaded.`);
            return;
        }

        // Show loading spinner and clear background
        this.showSpinner();
        this._postProcessingPass.clear();

        this._currentScene = scene;

        this._camera = scene!.camera;
        this.updateCamera();
        this.updateLights(scene!);

        this._loader.uninitialize();
        this._loader.loadAsset(scene!.uri)
            .then(() => {
                this._forwardPass.scene = this._loader.defaultScene;
                this._invalidate(true);
                this.hideSpinner();
            });
    }

    protected setDebugMode(): void {
        const gl = this._context.gl;

        const debugSelect = window.document.getElementById('debug-select')! as HTMLSelectElement;

        let debugMode = 0;
        if (debugSelect.value === 'Final') {
            debugMode = 0;
        } else if (debugSelect.value === 'Flat') {
            debugMode = 1;
        } else if (debugSelect.value === 'IBL') {
            debugMode = 2;
        } else if (debugSelect.value === 'Light sources') {
            debugMode = 3;
        } else if (debugSelect.value === 'Illuminance') {
            debugMode = 4;
        }

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_debugMode'), debugMode);
        this._program.unbind();

        this._invalidate(true);
    }

    protected updateLights(scene: Scene): void {
        const gl = this._context.gl;

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_numSphereLights'), scene.sphereLights.length);

        let i = 0;
        for (const sphereLight of scene.sphereLights) {
            gl.uniform3fv(this._program.uniform(`u_sphereLights[${i}].center`), sphereLight.center);
            gl.uniform1f(this._program.uniform(`u_sphereLights[${i}].radius`), sphereLight.radius);
            gl.uniform3fv(this._program.uniform(`u_sphereLights[${i}].luminance`), sphereLight.luminance);
            i++;
        }

        gl.uniform1i(this._program.uniform('u_numDiskLights'), scene.diskLights.length);

        for (const diskLight of scene.diskLights) {
            gl.uniform3fv(this._program.uniform(`u_diskLights[${i}].center`), diskLight.center);
            gl.uniform1f(this._program.uniform(`u_diskLights[${i}].radius`), diskLight.radius);
            gl.uniform3fv(this._program.uniform(`u_diskLights[${i}].luminance`), diskLight.luminance);
            gl.uniform3fv(this._program.uniform(`u_diskLights[${i}].direction`), diskLight.direction);
            i++;
        }

        this._program.unbind();
    }

    protected updateCamera(): void {
        // focal length of 50mm
        this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        // Convert from horizontal to vertical FOV
        const horizontalFOV = 39.6 * auxiliaries.DEG2RAD;
        const verticalFOV = 2.0 * Math.atan(Math.tan(horizontalFOV / 2.0) * (1.0 / this._camera.aspect));
        this._camera.fovy = verticalFOV * auxiliaries.RAD2DEG;

        this._forwardPass.camera = this._camera;
        this._navigation.camera = this._camera;
        this._camera.altered = true;
    }

    /**
     * Setup environment lighting
     */
    protected loadEnvironmentMap(): void {
        const gl = this._context.gl;

        this._brdfLUT = new Texture2D(this._context, 'BRDFLookUpTable');
        this._brdfLUT.initialize(1, 1, gl.RG16F, gl.RG, gl.FLOAT);
        this._brdfLUT.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        this._brdfLUT.filter(gl.LINEAR, gl.LINEAR);
        this._brdfLUT.fetch('../examples/data/imagebasedlighting/brdfLUT.png');

        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGBA, Wizard.Precision.byte);

        this._specularEnvironment = new TextureCube(this._context, 'Cubemap');
        this._specularEnvironment.initialize(512, internalFormatAndType[0], gl.RGBA, internalFormatAndType[1]);

        const MIPMAP_LEVELS = 9;

        this._specularEnvironment.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._specularEnvironment.levels(0, MIPMAP_LEVELS - 1);

        for (let mipLevel = 0; mipLevel < MIPMAP_LEVELS; ++mipLevel) {
            this._specularEnvironment.fetch({
                positiveX: `http://35.196.123.235/studio010_LDR_linear_HC/preprocessed-map-px-${mipLevel}.png`,
                negativeX: `http://35.196.123.235/studio010_LDR_linear_HC/preprocessed-map-nx-${mipLevel}.png`,
                positiveY: `http://35.196.123.235/studio010_LDR_linear_HC/preprocessed-map-py-${mipLevel}.png`,
                negativeY: `http://35.196.123.235/studio010_LDR_linear_HC/preprocessed-map-ny-${mipLevel}.png`,
                positiveZ: `http://35.196.123.235/studio010_LDR_linear_HC/preprocessed-map-pz-${mipLevel}.png`,
                negativeZ: `http://35.196.123.235/studio010_LDR_linear_HC/preprocessed-map-nz-${mipLevel}.png`,
            }, mipLevel);
        }
    }

    /**
     * Show a spinner that indicates that the demo is still loading.
     */
    protected showSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'inline';
        this._loading = true;
    }

    /**
     * Hide the loading spinner.
     */
    protected hideSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'none';
        this._loading = false;
    }
}

export class ThesisDemo extends Demo {

    private _canvas: Canvas;
    private _renderer: ThesisRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element);
        this._canvas.controller.multiFrameNumber = 120;
        this._canvas.framePrecision = Wizard.Precision.float;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new ThesisRenderer();
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

    get renderer(): ThesisRenderer {
        return this._renderer;
    }

}
