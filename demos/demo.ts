
/* spellchecker: disable */

import {
    Canvas,
    Initializable,
    LoadingStatus,
    Renderer,
    viewer,
} from 'webgl-operate';

/* spellchecker: enable */


export abstract class Demo extends Initializable {

    /**
     * Hide the loading spinner.
     */
    protected showSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'inline';
    }

    /**
     * Hide the loading spinner.
     */
    protected hideSpinner(): void {
        const spinnerElement = document.getElementsByClassName('spinner').item(0)!;
        (spinnerElement as HTMLElement).style.display = 'none';
    }

    initialize(element: HTMLCanvasElement | string): boolean {
        const result = this.onInitialize(element);

        this.renderer.loadingStatus$.subscribe((status: LoadingStatus) => {
            if (status === LoadingStatus.Finished) {
                this.hideSpinner();
            } else if (status === LoadingStatus.Started) {
                this.showSpinner();
            }
        });

        return result;
    }

    uninitialize(): void {
        this.onUninitialize();
    }

    abstract onInitialize(element: HTMLCanvasElement | string): boolean;

    abstract onUninitialize(): void;

    abstract get renderer(): Renderer;

    abstract get canvas(): Canvas;

    enableFullscreenOnCtrlClick(): void {

        const e = this.canvas.element;
        e.addEventListener('click', (event) => {
            if (event.ctrlKey) { viewer.Fullscreen.toggle(e); }
        });
    }
}
