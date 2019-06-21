
import { mat4, vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    CuboidGeometry,
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
    GeosphereGeometry,
    Texture2D,
    TransformComponent,
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
    protected _program: Program;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;

    protected _aMeshVertex: GLint;
    protected _aMeshTexCoord: GLint;

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

        this._framebuffer = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._framebuffer.initialize();

        /* Create mesh rendering program. */
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'mesh.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'mesh.frag');
        frag.initialize(require('./data/mesh.frag'));
        this._program = new Program(this._context, 'MeshProgram');
        this._program.initialize([vert, frag]);

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uModel = this._program.uniform('u_model');

        this._aMeshVertex = this._program.attribute('a_vertex', 0);
        this._aMeshTexCoord = this._program.attribute('a_texCoord', 1);

        /* Create and configure camera. */

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 3.0);
        this._camera.near = 0.1;
        this._camera.far = 8.0;

        /* Create and configure navigation */

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        /* Create and configure forward pass. */

        this._forwardPass = new ForwardSceneRenderPass(context);
        this._forwardPass.initialize();

        this._forwardPass.camera = this._camera;
        this._forwardPass.target = this._framebuffer;

        /* Create scene. */

        this.generateScene();

        this._forwardPass.scene = this._scene;
        this._forwardPass.program = this._program;
        this._forwardPass.updateModelTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, matrix);
        };
        this._forwardPass.updateViewProjectionTransform = (matrix: mat4) => {
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, matrix);
        };

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

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

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
        this._scene = new SceneNode('root');

        this.generateSphere1Node(this._scene);
        this.generateSphere2Node(this._scene);
        this.generateBoxNode(this._scene);
    }

    protected generateSphere1Node(parent: SceneNode): SceneNode {
        const gl = this._context.gl;

        /* Create node and transform */
        const node = parent.addNode(new SceneNode('mesh'));
        const translate = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0));
        const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.4, 0.4, 0.4));
        const transformMatrix = mat4.multiply(mat4.create(), translate, scale);

        const transform = new TransformComponent(transformMatrix);
        node.addComponent(transform);

        /* Create and load texture. */
        const texture = new Texture2D(this._context, 'Texture');
        texture.initialize(128, 128, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        texture.wrap(gl.REPEAT, gl.REPEAT);
        texture.fetch('./data/concrete_floor_02_diff_1k.webp', false).then(() => {
            this.invalidate(true);
        });

        /* Create material */
        const material = new SceneExampleMaterial('ExampleMaterial1', this._program);
        material.texture = texture;
        material.textured = true;

        /* Create geometry. */
        const geometry = new GeosphereGeometry(
            this._context,
            'mesh',
            1.0,
            true);

        geometry.initialize(this._aMeshVertex, this._aMeshTexCoord);

        const sphere = new GeometryComponent();
        sphere.geometry = geometry;
        sphere.material = material;

        node.addComponent(sphere);

        return node;
    }

    protected generateSphere2Node(parent: SceneNode): SceneNode {
        /* Create node and transform */
        const node = parent.addNode(new SceneNode('mesh'));
        const translate = mat4.fromTranslation(mat4.create(), vec3.fromValues(1.0, 0.0, 0.0));
        const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.4, 0.4, 0.4));
        const transformMatrix = mat4.multiply(mat4.create(), translate, scale);

        const transform = new TransformComponent(transformMatrix);
        node.addComponent(transform);

        /* Create material */
        const material = new SceneExampleMaterial('ExampleMaterial2', this._program);
        material.textured = false;

        /* Create geometry. */
        const geometry = new GeosphereGeometry(
            this._context,
            'mesh',
            1.0,
            true);

        geometry.initialize(this._aMeshVertex, this._aMeshTexCoord);

        const sphere = new GeometryComponent();
        sphere.geometry = geometry;
        sphere.material = material;

        node.addComponent(sphere);

        return node;
    }

    protected generateBoxNode(parent: SceneNode): SceneNode {
        /* Create node and transform */
        const node = parent.addNode(new SceneNode('mesh'));
        const translate = mat4.fromTranslation(mat4.create(), vec3.fromValues(-1.0, 0.0, 0.0));
        const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.5, 0.5, 0.5));
        const transformMatrix = mat4.multiply(mat4.create(), translate, scale);

        const transform = new TransformComponent(transformMatrix);
        node.addComponent(transform);

        /* Create material */
        const material = new SceneExampleMaterial('ExampleMaterial3', this._program);
        material.textured = false;

        /* Create geometry. */
        const geometry = new CuboidGeometry(this._context, 'mesh', true);

        geometry.initialize(this._aMeshVertex, this._aMeshTexCoord);

        const box = new GeometryComponent();
        box.geometry = geometry;
        box.material = material;

        node.addComponent(box);

        return node;
    }
}

export class SceneExampleMaterial extends Material {

    protected _uTexture: WebGLUniformLocation;
    protected _uTextured: WebGLUniformLocation;

    protected _texture: Texture2D | undefined;
    protected _textured: boolean;

    constructor(name: string, program: Program) {
        super(name, program);

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
