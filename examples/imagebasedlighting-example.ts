
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    GeosphereGeometry,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    Shader,
    Texture2D,
    TextureCube,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class ImageBasedLightingRenderer extends Renderer {

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _sphere: GeosphereGeometry;
    protected _albedoTexture: Texture2D;
    protected _roughnessTexture: Texture2D;
    protected _metallicTexture: Texture2D;
    protected _normalTexture: Texture2D;
    protected _brdfLUT: Texture2D;
    protected _cubemap: TextureCube;

    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;

    protected _defaultFBO: DefaultFramebuffer;

    protected _promises: Array<Promise<void>>;
    protected _isLoaded: boolean;

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

        this._promises = new Array();

        this.showSpinner();
        this._isLoaded = false;

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl;

        this._sphere = new GeosphereGeometry(context, 'Sphere');
        this._sphere.initialize();

        const vert = new Shader(context, gl.VERTEX_SHADER, 'mesh.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'imagebasedlighting.frag');
        frag.initialize(require('./data/imagebasedlighting.frag'));

        this._program = new Program(context, 'CubeProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._sphere.vertexLocation);
        this._program.attribute('a_texCoord', this._sphere.texCoordLocation);
        this._program.link();
        this._program.bind();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uEye = this._program.uniform('u_eye');

        const identity = mat4.identity(mat4.create());
        gl.uniformMatrix4fv(this._program.uniform('u_model'), gl.FALSE, identity);
        gl.uniform1i(this._program.uniform('u_albedoTexture'), 0);
        gl.uniform1i(this._program.uniform('u_roughnessTexture'), 1);
        gl.uniform1i(this._program.uniform('u_metallicTexture'), 2);
        gl.uniform1i(this._program.uniform('u_normalTexture'), 3);
        gl.uniform1i(this._program.uniform('u_cubemap'), 4);
        gl.uniform1i(this._program.uniform('u_brdfLUT'), 5);

        gl.uniform1i(this._program.uniform('u_textured'), false);

        /**
         * Textures taken from https://3dtextures.me/2018/11/19/metal-001/ and modified
         */
        this._albedoTexture = new Texture2D(context, 'AlbedoTexture');
        this._albedoTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._albedoTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._albedoTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._albedoTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);
        this._promises.push(
            this._albedoTexture.fetch('./data/imagebasedlighting/Metal_001_basecolor.png', false));

        this._roughnessTexture = new Texture2D(context, 'RoughnessTexture');
        this._roughnessTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._roughnessTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._roughnessTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._roughnessTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);
        this._promises.push(
            this._roughnessTexture.fetch('./data/imagebasedlighting/Metal_001_roughness.png', false));

        this._metallicTexture = new Texture2D(context, 'MetallicTexture');
        this._metallicTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._metallicTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._metallicTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._metallicTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);
        this._promises.push(
            this._metallicTexture.fetch('./data/imagebasedlighting/Metal_001_metallic.png', false));

        this._normalTexture = new Texture2D(context, 'NormalTexture');
        this._normalTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._normalTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._normalTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._normalTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);
        this._promises.push(
            this._normalTexture.fetch('./data/imagebasedlighting/Metal_001_normal.png', false));

        this._brdfLUT = new Texture2D(context, 'BRDFLookUpTable');
        this._brdfLUT.initialize(1, 1, gl.RG16F, gl.RG, gl.FLOAT);
        this._brdfLUT.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        this._brdfLUT.filter(gl.LINEAR, gl.LINEAR);
        this._promises.push(
            this._brdfLUT.fetch('./data/imagebasedlighting/brdfLUT.png'));

        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGBA, Wizard.Precision.byte);

        this._cubemap = new TextureCube(context, 'Cubemap');
        this._cubemap.initialize(512, internalFormatAndType[0], gl.RGBA, internalFormatAndType[1]);

        const MIPMAP_LEVELS = 9;

        this._cubemap.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._cubemap.levels(0, MIPMAP_LEVELS - 1);

        for (let mipLevel = 0; mipLevel < MIPMAP_LEVELS; ++mipLevel) {
            this._promises.push(
                this._cubemap.fetch({
                    positiveX: `./data/imagebasedlighting/preprocessed-map-px-${mipLevel}.png`,
                    negativeX: `./data/imagebasedlighting/preprocessed-map-nx-${mipLevel}.png`,
                    positiveY: `./data/imagebasedlighting/preprocessed-map-py-${mipLevel}.png`,
                    negativeY: `./data/imagebasedlighting/preprocessed-map-ny-${mipLevel}.png`,
                    positiveZ: `./data/imagebasedlighting/preprocessed-map-pz-${mipLevel}.png`,
                    negativeZ: `./data/imagebasedlighting/preprocessed-map-nz-${mipLevel}.png`,
                }, mipLevel));
        }

        Promise.all(this._promises).then(() => {
            this._isLoaded = true;
            this.hideSpinner();
            this.invalidate(true);
        });

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 5.0);
        this._camera.near = 1.0;
        this._camera.far = 8.0;

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._sphere.uninitialize();
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
    }

    protected onFrame(): void {
        const gl = this._context.gl;

        this._defaultFBO.bind();

        if (!this._isLoaded) {
            this._defaultFBO.clearColor([0.0, 0.0, 0.0, 0.0]);
        } else {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        if (!this._isLoaded) {
            return;
        }

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._albedoTexture.bind(gl.TEXTURE0);
        this._roughnessTexture.bind(gl.TEXTURE1);
        this._metallicTexture.bind(gl.TEXTURE2);
        this._normalTexture.bind(gl.TEXTURE3);
        this._cubemap.bind(gl.TEXTURE4);
        this._brdfLUT.bind(gl.TEXTURE5);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniform3fv(this._uEye, this._camera.eye);

        this._sphere.bind();
        this._sphere.draw();
        this._sphere.unbind();

        this._program.unbind();

        this._albedoTexture.unbind(gl.TEXTURE0);
        this._roughnessTexture.unbind(gl.TEXTURE1);
        this._metallicTexture.unbind(gl.TEXTURE2);
        this._normalTexture.unbind(gl.TEXTURE3);
        this._cubemap.unbind(gl.TEXTURE4);
        this._brdfLUT.unbind(gl.TEXTURE5);

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void { }

    /**
     * Show a spinner that indicates that the example is still loading.
     */
    protected showSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'inline';
    }

    /**
     * Hide the loading spinner.
     */
    protected hideSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'none';
    }
}


export class ImageBasedLightingExample extends Example {

    private _canvas: Canvas;
    private _renderer: ImageBasedLightingRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new ImageBasedLightingRenderer();
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

    get renderer(): ImageBasedLightingRenderer {
        return this._renderer;
    }

}
