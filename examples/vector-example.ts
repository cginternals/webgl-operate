import {
    auxiliaries,
    Buffer,
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EventProvider,
    FontFace,
    Invalidate,
    LabelRenderPass,
    Navigation,
    Label,
    Position3DLabel,
    Projected3DLabel,
    Renderer,
    Program,
    Shader,
    Text,
    Wizard,
} from '../../webgl-operate';

import { vec3 } from 'gl-matrix';
import { Example } from './example';

class VectorRenderer extends Renderer {

    protected _defaultFBO: DefaultFramebuffer;

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _fontFace: FontFace;

    protected _points: Float32Array;
    protected _lines: Float32Array;
    protected _labels: Array<Label>;

    protected _pointsBuffer: WebGLBuffer;
    protected _pointsProgram: Program;
    protected _linesBuffer: WebGLBuffer;
    protected _linesProgram: Program;

    protected _labelPass: LabelRenderPass;

    protected onInitialize(context: Context, callback: Invalidate,
        eventProvider: EventProvider): boolean {

        const gl = this._context.gl;

        /* Create render buffer */

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        /* create shader programs */

        // points

        // points data
        // @TODO: do not hard code this
        this._points = new Float32Array([ // x, y, z, r, g, b, data,
            -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, Math.random() * 16 + 4.0,
            -1.0, -1.0, +1.0, 0.0, 0.0, 1.0, Math.random() * 16 + 4.0,
            -1.0, +1.0, -1.0, 0.0, 1.0, 0.0, Math.random() * 16 + 4.0,
            -1.0, +1.0, +1.0, 0.0, 1.0, 1.0, Math.random() * 16 + 4.0,
            +1.0, -1.0, -1.0, 1.0, 0.0, 0.0, Math.random() * 16 + 4.0,
            +1.0, -1.0, +1.0, 1.0, 0.0, 1.0, Math.random() * 16 + 4.0,
            +1.0, +1.0, -1.0, 1.0, 1.0, 0.0, Math.random() * 16 + 4.0,
            +1.0, +1.0, +1.0, 1.0, 1.0, 1.0, Math.random() * 16 + 4.0,
        ]);

        this._pointsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._pointsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._points, gl.STATIC_DRAW);

        // setup point shaders

        const pointsVert = new Shader(this._context, gl.VERTEX_SHADER, 'points.vert');
        pointsVert.initialize(require('./data/points.vert'));
        const pointsFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'points.frag');
        pointsFrag.initialize(require('./data/points.frag'));

        this._pointsProgram = new Program(this._context, "PointsProgram");
        this._pointsProgram.initialize([pointsVert, pointsFrag], false);

        this._pointsProgram.link();
        this._pointsProgram.bind();

        this._pointsProgram.attribute('a_vertex', 0);
        this._pointsProgram.attribute('a_color', 1);
        this._pointsProgram.attribute('a_size', 2);

        // lines

        // lines data
        // @TODO: do not hard code this
        this._lines = new Float32Array([ // x, y, z, r, g, b,
            -2.0, -1.1, -1.1, 1.0, 0.0, 1.0,
            +2.0, -1.1, -1.1, 1.0, 0.0, 1.0,
            -1.1, -2.0, -1.1, 1.0, 1.0, 0.0,
            -1.1, +2.0, -1.1, 1.0, 1.0, 0.0,
            -1.1, -1.1, -2.0, 0.0, 1.0, 1.0,
            -1.1, -1.1, +2.0, 0.0, 1.0, 1.0,
        ]);

        this._linesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._linesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._lines, gl.STATIC_DRAW);

        // setup line shaders

        const linesVert = new Shader(this._context, gl.VERTEX_SHADER, 'lines.vert');
        linesVert.initialize(require('./data/lines.vert'));
        const linesFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'lines.frag');
        linesFrag.initialize(require('./data/lines.frag'));

        this._linesProgram = new Program(this._context, "LinesProgram");
        this._linesProgram.initialize([linesVert, linesFrag], false);

        this._linesProgram.link();
        this._linesProgram.bind();

        this._linesProgram.attribute('a_vertex', 0);
        this._linesProgram.attribute('a_color', 1);

        /* Create and configure camera / navigation. */

        this._camera = new Camera();

        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 4.0);
        this._camera.near = 0.1;
        this._camera.far = 16.0;

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        /* Create and configure label pass. */
        this._labelPass = new LabelRenderPass(context);
        this._labelPass.initialize();
        this._labelPass.camera = this._camera;
        this._labelPass.target = this._defaultFBO;
        this._labelPass.depthMask = true;

        // setup labels after font successfully loaded

        FontFace.fromFile('./data/opensans2048p160d16.fnt', context)
            .then((fontFace) => {
                this.setupLabels();

                for (const label of this._labelPass.labels) {
                    label.fontFace = fontFace;
                }
                this._fontFace = fontFace;

                this.finishLoading();
                this.invalidate(true);
            })
            .catch((reason) => auxiliaries.log(auxiliaries.LogLevel.Error, reason));

        return true;
    }

    protected onUninitialize(): void {

        const gl = this._context.gl;

        super.uninitialize();

        this._defaultFBO.uninitialize();

        gl.deleteBuffer(this._pointsBuffer);
        this._pointsProgram.uninitialize();

        gl.deleteBuffer(this._linesBuffer);
        this._linesProgram.uninitialize();

        this._labelPass.uninitialize();
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
        this._altered.alter('clearColor');
        this._altered.alter('frameSize');
        this._altered.alter('multiFrameNumber');
    }

    // @TODO understand if more update checks are needed
    protected onUpdate(): boolean {
        this._navigation.update();

        for (const label of this._labelPass.labels) {
            if (label.altered || label.color.altered) {
                return true;
            }
        }

        return this._altered.any || this._camera.altered;
    }

    protected onPrepare(): void {

        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
            this._camera.viewport = this._canvasSize;
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._labelPass.update();

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {

        const gl = this._context.gl;

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.DEPTH_TEST);

        // render points

        this._pointsProgram.bind();
        gl.uniformMatrix4fv(this._pointsProgram.uniform('u_viewProjection'),
            gl.GL_FALSE, this._camera.viewProjection);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._pointsBuffer);

        // refer to https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer for more information

        gl.vertexAttribPointer(0, 3, gl.FLOAT, gl.FALSE,
            7 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, gl.FALSE,
            7 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, gl.FALSE,
            7 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);

        gl.drawArrays(gl.POINTS, 0, this._points.length / 7);
        gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.DEFAULT_BUFFER);

        gl.disableVertexAttribArray(0);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);

        this._pointsProgram.unbind();

        // render lines

        this._linesProgram.bind();
        gl.uniformMatrix4fv(this._linesProgram.uniform('u_viewProjection'),
            gl.GL_FALSE, this._camera.viewProjection);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._linesBuffer);

        // refer to https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer for more information

        gl.vertexAttribPointer(0, 3, gl.FLOAT, gl.FALSE,
            6 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, gl.FALSE,
            6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);

        gl.drawArrays(gl.LINES, 0, this._lines.length / 6);
        gl.bindBuffer(gl.ARRAY_BUFFER, Buffer.DEFAULT_BUFFER);

        gl.disableVertexAttribArray(0);
        gl.disableVertexAttribArray(1);

        this._linesProgram.unbind();


        // render labels
        // @TODO dynamic updates needed?
        this._labelPass.update();
        this._labelPass.frame();
        this._labelPass.unbind();
    }

    protected setupLabels(): void {
        var labels = new Array(3);

        labels[0] = new Position3DLabel(new Text('Scatterplot'), Label.Type.Static);
        labels[0].lineAnchor = Label.LineAnchor.Bottom;
        labels[0].alignment = Label.Alignment.Center;
        labels[0].position = [0.0, 0.0, 0.0];
        labels[0].direction = [1.0, 1.0, -1.0];
        labels[0].up = [-1.5, 0.5, -1.0];
        labels[0].fontSize = 0.3;
        labels[0].fontSizeUnit = Label.Unit.World;
        labels[0].color.fromHex('#ffffff');

        labels[1] = new Position3DLabel(new Text('3D'), Label.Type.Static);
        labels[1].lineAnchor = Label.LineAnchor.Top;
        labels[1].alignment = Label.Alignment.Center;
        labels[1].position = [-0.1, 0.2, 0.0];
        labels[1].direction = [1.0, 1.0, -1.0];
        labels[1].up = [-0.5, 1.5, +1.0];
        labels[1].fontSize = 1.2;
        labels[1].fontSizeUnit = Label.Unit.World;
        labels[1].color.fromHex('#888888');

        labels[2] = new Position3DLabel(new Text('Probably the x-Axis'), Label.Type.Static);
        labels[2].lineAnchor = Label.LineAnchor.Bottom;
        labels[2].alignment = Label.Alignment.Center;
        labels[2].position = [0.0, -1.1, -1.1];
        labels[2].up = [0.0, 0.0, -1.0];
        labels[2].direction = [1.0, 0.0, 0.0];
        labels[2].fontSize = 0.2;
        labels[2].fontSizeUnit = Label.Unit.World;
        labels[2].color.fromHex('#ff00ff');

        labels[3] = new Projected3DLabel(new Text('   Point'), Label.Type.Dynamic);
        labels[3].lineAnchor = Label.LineAnchor.Bottom;
        labels[3].alignment = Label.Alignment.Left;
        labels[3].position = [-1.0, +1.0, +1.0];
        labels[3].fontSize = 16.0;
        labels[3].fontSizeUnit = Label.Unit.Mixed;
        labels[3].color.fromHex('#00ffff');

        this._labelPass.labels = labels;
        this._labelPass.update();

        this._labels = labels;
    }

}

export class VectorExample extends Example {

    private _canvas: Canvas;
    private _renderer: VectorRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });

        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new VectorRenderer();
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

    get renderer(): VectorRenderer {
        return this._renderer;
    }
}
