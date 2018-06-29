
import { assert } from './auxiliaries';

import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

import { AccumulatePass } from './accumulatepass';
import { AntiAliasingKernel } from './antialiasingkernel';
import { BlitPass } from './blitpass';
import { Camera } from './camera';
import { Context } from './context';
import { DefaultFramebuffer } from './defaultframebuffer';
import { Framebuffer } from './framebuffer';
import { MouseEventProvider } from './mouseeventprovider';
import { Program } from './program';
import { Renderbuffer } from './renderbuffer';
import { Invalidate, Renderer } from './renderer';
import { Shader } from './shader';
import { Texture2 } from './texture2';

import { FontFace } from './fontface';
import { FontLoader } from './fontloader';
import { GlyphVertex, GlyphVertices } from './glyphvertices';
import { Label } from './label';
import { LabelGeometry } from './LabelGeometry';
import { Text } from './text';
import { Typesetter } from './typesetter';

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

    protected _fontFace: FontFace;
    protected _labelGeometry: LabelGeometry;
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

        this._labelGeometry = new LabelGeometry(this._context);
        const aVertex = this._program.attribute('a_quadVertex', 0);
        const aTexCoord = this._program.attribute('a_texCoord', 1);
        const aOrigin = this._program.attribute('a_origin', 2);
        const aTan = this._program.attribute('a_tan', 3);
        const aUp = this._program.attribute('a_up', 4);

        this._labelGeometry.initialize(aVertex, aTexCoord, aOrigin, aTan, aUp);

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

        this._testNavigation = new TestNavigation(() => this.invalidate(), mouseEventProvider);

        return true;
    }

    protected onUninitialize(): void {
        super.uninitialize();

        this._uNdcOffset = -1;
        this._uFrameNumber = -1;
        this._uGlyphAtlas = -1;
        this._program.uninitialize();

        this._intermediateFBO.uninitialize();
        this._defaultFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();

        this._blit.uninitialize();
    }


    protected onUpdate(): boolean {
        this._testNavigation.update();

        const redraw = this._testNavigation.altered;
        this._testNavigation.reset();

        if (!redraw && !this._altered.any) {
            return false;
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel.width = this._multiFrameNumber;
        }

        return redraw;
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
        }

        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
        }

        this._accumulate.update();

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        let wasBlendEnabled = false;
        const oldBlendSRC: any = gl.getParameter(gl.BLEND_SRC_RGB);
        const oldBlendDST: any = gl.getParameter(gl.BLEND_DST_RGB);

        wasBlendEnabled = gl.isEnabled(gl.BLEND);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // gl.enable(gl.POLYGON_OFFSET_FILL);
        // gl.polygonOffset(-1, 1); // avoid z-fighting with other geometry

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

        this._labelGeometry.bind();
        this._labelGeometry.draw();
        this._labelGeometry.unbind();

        this._intermediateFBO.unbind();

        this._accumulate.frame(frameNumber);

        this._fontFace.glyphTexture.unbind(gl.TEXTURE0);
        gl.blendFunc(oldBlendSRC, oldBlendDST);
        if (!wasBlendEnabled) {
            gl.disable(gl.BLEND);
        }

        // gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    protected onSwap(): void {
        this._blit.framebuffer = this._accumulate.framebuffer ?
            this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
        this._blit.frame();
    }

    protected loadFont(context: Context): void {
        const loader = new FontLoader();

        const fontFace: FontFace = loader.load(
            context, './data/opensansr144/opensansr144.fnt', false, () => {
                this.setupScene();
                this.invalidate();
            });

        this._fontFace = fontFace;
    }

    protected setupScene(): void {

        // create Label with Text and
        // tell the Typesetter to typeset that Label with the loaded FontFace

        const userTransform = mat4.create();
        mat4.translate(userTransform, userTransform, vec3.fromValues(-1, 0.0, 0));
        mat4.rotateX(userTransform, userTransform, Math.PI * -0.4);
        mat4.rotateY(userTransform, userTransform, Math.PI * 0.2);
        mat4.rotateZ(userTransform, userTransform, Math.PI * 0.5);
        let glyphVertices = this.prepareLabel('Hello Transform!', userTransform);

        glyphVertices = glyphVertices.concat(this.prepareLabel('Hello World!'));

        const origins: Array<number> = [];
        const tans: Array<number> = [];
        const ups: Array<number> = [];
        const texCoords: Array<number> = [];

        const l = glyphVertices.length;

        for (let i = 0; i < l; i++) {
            // TODO: shouldn't there be an easier way to achieve this?
            // concat doesn't work as vec3 apparently is not an Array.

            const v = glyphVertices[i];

            origins.push(v.origin[0]);
            origins.push(v.origin[1]);
            origins.push(v.origin[2]);

            tans.push(v.tangent[0]);
            tans.push(v.tangent[1]);
            tans.push(v.tangent[2]);

            ups.push(v.up[0]);
            ups.push(v.up[1]);
            ups.push(v.up[2]);

            texCoords.push(v.uvRect[0]);
            texCoords.push(v.uvRect[1]);
            texCoords.push(v.uvRect[2]);
            texCoords.push(v.uvRect[3]);
        }

        this._labelGeometry.setTexCoords(Float32Array.from(texCoords));
        this._labelGeometry.setGlyphCoords(Float32Array.from(origins), Float32Array.from(tans), Float32Array.from(ups));
    }

    protected prepareLabel(str: string, userTransform?: mat4): GlyphVertices {

        const testLabel: Label = new Label(new Text(str), this._fontFace);

        // TODO meaningful margins from label.margins or config.margins ?
        const margins: vec4 = vec4.create();
        // TODO meaningful ppiScale from label.ppiScale or config.ppiScale ?
        const ppiScale = 1;

        // compute transform matrix
        const transform = mat4.create();

        // translate to lower left in NDC
        mat4.translate(transform, transform, vec3.fromValues(-1.0, -1.0, 0.0));

        // scale glyphs to NDC size
        // this._frameSize should be the viewport size
        mat4.scale(transform, transform, vec3.fromValues(2.0 / this._frameSize[0], 2.0 / this._frameSize[1], 1.0));

        // scale glyphs to pixel size with respect to the displays ppi
        mat4.scale(transform, transform, vec3.fromValues(ppiScale, ppiScale, ppiScale));

        // translate to origin in point space - scale origin within
        // margined extend (i.e., viewport with margined areas removed)
        const marginedExtent: vec2 = vec2.create();
        vec2.sub(marginedExtent, vec2.fromValues(
            this._frameSize[0] / ppiScale, this._frameSize[1] / ppiScale),
            vec2.fromValues(margins[3] + margins[1], margins[2] + margins[0]));

        const v3 = vec3.fromValues(0.5 * marginedExtent[0], 0.5 * marginedExtent[1], 0);
        vec3.add(v3, v3, vec3.fromValues(margins[3], margins[2], 0.0));
        mat4.translate(transform, transform, v3);

        testLabel.transform = mat4.mul(testLabel.transform,
            userTransform !== undefined ? userTransform : mat4.create(), transform);

        const numGlyphs = testLabel.length;

        // prepare vertex storage (values will be overridden by typesetter)
        const vertices = new GlyphVertices();
        for (let i = 0; i < numGlyphs; ++i) {

            const vertex: GlyphVertex = {
                origin: vec3.create(),
                tangent: vec3.create(),
                up: vec3.create(),
                // vec2 lowerLeft and vec2 upperRight in glyph texture (uv)
                uvRect: vec4.create(),
            };
            vertices.push(vertex);
        }

        Typesetter.typeset(testLabel, vertices, 0);

        return vertices;
    }
}
