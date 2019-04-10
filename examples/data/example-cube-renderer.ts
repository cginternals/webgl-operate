
import { vec3 } from 'gl-matrix';

import {
    Camera,
    Context,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    Shader,
} from 'webgl-operate';

import { ExampleCube } from './example-cube-geometry';

const _gCenter = vec3.fromValues(0.0, 0.0, 0.0);
const _gUp = vec3.fromValues(0.0, 1.0, 0.0);

export class CubeRenderer extends Renderer {

    // Camera and navigation
    protected _camera: Camera;
    protected _navigation: Navigation;

    // Cubes
    protected _cube: ExampleCube;
    protected _cubeProgram: Program;
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

        // Initialize program
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'cube-vert');
        vert.initialize(ExampleCube.VERTEX_SHADER_SOURCE);
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'cube-frag');
        frag.initialize(ExampleCube.FRAGMENT_SHADER_SOURCE);

        this._cubeProgram = new Program(this._context, 'cube-program');
        this._cubeProgram.initialize([vert, frag], false);

        // Initialize cube geometry
        this._cube = new ExampleCube(this._context, 'example-cube');
        this._cube.initialize(0);
        this._cube.bind();

        this._cubeProgram.attribute('a_vertex', 0);
        this._cubeProgram.link();
        this._cubeProgram.bind();

        this._uViewProjection = this._cubeProgram.uniform('u_viewProjection');

        // Initialize camera
        this._camera = new Camera();
        this._camera.center = _gCenter;
        this._camera.up = _gUp;
        this._camera.eye = vec3.fromValues(0.0, 0.0, -4.0);

        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._cube.uninitialize();
        this._cubeProgram.uninitialize();

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
        const { gl } = this._context;

        gl.viewport(0, 0, this._camera.viewport[0], this._camera.viewport[1]);
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        this._cube.draw();
    }

}
