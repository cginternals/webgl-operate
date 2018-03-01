
import { assert } from '../auxiliaries';

import { AntiAliasingKernel } from '../antialiasingkernel';
import { Blit } from '../blit';
import { NdcFillingTriangle } from '../ndcfillingtriangle';
import { Program } from '../program';
import { Shader } from '../shader';
import { Texture2 } from '../texture2';
import { DefaultFramebuffer, Framebuffer, Renderbuffer } from '../webgl-operate';

import { AbstractRenderer } from '../renderer';


namespace debug {

    export class TestRenderer extends AbstractRenderer {

        protected _extensions = false;
        protected _program: Program;

        protected _ndcOffsetKernel: AntiAliasingKernel;
        protected _uNdcOffset: WebGLUniformLocation;
        protected _ndcTriangle: NdcFillingTriangle;
        protected _aVertex: GLuint;

        protected _blit: Blit;

        protected _defaultFBO: DefaultFramebuffer;
        protected _colorRenderTexture: Texture2;
        protected _depthRenderbuffer: Renderbuffer;
        protected _intermediateFBO: Framebuffer;


        protected onUpdate(): void {
            const gl = this.context.gl;
            const gl2facade = this.context.gl2facade;

            if (this._extensions === false && this.context.isWebGL1) {
                assert(this.context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
                /* tslint:disable-next-line:no-unused-expression */
                this.context.standardDerivatives;
                this._extensions = true;
            }


            if (this._program === undefined) {
                this._program = new Program(this.context);
            }

            if (!this._program.initialized) {

                const vert = new Shader(this.context, gl.VERTEX_SHADER, 'testrenderer.vert');
                vert.initialize(require('./testrenderer.vert'));
                const frag = new Shader(this.context, gl.FRAGMENT_SHADER, 'testrenderer.frag');
                frag.initialize(require('./testrenderer.frag'));

                this._program.initialize([vert, frag]);
                this._aVertex = this._program.attribute('aVertex', 0);

                this._uNdcOffset = this._program.uniform('u_ndcOffset');
            }


            if (this._ndcTriangle === undefined) {
                this._ndcTriangle = new NdcFillingTriangle(this.context);
            }

            if (!this._ndcTriangle.initialized) {
                this._ndcTriangle.initialize(this._aVertex);
            }

            if (this._ndcOffsetKernel === undefined) {
                this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);
            }

            if (this._altered.multiFrameNumber) {
                this._ndcOffsetKernel.width = this._multiFrameNumber;
            }


            if (this._intermediateFBO === undefined) {
                this._defaultFBO = new DefaultFramebuffer(this.context, 'DefaultFBO');
                this._defaultFBO.initialize();

                this._colorRenderTexture = new Texture2(this.context, 'ColorRenderTexture');
                this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                    this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

                this._depthRenderbuffer = new Renderbuffer(this.context, 'DepthRenderbuffer');
                this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT24);

                this._intermediateFBO = new Framebuffer(this.context, 'IntermediateFBO');
                this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                    , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);
            }

            if (this._altered.frameSize) {
                this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            }

            if (this._altered.clearColor) {
                this._intermediateFBO.clearColor(this._clearColor);
            }


            if (this._blit === undefined) {
                this._blit = new Blit(this.context);
            }
            if (!this._blit.initialized) {
                this._blit.initialize(this._ndcTriangle);
                this._blit.framebuffer = this._intermediateFBO;
                this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
                this._blit.drawBuffer = gl.BACK;
                this._blit.target = this._defaultFBO;
            }

            this._altered.reset();
        }

        protected onFrame(frameNumber: number): void {
            const gl = this.context.gl;

            gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

            this._program.bind();

            const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
            ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
            ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];
            gl.uniform2fv(this._uNdcOffset, ndcOffset);

            this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT, true, false);
            this._ndcTriangle.bind();
            this._ndcTriangle.draw();
            this._intermediateFBO.unbind();
        }

        protected onSwap(): void {
            this._blit.frame();
        }

        protected onDispose(): void {

            if (this._program && this._program.initialized) {
                this._uNdcOffset = -1;
                this._program.uninitialize();
            }

            if (this._ndcTriangle && this._ndcTriangle.initialized) {
                this._ndcTriangle.uninitialize();
            }

            if (this._intermediateFBO.initialized) {
                this._intermediateFBO.uninitialize();
                this._defaultFBO.uninitialize();
                this._colorRenderTexture.uninitialize();
                this._depthRenderbuffer.uninitialize();
            }

            if (this._blit && this._blit.initialized) {
                this._blit.uninitialize();
            }
        }

    }

}

export = debug;
