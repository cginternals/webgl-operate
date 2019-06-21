
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    CuboidGeometry,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
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

export class CubeRenderer extends Renderer {

    // Camera and navigation
    protected _camera: Camera;
    protected _navigation: Navigation;

    // Cubes
    protected _geometry: CuboidGeometry;
    protected _program: Program;

    protected _texture: Texture2D;

    protected _uViewProjection: WebGLUniformLocation;

    // FBO
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

        // Create framebuffers, textures, and render buffers.
        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const { gl } = this._context;

        // init cuboid geometry
        this._geometry = new CuboidGeometry(this._context, 'Cuboid', true, [2.0, 2.0, 2.0]);
        this._geometry.initialize();

        // Initialize program
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'cube.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'cube.frag');
        frag.initialize(require('./data/mesh.frag'));

        this._program = new Program(this._context, 'CubeProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._geometry.vertexLocation);
        this._program.attribute('a_texCoord', this._geometry.uvCoordLocation);
        this._program.link();
        this._program.bind();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        const identity = mat4.identity(mat4.create());
        gl.uniformMatrix4fv(this._program.uniform('u_model'), gl.FALSE, identity);
        gl.uniform1i(this._program.uniform('u_texture'), 0);
        gl.uniform1i(this._program.uniform('u_textured'), false);

        // Create and load texture.
        this._texture = new Texture2D(this._context, 'Texture');
        this._texture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._texture.wrap(gl.REPEAT, gl.REPEAT);
        this._texture.fetch('./data/blue_painted_planks_diff_1k_modified.webp', false).then(() => {

            const gl = this._context.gl;

            this._texture.bind(gl.TEXTURE0);

            if (this._context.supportsTextureFilterAnisotropic) {
                const ext = this._context.textureFilterAnisotropic;
                const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
            }
            gl.generateMipmap(gl.TEXTURE_2D);

            this._texture.wrap(gl.REPEAT, gl.REPEAT, false, false);
            this._texture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR, false, false);


            this._program.bind();
            gl.uniform1i(this._program.uniform('u_textured'), true);

            this.invalidate(true);
        });

        // Initialize camera
        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 5.0);
        this._camera.near = 0.1;
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

        this._geometry.uninitialize();
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

        this._texture.bind(gl.TEXTURE0);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        this._geometry.bind();
        this._geometry.draw();
        this._geometry.unbind();

        this._program.unbind();

        this._texture.unbind(gl.TEXTURE0);

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void { }

}


export class CubeExample extends Example {

    private _canvas: Canvas;
    private _renderer: CubeRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new CubeRenderer();
        this._canvas.renderer = this._renderer;

        return true;
    }

    uninitialize(): void {
        this._canvas.dispose();
        this._renderer.uninitialize();
    }

    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): CubeRenderer {
        return this._renderer;
    }

}
