
/* spellchecker: disable */

import { mat4, vec2, vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    GeosphereGeometry,
    Invalidate,
    MouseEventProvider,
    Navigation,
    PlaneGeometry,
    Program,
    Renderer,
    Shader,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class AreaLightRenderer extends Renderer {

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _plane: PlaneGeometry;
    protected _lightSphere: GeosphereGeometry;

    protected _roughness: number;

    protected _lightPosition: vec3;

    protected _albedoTexture: Texture2D;
    protected _roughnessTexture: Texture2D;
    protected _metallicTexture: Texture2D;
    protected _normalTexture: Texture2D;

    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uRoughness: WebGLUniformLocation;

    protected _lightProgram: Program;
    protected _uViewProjectionLight: WebGLUniformLocation;

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

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl;

        this._roughness = 0.5;

        this._plane = new PlaneGeometry(context, 'Plane');
        this._plane.initialize();
        this._plane.scale = vec2.fromValues(3.0, 3.0);

        this._lightSphere = new GeosphereGeometry(context, 'LightSphere', 0.25);
        this._lightSphere.initialize();

        this._lightPosition = vec3.fromValues(0.0, 0.5, 0.0);

        const vert = new Shader(context, gl.VERTEX_SHADER, 'mesh.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'arealight/mesh.frag');
        frag.initialize(require('./data/arealight/mesh.frag'));

        this._program = new Program(context, 'AreaLightProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._plane.vertexLocation);
        this._program.attribute('a_texCoord', this._plane.texCoordLocation);
        this._program.link();
        this._program.bind();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uModel = this._program.uniform('u_model');
        this._uEye = this._program.uniform('u_eye');
        this._uRoughness = this._program.uniform('u_roughness');

        gl.uniform1i(this._program.uniform('u_albedoTexture'), 0);
        gl.uniform1i(this._program.uniform('u_roughnessTexture'), 1);
        gl.uniform1i(this._program.uniform('u_metallicTexture'), 2);
        gl.uniform1i(this._program.uniform('u_normalTexture'), 3);

        gl.uniformMatrix4fv(this._program.uniform('u_model'), gl.FALSE, this._plane.transformation);

        // Program for rendering the light source
        const lightFrag = new Shader(context, gl.FRAGMENT_SHADER, 'light.frag');
        lightFrag.initialize(require('./data/arealight/light.frag'));

        this._lightProgram = new Program(context, 'LightProgram');
        this._lightProgram.initialize([vert, lightFrag], false);

        this._lightProgram.attribute('a_vertex', this._lightSphere.vertexLocation);
        this._lightProgram.link();
        this._lightProgram.bind();

        const m = mat4.create();
        gl.uniformMatrix4fv(this._lightProgram.uniform('u_model'), gl.FALSE, mat4.translate(m, m, this._lightPosition));
        this._uViewProjectionLight = this._lightProgram.uniform('u_viewProjection');

        /**
         * Textures taken from https://3dtextures.me/2018/11/19/metal-001/ and modified
         */
        this._albedoTexture = new Texture2D(context, 'AlbedoTexture');
        this._albedoTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._albedoTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._albedoTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._albedoTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);

        this._albedoTexture.fetch('./data/imagebasedlighting/Metal_001_basecolor.png', false).then(() => {
            const gl = context.gl;

            this._program.bind();
            gl.uniform1i(this._program.uniform('u_textured'), true);

            this.invalidate(true);
        });

        this._roughnessTexture = new Texture2D(context, 'RoughnessTexture');
        this._roughnessTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._roughnessTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._roughnessTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._roughnessTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);
        this._roughnessTexture.fetch('./data/imagebasedlighting/Metal_001_roughness.png', false);

        this._metallicTexture = new Texture2D(context, 'MetallicTexture');
        this._metallicTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._metallicTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._metallicTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._metallicTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);
        this._metallicTexture.fetch('./data/imagebasedlighting/Metal_001_metallic.png', false);

        this._normalTexture = new Texture2D(context, 'NormalTexture');
        this._normalTexture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._normalTexture.wrap(gl.REPEAT, gl.REPEAT);
        this._normalTexture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._normalTexture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);
        this._normalTexture.fetch('./data/imagebasedlighting/Metal_001_normal.png', false);

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 2.0, 3.0);
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

        this._plane.uninitialize();
        this._lightSphere.uninitialize();
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
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._albedoTexture.bind(gl.TEXTURE0);
        this._roughnessTexture.bind(gl.TEXTURE1);
        this._metallicTexture.bind(gl.TEXTURE2);
        this._normalTexture.bind(gl.TEXTURE3);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniform3fv(this._uEye, this._camera.eye);
        gl.uniform1f(this._uRoughness, this._roughness);

        this._plane.bind();
        this._plane.draw();
        this._plane.unbind();

        this._albedoTexture.unbind(gl.TEXTURE0);
        this._roughnessTexture.unbind(gl.TEXTURE1);
        this._metallicTexture.unbind(gl.TEXTURE2);
        this._normalTexture.unbind(gl.TEXTURE3);

        this._program.unbind();

        // Render light source
        this._lightProgram.bind();
        gl.uniformMatrix4fv(this._uViewProjectionLight, gl.GL_FALSE, this._camera.viewProjection);

        this._lightSphere.bind();
        this._lightSphere.draw();
        this._lightSphere.unbind();

        this._lightProgram.unbind();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void { }

}


export class AreaLightExample extends Example {

    private _canvas: Canvas;
    private _renderer: AreaLightRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new AreaLightRenderer();
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

    get renderer(): AreaLightRenderer {
        return this._renderer;
    }

}
