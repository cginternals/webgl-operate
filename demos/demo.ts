
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

    protected expose(): void {

        (window as any)['canvas'] = this.canvas;
        (window as any)['context'] = this.canvas.context;
        (window as any)['controller'] = this.canvas.controller;

        (window as any)['renderer'] = this.renderer;
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

        this.expose();

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
