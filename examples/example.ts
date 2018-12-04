
/* spellchecker: disable */

import {
    Canvas,
    Initializable,
    Renderer,
} from 'webgl-operate';

/* spellchecker: enable */


export abstract class Example extends Initializable {

    abstract initialize(element: HTMLCanvasElement | string): boolean;

    abstract uninitialize(): void;

    abstract get renderer(): Renderer;

    abstract get canvas(): Canvas;

}
