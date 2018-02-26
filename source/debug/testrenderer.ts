
import { AbstractRenderer } from '../core/renderer';


export class TestRenderer extends AbstractRenderer {

    protected onUpdate(): void {

    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;
        const size = this.canvasSize;

        gl.viewport(0, 0, size[0], size[1]);

        gl.clearColor(this._clearColor[0], this._clearColor[1], this._clearColor[2], this._clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    protected onSwap(): void {

    }

}
