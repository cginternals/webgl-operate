
/* spellchecker: disable */

import { auxiliaries } from '../auxiliaries';
import assert = auxiliaries.assert;

import { AccumulatePass } from '../accumulatepass';
import { AntiAliasingKernel } from '../antialiasingkernel';
import { BlitPass } from '../blitpass';
import { Context } from '../context';
import { DefaultFramebuffer } from '../defaultframebuffer';
import { EventProvider } from '../eventhandler';
import { Framebuffer } from '../framebuffer';
import { NdcFillingTriangle } from '../ndcfillingtriangle';
import { Program } from '../program';
import { Renderbuffer } from '../renderbuffer';
import { Invalidate, Renderer } from '../renderer';
import { Shader } from '../shader';
import { Texture2D } from '../texture2d';
import { TestNavigation } from './testnavigation';

/* spellchecker: enable */

export class TestRenderer extends Renderer {

    protected _extensions = false;
    protected _program: Program;

    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uFrameNumber: WebGLUniformLocation;
    protected _ndcTriangle: NdcFillingTriangle;

    protected _accumulate: AccumulatePass;
    protected _blit: BlitPass;

    protected _defaultFBO: DefaultFramebuffer;
    protected _colorRenderTexture: Texture2D;
    protected _depthRenderbuffer: Renderbuffer;
    protected _intermediateFBO: Framebuffer;

    protected _testNavigation: TestNavigation;


    protected onInitialize(context: Context, callback: Invalidate,
        eventProvider: EventProvider): boolean {

        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        /* Enable required extensions. */

        if (this._extensions === false && this._context.isWebGL1) {
            assert(this._context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
            this._context.standardDerivatives;
            this._extensions = true;
        }

        /* Create and configure program and geometry. */

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'testrenderer.vert');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        vert.initialize(require('./testrenderer.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'testrenderer.frag');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        frag.initialize(require('./testrenderer.frag'));

        this._program = new Program(this._context);
        this._program.initialize([vert, frag]);

        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uFrameNumber = this._program.uniform('u_frameNumber');

        this._ndcTriangle = new NdcFillingTriangle(this._context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._ndcTriangle.initialize(aVertex);

        this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);

        /* Create framebuffers, textures, and render buffers. */

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();

        this._colorRenderTexture = new Texture2D(this._context, 'ColorRenderTexture');
        this._depthRenderbuffer = new Renderbuffer(this._context, 'DepthRenderbuffer');

        this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');

        /* Create and configure accumulation pass. */

        this._accumulate = new AccumulatePass(this._context);
        this._accumulate.initialize(this._ndcTriangle);
        this._accumulate.precision = this._framePrecision;
        this._accumulate.texture = this._colorRenderTexture;
        // this._accumulate.depthStencilAttachment = this._depthRenderbuffer;

        /* Create and configure blit pass. */

        this._blit = new BlitPass(this._context);
        this._blit.initialize(this._ndcTriangle);
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;

        /* Create and configure test navigation. */

        this._testNavigation = new TestNavigation(() => this.invalidate(), eventProvider);

        return true;
    }

    protected onUninitialize(): void {
        super.uninitialize();

        this._uNdcOffset = -1;
        this._uFrameNumber = -1;
        this._program.uninitialize();

        this._ndcTriangle.uninitialize();

        this._intermediateFBO.uninitialize();
        this._defaultFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();

        this._blit.uninitialize();
        this._accumulate.uninitialize();
    }

    protected onDiscarded(): void {
        this._altered.alter('frameSize');
        this._altered.alter('multiFrameNumber');
        this._altered.alter('framePrecision');
        this._altered.alter('clearColor');
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

        if (!this._intermediateFBO.initialized) {
            this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);

        } else if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
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

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._program.bind();

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];
        gl.uniform2fv(this._uNdcOffset, ndcOffset);
        gl.uniform1i(this._uFrameNumber, frameNumber);

        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT, true, false);
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._intermediateFBO.unbind();

        this._accumulate.frame(frameNumber);
    }

    protected onSwap(): void {
        this._blit.framebuffer = this._accumulate.framebuffer ?
            this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
        this._blit.frame();
    }


}
