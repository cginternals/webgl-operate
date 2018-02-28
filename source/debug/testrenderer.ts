
import { assert } from '../auxiliaries';

import { Program } from '../program';
import { Shader } from '../shader';
// import { Texture2 } from '../texture2';

import { AntiAliasingKernel } from '../antialiasingkernel';
import { NdcFillingTriangle } from '../ndcfillingtriangle';

import { AbstractRenderer } from '../renderer';


export class TestRenderer extends AbstractRenderer {

    protected _extensions = false;
    protected _program: Program;

    protected _ndcOffsetKernel: AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _ndcTriangle: NdcFillingTriangle;
    protected _aVertex: GLuint;


    protected onUpdate(): void {
        const gl = this.context.gl;

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

            this._program.bind();
            this._uNdcOffset = this._program.uniform('u_ndcOffset');
            this._program.unbind();
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

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;
        const size = this.canvasSize;

        gl.viewport(0, 0, size[0], size[1]);

        gl.clearColor(this._clearColor[0], this._clearColor[1], this._clearColor[2], this._clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._program.bind();

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];
        gl.uniform2fv(this._uNdcOffset, ndcOffset);

        console.log(ndcOffset);

        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
    }

    protected onSwap(): void {
        // const gl = this.context.gl;

    }

    protected onDispose(): void {

        if (this._program && this._program.initialized) {
            this._uNdcOffset = -1;
            this._program.uninitialize();
        }

        if (this._ndcTriangle && this._ndcTriangle.initialized) {
            this._ndcTriangle.uninitialize();
        }
    }

}
