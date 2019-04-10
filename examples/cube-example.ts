
/* spellchecker: disable */

import {
    Canvas,
    Wizard,
} from 'webgl-operate';

import { CubeRenderer } from './data/example-cube-renderer';
import { Example } from './example';

/* spellchecker: enable */

// tslint:disable:max-classes-per-file

export class CubeExample extends Example {

    private _canvas: Canvas;
    private _renderer: CubeRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new CubeRenderer();
        this._canvas.renderer = this._renderer;

        return true;
    }

    uninitialize(): void {
        this._canvas.dispose();
        this._renderer.uninitialize();
    }

    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): CubeRenderer {
        return this._renderer;
    }

}
