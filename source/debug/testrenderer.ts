


import { Program } from '../core/program';
import { Shader } from '../core/shader';
// import { Texture2 } from '../core/texture2';

import { NdcFillingTriangle } from '../assets/ndcfillingtriangle';

import { AbstractRenderer } from '../core/renderer';


export class TestRenderer extends AbstractRenderer {

    protected _program: Program;

    protected _ndcTriangle: NdcFillingTriangle;
    protected _aVertex: GLuint;


    protected onUpdate(): void {
        const gl = this.context.gl;

        if (this._program === undefined) {
            this._program = new Program(this.context);
        }

        if (!this._program.initialized) {

            const vert = new Shader(this.context, gl.VERTEX_SHADER);
            vert.initialize(require('../shaders/ndcvertices.vert'));
            const frag = new Shader(this.context, gl.FRAGMENT_SHADER);
            frag.initialize(require('../shaders/makeblue.frag'));

            this._program.initialize([vert, frag]);
            this._aVertex = this._program.attribute('aVertex', 0);
        }

        if (this._ndcTriangle === undefined) {
            this._ndcTriangle = new NdcFillingTriangle(this.context);
        }

        if (!this._ndcTriangle.initialized) {
            this._ndcTriangle.initialize(this._aVertex);
        }

        console.log('update');
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;
        const size = this.canvasSize;

        gl.viewport(0, 0, size[0], size[1]);

        gl.clearColor(this._clearColor[0], this._clearColor[1], this._clearColor[2], this._clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._program.bind();
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
    }

    protected onSwap(): void {
        // const gl = this.context.gl;


    }

}
