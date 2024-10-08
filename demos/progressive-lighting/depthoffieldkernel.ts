
/* spellchecker: disable */

import { auxiliaries } from '../../../webgl-operate';

import { AbstractKernel, KernelF32 } from '../../../webgl-operate'

/* spellchecker: enable */


export class DepthOfFieldKernel extends KernelF32 {

    /**
     * DepthOfFieldKernel is fixed to one-dimension (x-axis) and 2-components per sample.
     * @param width - Width of the kernel along its x-axis.
     */
    constructor(width: GLsizei) {
        super(2, width);
        this.generate();
    }

    protected generate(): void {
        auxiliaries.assert(this.width > 0, `expected every kernel to comprise at least one element`);
        this.set([0.0, 0.0], 0);
        for (let i = 1; i < this.width; ++i) {
            this.set([auxiliaries.rand(-1.0, +1.0), auxiliaries.rand(-1.0, +1.0)], i);
        }

        this.sort(AbstractKernel.SortApproach.BySquaredLength);
    }

    get width(): GLsizei {
        return this._width;
    }

    set width(width: GLsizei) {
        if (this._width === width) {
            return;
        }
        this._width = width;
        this.resize();
        this.generate();
    }

}
