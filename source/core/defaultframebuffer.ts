
// import { vec2 } from 'gl-matrix';

// import { assert } from './auxiliaries';

// import { Framebuffer } from './framebuffer';


// /**
//  * Default framebuffer with framebuffer interface. It is intended for use as default buffer binding and enables lazy
//  * target size reconfiguration of stages.
//  *
//  * ```
//  * this._someStage.frame(this._nullFBO, frameNumber, multiFrameNumber);
//  * ```
//  *
//  * Note that this buffer does query its size from the current context's canvas.
//  */
// export class DefaultFramebuffer extends Framebuffer {

//     /**
//      * @override
//      *
//      * Default framebuffer cannot be created.
//      */
//     protected create(): WebGLFramebuffer | undefined {
//         return undefined;
//     }

//     /**
//      * @override
//      *
//      * Default framebuffer cannot be deleted.
//      */
//     protected delete(): void { }

//     /**
//      * Empty initialization.
//      */
//     protected onInitialize(): void {
//         this._valid = true;
//     }

//     /**
//      * Empty uninitialization.
//      */
//     protected onUninitialize(): void {
//         this._valid = false;
//     }

//     /**
//      * Resets the size (important for valid size change detection in stages).
//      */
//     resize(): void {
//         assert(false, `the default framebuffer cannot be resized directly`);
//     }

//     /**
//      * Readonly access to the default framebuffer resolution.
//      */
//     get size(): vec2 {
//         return vec2.fromValues(this.context.gl.canvas.width, this.context.gl.canvas.height);
//     }

//     /**
//      * Convenience accessor: returns the renderable width of the canvas back buffer.
//      */
//     get width(): number {
//         return this.context.gl.canvas.width;
//     }

//     /**
//      * Convenience accessor: returns the renderable height of the canvas back buffer.
//      */
//     get height(): number {
//         return this.context.gl.canvas.height;
//     }

// }
