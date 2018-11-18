
/* spellchecker: disable */

import { assert, rand } from './auxiliaries';
import { KernelF32 } from './kernel';

/* spellchecker: enable */


/**
 * Kernel providing random values in [-1,+1] for two components. The first sample is fixed at [0.0, 0.0] since the
 * kernel is intended for use of NDC offsets.
 *
 * Example for using this kernel:
 * ```
 * this._aaKernel.size = multiFrameNumber; // regenerates when multi-frame number changes
 * let ndcOffset = this._aaKernel.value(frameNumber);
 * ndcOffset[0] = ndcOffset[0] / this._intermediateFBO.width;
 * ndcOffset[1] = ndcOffset[1] / this._intermediateFBO.height;
 * ```
 */
export class RandomSquareKernel extends KernelF32 {

    /**
     * RandomSquareKernel is fixed to one-dimension (x-axis) and 2-components per sample.
     * @param width - Width of the kernel along its x-axis.
     */
    constructor(width: GLsizei) {
        super(2, width);
        this.generate();
    }

    /**
     * Generates for each sample random components in [-1.0, +1.0] except for the first.
     */
    protected generate(): void {
        assert(this.width > 0, `expected every kernel to comprise at least one element`);
        this.set([0.0, 0.0], 0);
        for (let i = 1; i < this.width; ++i) {
            this.set([rand(-0.5, +0.5), rand(-0.5, +0.5)], i);
        }
    }

    /**
     * @override
     * Seems to only work if the getter of this kernels width setter is redefined here.
     */
    get width(): GLsizei {
        return this._width;
    }

    /**
     * Changes the size of the kernel and triggers regeneration of all values.
     */
    set width(width: GLsizei) {
        if (this._width === width) {
            return;
        }
        this._width = width;
        this.resize();
        this.generate();
    }

}
