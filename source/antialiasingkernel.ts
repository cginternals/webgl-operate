
/* spellchecker: disable */

import { RandomSquareKernel } from './randomsquarekernel';

/* spellchecker: enable */


/**
 * An anti-aliasing kernel which provides NDC offsets for anti-aliasing, e.g., when using multi-frame sampling.
 */
export class AntiAliasingKernel extends RandomSquareKernel {

    /**
     * AntiAliasingKernel is fixed to one-dimension (x-axis) and 2-components per sample.
     * @param width - Width of the kernel along its x-axis.
     */
    constructor(width: GLsizei) {
        super(width);
    }

    /**
     * Invokes regeneration of all values. If width is either 8 or 64 pre-built kernels will be loaded (golden set). In
     * any other case, a random square kernel will be created.
     */
    protected generate(): void {
        switch (this._width) {
            case 8:
                this.fromJSON(require('./data/goldenset08.json'));
                break;

            case 64:
                this.fromJSON(require('./data/goldenset64.json'));
                break;

            case 128:
                this.fromJSON(require('./data/goldenset128.json'));
                break;

            default:
                super.generate();
        }
    }

}
