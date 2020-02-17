
/* spellchecker: disable */

import {
    Canvas,
    Initializable,
    Renderer,
    viewer,
} from 'webgl-operate';

/* spellchecker: enable */


export abstract class Example extends Initializable {

    abstract initialize(element: HTMLCanvasElement | string): boolean;

    abstract uninitialize(): void;

    abstract get renderer(): Renderer;

    abstract get canvas(): Canvas;

    enableFullscreenOnCtrlClick(): void {

        const e = this.canvas.element;
        e.addEventListener('click', (event) => {
            if (event.ctrlKey) { viewer.Fullscreen.toggle(e); }
        });
    }
}
