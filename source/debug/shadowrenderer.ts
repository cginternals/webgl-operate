
import { assert } from '../auxiliaries';

import { AccumulatePass } from '../accumulatepass';
import { BlitPass } from '../blitpass';
import { Context } from '../context';
import { DefaultFramebuffer } from '../defaultframebuffer';
import { Framebuffer } from '../framebuffer';
import { MouseEventProvider } from '../mouseeventprovider';
import { NdcFillingTriangle } from '../ndcfillingtriangle';
import { Program } from '../program';
import { Renderbuffer } from '../renderbuffer';
import { Invalidate, Renderer } from '../renderer';
import { Shader } from '../shader';
import { Texture2D } from '../texture2d';
import { TestNavigation } from './testnavigation';


namespace debug {

    export class ShadowRenderer extends Renderer {

        protected _extensions = false;
        protected _fillerProgram: Program;
        protected _blurProgram: Program;

        protected _ndcTriangle: NdcFillingTriangle;
        protected _uFillerTexture: WebGLUniformLocation;
        protected _uSize: WebGLUniformLocation;
        protected _uKernelSize: WebGLUniformLocation;

        protected _accumulate: AccumulatePass;
        protected _blit: BlitPass;

        protected _defaultFBO: DefaultFramebuffer;
        protected _fillerColorRenderTexture: Texture2D;
        protected _fillerDepthRenderbuffer: Renderbuffer;
        protected _fillerFBO: Framebuffer;
        protected _blurColorRenderTexture: Texture2D;
        protected _blurDepthRenderbuffer: Renderbuffer;
        protected _blurFBO: Framebuffer;

        protected _testNavigation: TestNavigation;


        protected onInitialize(context: Context, callback: Invalidate,
            mouseEventProvider: MouseEventProvider,
            /* keyEventProvider: KeyEventProvider, */
            /* touchEventProvider: TouchEventProvider */): boolean {

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

            const fillerVert = new Shader(this._context, gl.VERTEX_SHADER, 'filler.vert');
            fillerVert.initialize(require('./filler.vert'));
            const fillerFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'filler.frag');
            fillerFrag.initialize(require('./filler.frag'));

            this._fillerProgram = new Program(this._context);
            this._fillerProgram.initialize([fillerVert, fillerFrag]);

            const blurVert = new Shader(this._context, gl.VERTEX_SHADER, 'boxblur.vert');
            blurVert.initialize(require('./boxblur.vert'));
            const blurFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'boxblur.frag');
            blurFrag.initialize(require('./boxblur.frag'));

            this._blurProgram = new Program(this._context);
            this._blurProgram.initialize([blurVert, blurFrag]);

            this._uFillerTexture = this._blurProgram.uniform('u_Texture');
            this._uSize = this._blurProgram.uniform('u_Size');
            this._uKernelSize = this._blurProgram.uniform('u_KernelSize');

            this._ndcTriangle = new NdcFillingTriangle(this._context);
            const aVertex = this._fillerProgram.attribute('a_vertex', 0);
            this._ndcTriangle.initialize(aVertex);

            /* Create framebuffers, textures, and render buffers. */

            this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
            this._defaultFBO.initialize();

            this._fillerColorRenderTexture = new Texture2D(this._context, 'FillerColorRenderTexture');
            this._fillerDepthRenderbuffer = new Renderbuffer(this._context, 'FillerDepthRenderbuffer');

            this._fillerFBO = new Framebuffer(this._context, 'FillerFBO');

            this._blurColorRenderTexture = new Texture2D(this._context, 'BlurColorRenderTexture');
            this._blurDepthRenderbuffer = new Renderbuffer(this._context, 'BlurDepthRenderbuffer');

            this._blurFBO = new Framebuffer(this._context, 'BlurFBO');

            /* Create and configure accumulation pass. */

            this._accumulate = new AccumulatePass(this._context);
            this._accumulate.initialize(this._ndcTriangle);
            this._accumulate.precision = this._framePrecision;
            this._accumulate.texture = this._blurColorRenderTexture;
            // this._accumulate.depthStencilAttachment = this._depthRenderbuffer;

            /* Create and configure blit pass. */

            this._blit = new BlitPass(this._context);
            this._blit.initialize(this._ndcTriangle);
            this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
            this._blit.drawBuffer = gl.BACK;
            this._blit.target = this._defaultFBO;

            /* Create and configure test navigation. */

            this._testNavigation = new TestNavigation(() => this.invalidate(), mouseEventProvider);

            return true;
        }

        protected onUninitialize(): void {
            super.uninitialize();

            this._uFillerTexture = -1;
            this._uSize = -1;
            this._uKernelSize = -1;

            this._fillerProgram.uninitialize();
            this._blurProgram.uninitialize();

            this._ndcTriangle.uninitialize();

            this._fillerFBO.uninitialize();
            this._blurFBO.uninitialize();
            this._defaultFBO.uninitialize();
            this._fillerColorRenderTexture.uninitialize();
            this._blurColorRenderTexture.uninitialize();
            this._fillerDepthRenderbuffer.uninitialize();
            this._blurDepthRenderbuffer.uninitialize();

            this._blit.uninitialize();
        }


        protected onUpdate(): boolean {
            this._testNavigation.update();

            const redraw = this._testNavigation.altered;
            this._testNavigation.reset();

            if (!redraw && !this._altered.any) {
                return false;
            }

            return redraw;
        }

        protected onPrepare(): void {
            const gl = this._context.gl;
            const gl2facade = this._context.gl2facade;

            if (!this._fillerFBO.initialized) {
                this._fillerColorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                    this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
                this._fillerDepthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
                this._fillerFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._fillerColorRenderTexture]
                    , [gl.DEPTH_ATTACHMENT, this._fillerDepthRenderbuffer]]);
            }
            if (!this._blurFBO.initialized) {
                this._blurColorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                    this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
                this._blurDepthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
                this._blurFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._blurColorRenderTexture]
                    , [gl.DEPTH_ATTACHMENT, this._blurDepthRenderbuffer]]);
            }
            if (this._altered.frameSize) {
                this._blurFBO.resize(this._frameSize[0], this._frameSize[1]);
                this._fillerFBO.resize(this._frameSize[0], this._frameSize[1]);
            }
            if (this._altered.framePrecision) {
                this._accumulate.precision = this._framePrecision;
            }

            if (this._altered.clearColor) {
                this._fillerFBO.clearColor(this._clearColor);
            }

            this._accumulate.update();

            this._altered.reset();
        }

        protected onFrame(frameNumber: number): void {
            const gl = this._context.gl;

            gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

            this._fillerProgram.bind();

            this._fillerFBO.clear(gl.COLOR_BUFFER_BIT, true, false);
            this._ndcTriangle.bind();
            this._ndcTriangle.draw();
            this._fillerFBO.unbind();

            this._blurProgram.bind();
            this._fillerColorRenderTexture.bind(gl.TEXTURE0);
            gl.uniform1i(this._uFillerTexture, 0);
            gl.uniform2iv(this._uSize, this._frameSize);
            gl.uniform1i(this._uKernelSize, 20);

            this._blurFBO.clear(gl.COLOR_BUFFER_BIT, true, false);
            this._ndcTriangle.bind();
            this._ndcTriangle.draw();
            this._blurFBO.unbind();

            this._accumulate.frame(frameNumber);
        }

        protected onSwap(): void {
            this._blit.framebuffer = this._accumulate.framebuffer ?
                this._accumulate.framebuffer : this._blit.framebuffer = this._blurFBO;
            this._blit.frame();
        }


    }

}

export = debug;
