
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import {
    Buffer,
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EventProvider,
    Invalidate,
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

const p = Math.sin(Math.PI / 3.0) * 0.5;

export class TriangleRenderer extends Renderer {

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _triangle = new Float32Array([ // x, y, z, u, v
        -0.5, -p, 0.0, 0.0, 0.0,
        +0.5, -p, 0.0, 1.0, 0.0,
        +0.0, +p, 0.0, 0.5, p * 2.0,
    ]);
    protected _vertexLocation: GLuint;
    protected _uvCoordLocation: GLuint;
    protected _buffer: WebGLBuffer;
    protected _texture: Texture2D;

    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;

    protected _defaultFBO: DefaultFramebuffer;


    /**
     * Initializes and sets up buffer, cube geometry, camera and links shaders with program.
     * @param context - valid context to create the object for.
     * @param identifier - meaningful name for identification of this instance.
     * @param mouseEventProvider - required for mouse interaction
     * @returns - whether initialization was successful
     */
    protected onInitialize(context: Context, callback: Invalidate,
        eventProvider: EventProvider): boolean {

        this._defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = context.gl;

        this._buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._triangle, gl.STATIC_DRAW);


        const vert = new Shader(context, gl.VERTEX_SHADER, 'mesh.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'mesh.frag');
        frag.initialize(require('./data/mesh.frag'));


        this._program = new Program(context, 'TriangleProgram');
        this._program.initialize([vert, frag], false);

        this._program.link();
        this._program.bind();

        this._vertexLocation = this._program.attribute('a_vertex', this._vertexLocation);
        this._uvCoordLocation = this._program.attribute('a_texCoord', this._uvCoordLocation);


        gl.vertexAttribPointer(
            this._vertexLocation,   // Attribute Location
            3,                      // Number of elements per attribute
            gl.FLOAT,               // Type of elements
            gl.FALSE,
            5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            0, // Offset from the beginning of a single vertex to this attribute
        );

        gl.vertexAttribPointer(
            this._uvCoordLocation,  // Attribute Location
            2,                      // Number of elements per attribute
            gl.FLOAT,               // Type of elements
            gl.FALSE,
            5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
            3 * Float32Array.BYTES_PER_ELEMENT, // Offset from the beginning of a single vertex to this attribute
        );

        gl.enableVertexAttribArray(this._vertexLocation);
        gl.enableVertexAttribArray(this._uvCoordLocation);


        this._uViewProjection = this._program.uniform('u_viewProjection');
        const identity = mat4.identity(mat4.create());
        gl.uniformMatrix4fv(this._program.uniform('u_model'), gl.FALSE, identity);
        gl.uniform1i(this._program.uniform('u_texture'), 0);
        gl.uniform1i(this._program.uniform('u_textured'), false);


        this._texture = new Texture2D(context, 'Texture');
        this._texture.initialize(1, 1, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE);
        this._texture.wrap(gl.REPEAT, gl.REPEAT);
        this._texture.filter(gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR);
        this._texture.maxAnisotropy(Texture2D.MAX_ANISOTROPY);

        this._texture.fetch('./data/triangle-texture.webp', false).then(() => {
            const gl = context.gl;

            this._program.bind();
            gl.uniform1i(this._program.uniform('u_textured'), true);

            this.finishLoading();
            this.invalidate(true);
        });

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 2.0);
        this._camera.near = 1.0;
        this._camera.far = 4.0;


        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        return true;
    }

    /**
     * Uninitializes buffers, geometry and program.
     */
    protected onUninitialize(): void {
        super.uninitialize();

        this._program.uninitialize();
        this._context.gl.deleteBuffer(this._buffer);

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
        if (this.isLoading) {
            return;
        }

        const gl = this._context.gl;

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._texture.bind(gl.TEXTURE0);

        this._program.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.DEFAULT_BUFFER);

        this._program.unbind();

        this._texture.unbind(gl.TEXTURE0);

    }

    protected onSwap(): void { }

}


export class TriangleExample extends Example {

    private _canvas: Canvas;
    private _renderer: TriangleRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new TriangleRenderer();
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

    get renderer(): TriangleRenderer {
        return this._renderer;
    }

}
