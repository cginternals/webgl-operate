
import { assert } from './auxiliaries';

import { mat4, vec3 } from 'gl-matrix';

import { AccumulatePass } from './accumulatepass';
import { AntiAliasingKernel } from './antialiasingkernel';
import { BlitPass } from './blitpass';
import { Camera } from './camera';
import { Context } from './context';
import { DefaultFramebuffer } from './defaultframebuffer';
import { Framebuffer } from './framebuffer';
import { MouseEventProvider } from './mouseeventprovider';
import { Navigation } from './navigation';
import { Program } from './program';
import { Renderbuffer } from './renderbuffer';
import { Invalidate, Renderer } from './renderer';
import { Shader } from './shader';
import { Texture2 } from './texture2';

import { FontFace } from './fontface';
import { FontLoader } from './fontloader';
import { LabelGeometry } from './labelgeometry';
import { Position2DLabel } from './position2dlabel';
import { Position3DLabel } from './position3dlabel';
import { Text } from './text';

import { TestNavigation } from './debug/testnavigation';


/**
 * This is ugly, but it should do the trick for now:
 * Later, we want to have a labelrenderpass and a labelpositionpass.
 * The first one bakes the geometry, the second one adapts the placement regarding dynamic placement algorithms.
 * For now, we will have both as a labelrenderer, and split it up later.
 */
export class LabelRenderer extends Renderer {

    protected _extensions = false;
    protected _program: Program;

    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uFrameNumber: WebGLUniformLocation;

    protected _accumulate: AccumulatePass;
    protected _blit: BlitPass;

    protected _camera: Camera;
    protected _uViewProjection: WebGLUniformLocation;

    protected _defaultFBO: DefaultFramebuffer;
    protected _colorRenderTexture: Texture2;
    protected _depthRenderbuffer: Renderbuffer;
    protected _intermediateFBO: Framebuffer;

    protected _testNavigation: TestNavigation;
    protected _navigation: Navigation;

    protected _fontFace: FontFace;
    protected _2DLabelGeometry: LabelGeometry;
    protected _3DLabelGeometry: LabelGeometry;
    protected _uGlyphAtlas: WebGLUniformLocation;

    protected onInitialize(context: Context, callback: Invalidate,
        mouseEventProvider: MouseEventProvider,
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {

        this.loadFont(context);

        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        /* Enable required extensions. */

        if (this._extensions === false && this._context.isWebGL1) {
            assert(this._context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this._context.standardDerivatives;
            this._extensions = true;
        }

        /* Create and configure program and geometry. */

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'glyphquad.vert');
        vert.initialize(require('./shaders/glyphquad.vert'));

        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'glyphquad.frag');
        frag.initialize(require('./shaders/glyphquad.frag'));

        this._program = new Program(this._context);
        this._program.initialize([vert, frag]);

        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uFrameNumber = this._program.uniform('u_frameNumber');
        this._uViewProjection = this._program.uniform('u_viewProjection');

        this._uGlyphAtlas = this._program.uniform('u_glyphs');

        this._2DLabelGeometry = new LabelGeometry(this._context);
        this._3DLabelGeometry = new LabelGeometry(this._context);
        const aVertex = this._program.attribute('a_quadVertex', 0);
        const aTexCoord = this._program.attribute('a_texCoord', 1);
        const aOrigin = this._program.attribute('a_origin', 2);
        const aTan = this._program.attribute('a_tan', 3);
        const aUp = this._program.attribute('a_up', 4);

        this._2DLabelGeometry.initialize(aVertex, aTexCoord, aOrigin, aTan, aUp);
        this._3DLabelGeometry.initialize(aVertex, aTexCoord, aOrigin, aTan, aUp);

        this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);

        /* Create framebuffers, textures, and render buffers. */

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        this._colorRenderTexture = new Texture2(this._context, 'ColorRenderTexture');
        this._depthRenderbuffer = new Renderbuffer(this._context, 'DepthRenderbuffer');

        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');

        /* Create and configure accumulation pass. */

        this._accumulate = new AccumulatePass(this._context);
        this._accumulate.initialize();
        this._accumulate.precision = this._framePrecision;
        this._accumulate.texture = this._colorRenderTexture;
        // this._accumulate.depthStencilAttachment = this._depthRenderbuffer;

        /* Create and configure blit pass. */

        this._blit = new BlitPass(this._context);
        this._blit.initialize();
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;

        /* Create and configure test navigation. */

        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 2.0);
        this._camera.near = 0.1;
        this._camera.far = 8.0;

        /* Initialize navigation */
        this._navigation = new Navigation(callback, mouseEventProvider);
        this._navigation.camera = this._camera;

        return true;
    }

    protected onUninitialize(): void {
        super.uninitialize();

        this._uNdcOffset = -1;
        this._uFrameNumber = -1;
        this._uGlyphAtlas = -1;
        this._program.uninitialize();

        this._2DLabelGeometry.uninitialize();
        this._3DLabelGeometry.uninitialize();

        this._intermediateFBO.uninitialize();
        this._defaultFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();

        this._blit.uninitialize();
    }


    protected onUpdate(): boolean {

        this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);

        this._navigation.update();

        return this._altered.any || this._camera.altered;
    }

    protected onPrepare(): void {

        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        if (!this._intermediateFBO.initialized) {
            this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);

            this._camera.aspect = this._frameSize[0] / this._frameSize[1];

        } else if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
            this._camera.aspect = this._frameSize[0] / this._frameSize[1];
            /** @todo
             * update the geometry of the labels that use pt sizes (e.g. labels in screen space)
             * and/or update: labels that get too small (to be readable) should not be rendered anymore
             * (a.k.a. threshold for readability)
             */
            // this.setupScene();
        }

        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel.width = this._multiFrameNumber;
        }

        if (this._altered.framePrecision) {
            this._accumulate.precision = this._framePrecision;
        }

        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
        }

        this._accumulate.update();

        if (this._camera.altered) {
            this._program.bind();
            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
            this._program.unbind();
        }

        this._altered.reset();
        this._camera.altered = false;
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
        this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

        let wasBlendEnabled = false;
        const oldBlendSRC: any = gl.getParameter(gl.BLEND_SRC_RGB);
        const oldBlendDST: any = gl.getParameter(gl.BLEND_DST_RGB);

        wasBlendEnabled = gl.isEnabled(gl.BLEND);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this._program.bind();

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];
        gl.uniform2fv(this._uNdcOffset, ndcOffset);
        gl.uniform1i(this._uFrameNumber, frameNumber);

        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        this._fontFace.glyphTexture.bind(gl.TEXTURE0);
        gl.uniform1i(this._uGlyphAtlas, 0);

        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT, true, false);

        this._3DLabelGeometry.bind();
        this._3DLabelGeometry.draw();
        this._3DLabelGeometry.unbind();

        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, mat4.create());

        this._2DLabelGeometry.bind();
        this._2DLabelGeometry.draw();
        this._2DLabelGeometry.unbind();

        this._intermediateFBO.unbind();

        this._accumulate.frame(frameNumber);

        this._fontFace.glyphTexture.unbind(gl.TEXTURE0);
        gl.blendFunc(oldBlendSRC, oldBlendDST);
        if (!wasBlendEnabled) {
            gl.disable(gl.BLEND);
        }
    }

    protected onSwap(): void {
        this._blit.framebuffer = this._accumulate.framebuffer ?
            this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
        this._blit.frame();
    }

    protected loadFont(context: Context): void {

        /* This is a placeholder until the 'real' fontFace is loaded asynchronously by the fontLoader */
        const fontFace: FontFace = new FontFace(context);

        FontLoader.load(context, './data/opensansr144/opensansr144.fnt', false).then(
            (fontFace) => {
                this._fontFace = fontFace;
                this.setupScene();
                this.invalidate(true);
            },
        );
        this._fontFace = fontFace;
    }

    protected setupScene(): void {

        /** OpenLL 2D Labels */

        const pos2Dlabel = new Position2DLabel(new Text('Hello Position 2D!'), this._fontFace);
        pos2Dlabel.fontSize = 40;

        /* position values in px, since fontSizeUnit is set to SpaceUnit.Px */
        pos2Dlabel.setPosition(-100, 0);
        pos2Dlabel.setDirection(0.5, -0.5);

        let glyphVertices = pos2Dlabel.typeset(this._frameSize);

        /* fill buffers */
        let origins: Array<number> = [];
        let tans: Array<number> = [];
        let ups: Array<number> = [];
        let texCoords: Array<number> = [];

        let l = glyphVertices.length;

        for (let i = 0; i < l; i++) {
            const v = glyphVertices[i];

            origins.push.apply(origins, v.origin);
            tans.push.apply(tans, v.tangent);
            ups.push.apply(ups, v.up);
            texCoords.push.apply(texCoords, v.uvRect);
        }

        this._2DLabelGeometry.setTexCoords(Float32Array.from(texCoords));
        this._2DLabelGeometry.setGlyphCoords(
            Float32Array.from(origins), Float32Array.from(tans), Float32Array.from(ups));

        /** OpenLL 3D Labels */
        const pos3Dlabel = new Position3DLabel(new Text('Hello Position 3D!'), this._fontFace);
        pos3Dlabel.fontSize = 0.1;

        /* position values in world, since fontSizeUnit is set to SpaceUnit.World */
        pos3Dlabel.setPosition(0, 0.1, -0.5);
        pos3Dlabel.setDirection(0, 1, 0);
        pos3Dlabel.setUp(-1, 0, 0);

        glyphVertices = pos3Dlabel.typeset();

        const shadowPos3Dlabel = new Position3DLabel(new Text('Hello Position Shadow'), this._fontFace);
        shadowPos3Dlabel.setPosition(0, 0.1, -0.5);
        shadowPos3Dlabel.fontSize = 0.1;
        shadowPos3Dlabel.setDirection(0, 1, 0);
        shadowPos3Dlabel.setUp(0, 0, -1);

        glyphVertices = glyphVertices.concat(shadowPos3Dlabel.typeset());

        const anotherPos3Dlabel = new Position3DLabel(new Text('Yet another 3D Label'), this._fontFace);
        anotherPos3Dlabel.setPosition(0.2, -0.1, 0);
        anotherPos3Dlabel.setDirection(-1, 0, 0);
        anotherPos3Dlabel.setUp(0, -1, 0);
        glyphVertices = glyphVertices.concat(anotherPos3Dlabel.typeset());

        /* fill buffers */
        origins = [];
        tans = [];
        ups = [];
        texCoords = [];

        l = glyphVertices.length;

        for (let i = 0; i < l; i++) {
            const v = glyphVertices[i];

            origins.push.apply(origins, v.origin);
            tans.push.apply(tans, v.tangent);
            ups.push.apply(ups, v.up);
            texCoords.push.apply(texCoords, v.uvRect);
        }

        this._3DLabelGeometry.setTexCoords(Float32Array.from(texCoords));
        this._3DLabelGeometry.setGlyphCoords(
            Float32Array.from(origins), Float32Array.from(tans), Float32Array.from(ups));
    }
}
