
import { mat4, vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    ForwardSceneRenderPass,
    Framebuffer,
    GeometryComponent,
    Invalidate,
    Material,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    SceneNode,
    Shader,
    Sphere,
    Texture2D,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

// tslint:disable:max-classes-per-file

/**
 * @todo comment
 */
export class SceneRenderer extends Renderer {

    protected _navigation: Navigation;

    protected _forwardPass: ForwardSceneRenderPass;

    protected _camera: Camera;

    protected _scene: SceneNode;

    protected _texture: Texture2D;
    protected _framebuffer: Framebuffer;

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

        this._framebuffer = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._framebuffer.initialize();

        /* Create and configure camera. */

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 2.0);
        this._camera.near = 0.1;
        this._camera.far = 8.0;

        /* Create and configure navigation */

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        /* Create and configure forward pass. */

        this._forwardPass = new ForwardSceneRenderPass(context);
        this._forwardPass.initialize();

        this._forwardPass.camera = this._camera;
        // this._forwardPass.target = this._intermediateFBO;
        this._forwardPass.target = this._framebuffer;

        /* Create scene. */

        this.generateScene();
        this._forwardPass.scene = this._scene;

        /* Will be removed ... */


        /* Create geometry. */
        // if (this._useSphere) {
        //     this._mesh = new Sphere(
        //         this._context,
        //         'mesh',
        //         this._meshSize,
        //         this._textured);
        // } else {
        //     this._mesh = new Box(
        //         this._context,
        //         'mesh',
        //         this._meshSize,
        //         this._meshSize,
        //         this._meshSize,
        //         this._textured);
        // }
        // this._mesh.initialize(this._aMeshVertex, this._aMeshTexCoord);

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
        const gl = this.context.gl;
        // Resize
        if (this._altered.frameSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
            gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
        }
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        // Update clear color
        if (this._altered.clearColor) {
            const c = this._clearColor;
            gl.clearColor(c[0], c[1], c[2], c[3]);
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

        this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        // gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        // gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._meshNode.transform);

        this._forwardPass.frame();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    /**
     * @todo comment ...
     */
    protected onSwap(): void {
    }


    /**
     *  @todo comment
     */
    protected generateScene(): void {
        const gl = this._context.gl;

        /* Create scene */
        this._scene = new SceneNode('root');

        /* Create node with a mesh */
        const meshNode = this._scene.addNode(new SceneNode('mesh'));
        const translate = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0));
        const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.4, 0.4, 0.4));
        const transform = mat4.multiply(mat4.create(), translate, scale);
        meshNode.transform = transform;

        /* Create mesh rendering program. */
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'mesh.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'mesh.frag');
        frag.initialize(require('./data/mesh.frag'));
        const program = new Program(this._context, 'MeshProgram');
        program.initialize([vert, frag]);

        /* Create and load texture. */
        const texture = new Texture2D(this._context, 'Texture');
        texture.initialize(128, 128, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        texture.fetch('./data/logo.png', false).then(() => {
            this.invalidate(true);
        });

        /* Create material */
        const material1 = new SceneExampleMaterial('ExampleMaterial1', program);
        material1.texture = texture;
        material1.textured = true;

        const material2 = new SceneExampleMaterial('ExampleMaterial2', program);
        material2.textured = false;

        /* Create geometry. */
        const geometry = new Sphere(
            this._context,
            'mesh',
            1.0,
            true);

        const aMeshVertex = program.attribute('a_vertex', 0);
        const aMeshTexCoord = program.attribute('a_texcoord', 1);
        geometry.initialize(aMeshVertex, aMeshTexCoord);

        const sphereComponent = new GeometryComponent();
        sphereComponent.geometry = geometry;
        sphereComponent.material = material1;

        meshNode.addComponent(sphereComponent);

        const meshNode2 = this._scene.addNode(new SceneNode('mesh2'));
        const translate2 = mat4.fromTranslation(mat4.create(), vec3.fromValues(1.0, 0.0, 0.0));
        const scale2 = mat4.fromScaling(mat4.create(), vec3.fromValues(0.2, 0.2, 0.2));
        const transform2 = mat4.multiply(mat4.create(), translate2, scale2);
        meshNode2.transform = transform2;

        const sphereComponent2 = new GeometryComponent();
        sphereComponent2.geometry = geometry;
        sphereComponent2.material = material2;

        meshNode2.addComponent(sphereComponent2);
    }
}

export class SceneExampleMaterial extends Material {

    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uTexture: WebGLUniformLocation;
    protected _uTextured: WebGLUniformLocation;

    protected _texture: Texture2D | undefined;
    protected _textured: boolean;

    constructor(name: string, program: Program) {
        super(name, program);

        this._uViewProjection = program.uniform('u_viewProjection');
        this._uModel = program.uniform('u_model');
        this._uTexture = program.uniform('u_texture');
        this._uTextured = program.uniform('u_textured');
    }

    set texture(texture: Texture2D) {
        this._texture = texture;
    }

    set textured(value: boolean) {
        this._textured = value;
    }

    bind(): void {
        const gl = this.program.context.gl;

        this.program.bind();

        if (this._textured) {
            this._texture!.bind(gl.TEXTURE0);
            gl.uniform1i(this._uTexture, 0);
        }

        gl.uniform1i(this._uTextured, this._textured);
    }

    unbind(): void {
        this.program.unbind();
    }
}

export class SceneExample extends Example {

    private _canvas: Canvas;
    private _renderer: SceneRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new SceneRenderer();
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

    get renderer(): SceneRenderer {
        return this._renderer;
    }

}
