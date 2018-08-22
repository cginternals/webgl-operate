
import { RandomSquareKernel } from './randomsquarekernel';


/**
 * An anti-aliasing kernel which provides NDC offsets for anti-aliasing, e.g., when using multi-frame sampling.
 */
export class AntiAliasingKernel extends RandomSquareKernel {

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

            default:
                super.generate();
        }
    }

}
