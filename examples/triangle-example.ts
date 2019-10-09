
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import {
    Buffer,
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Program,
    Renderer,
    Shader,
    Texture2D,
    VertexArray,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

/* spellchecker: enable */


// tslint:disable:max-classes-per-file

export class TriangleRenderer extends Renderer {

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _triangle: Float32Array;
    protected _vertexLocation: GLuint;
    protected _uvCoordLocation: GLuint;
    protected _vertexArray: VertexArray;
    protected _buffers = new Array<Buffer>();
    protected _count: GLsizei;
    protected _texture: Texture2D;

    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation;

    protected _defaultFBO: DefaultFramebuffer;


    /**
     * Binds all buffer object(s) to their associated attribute binding points (pre-defined index/indices). This
     * function is passed to the initialization of this geometries vertex array object.
     * @param indices - Indices passed on geometry initialization by inheritor (sequence as in buffers).
     */
    protected bindBuffers(indices: Array<GLuint>): void {
        this._buffers[0].attribEnable(this._vertexLocation, 3, this._vertexArray.context.gl.FLOAT,
            false, 5 * 4, 0, true, false);
        this._buffers[0].attribEnable(this._uvCoordLocation, 2, this._vertexArray.context.gl.FLOAT,
            false, 5 * 4, 3 * 4, false, false);
    }

    /**
     * Unbinds all buffer objects and disables their binding points. This function is passed to the uninitialization
     * of this geometries vertex array object.
     * @param indices - Indices passed on geometry initialization by inheritor (sequence as in buffers).
     */
    protected unbindBuffers(indices: Array<GLuint>): void {
        this._buffers[0].attribDisable(this._vertexLocation, true, true);
        this._buffers[0].attribDisable(this._uvCoordLocation, false, true);
        this._buffers[1].unbind();
    }


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

        this._triangle = new Float32Array([0.0, -1.0, 0.0,
            1.0, 1.0, 0.0,
            1.0, -1.0, 0.0]);
        const identifier = 'triangle-example';
        this._vertexArray = new VertexArray(context, identifier + 'VAO');
        const vertexVBO = new Buffer(context, identifier + 'VBO');
        const indexBuffer = new Buffer(context, identifier + 'IndicesVBO');
        this._buffers.push(vertexVBO);
        this._buffers.push(indexBuffer);
        // this._cuboid = new CuboidGeometry(context, 'Cuboid', true, [2.0, 2.0, 2.0]);


        // this._cuboid.initialize();
        this._vertexLocation = 0;
        this._uvCoordLocation = 1;
        let valid = true;
        const targets: Array<GLenum> = [gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER];
        const indices: Array<GLuint> = [this._vertexLocation, this._uvCoordLocation];
        for (let i = 0; i < this._buffers.length; ++i) {
            valid = valid && this._buffers[i].initialize(targets[i]);
        }

        this._vertexArray.initialize(() => this.bindBuffers(indices), () => this.unbindBuffers(indices));
        this._buffers[0].data(this._triangle, gl.STATIC_DRAW);
        this._buffers[1].data(new Uint8Array([0, 1, 2]), gl.STATIC_DRAW);
        this._count = 3;

        const vert = new Shader(context, gl.VERTEX_SHADER, 'mesh.vert');
        vert.initialize(require('./data/mesh.vert'));
        const frag = new Shader(context, gl.FRAGMENT_SHADER, 'mesh.frag');
        frag.initialize(require('./data/mesh.frag'));


        this._program = new Program(context, 'TriangleProgram');
        this._program.initialize([vert, frag], false);

        // this._program.attribute('a_vertex', this._cuboid.vertexLocation);
        // this._program.attribute('a_texCoord', this._cuboid.uvCoordLocation);

        this._program.attribute('a_vertex', this._vertexLocation);
        this._program.attribute('a_texCoord', this._uvCoordLocation);
        this._program.link();
        this._program.bind();


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

        this._texture.fetch('./data/blue_painted_planks_diff_1k_modified.webp', false).then(() => {
            const gl = context.gl;

            this._program.bind();
            // TODO add texture
            // gl.uniform1i(this._program.uniform('u_textured'), true);
            gl.uniform1i(this._program.uniform('u_textured'), false);

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

        // this._cuboid.uninitialize();
        this._vertexArray.uninitialize();
        this._buffers.forEach((buffer) => buffer.uninitialize());
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

        // this._cuboid.bind();
        // this._cuboid.draw();
        // this._cuboid.unbind();

        // this._vertexArray.bind();
        console.log("onFrame");
        // gl.drawElements(gl.TRIANGLE_STRIP, this._count, gl.UNSIGNED_BYTE, 0);
        // this._vertexArray.unbind();

        this._program.unbind();

        this._texture.unbind(gl.TEXTURE0);

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

    protected onSwap(): void { }

}


export class TriangleExample extends Example {

    private _canvas: Canvas;
    private _renderer: TriangleRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new TriangleRenderer();
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

    get renderer(): TriangleRenderer {
        return this._renderer;
    }

}
