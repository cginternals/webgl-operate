
import { RandomSquareKernel } from './randomsquarekernel';


/**
 * An anti-aliasing kernel which provides NDC offsets for anti-aliasing, e.g., when using multi-frame sampling.
 */
export class AntiAliasingKernel extends RandomSquareKernel {

    /**
     * @override
     * Seems to only work if the getter of this kernels width setter is redefined here.
     */
    get width(): GLsizei {
        return this._width;
    }

    /**
     * Changes the size of the kernel and triggers regeneration of all values. If width is either 8 or 64 pre-built
     * kernels will be loaded (golden set). In any other case, a random square kernel will be created.
     */
    set width(width: GLsizei) {
        if (this._width === width) {
            return;
        }
        this._width = width;
        switch (this._width) {
            case 8:
                this.fromJSON(require('./data/goldenset08.json'));
                break;

            case 64:
                this.fromJSON(require('./data/goldenset64.json'));
                break;

            default:
                this.resize();
                this.generate();
        }
    }

}
