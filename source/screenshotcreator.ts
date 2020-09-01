
/* spellchecker: disable */

import { assert } from './auxiliaries';

import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { DefaultFramebuffer } from './defaultframebuffer';

/* spellchecker: enable */


/**
 * Utility for capturing images directly from any framebuffer. This enables taking a screenshot bigger than the used
 * canvas. Supports capturing of only part of the framebuffer. The resulting image can be transformed to a data URL.
 * The data URL can then be used to embed the image inline in documents or to download it.
 *
 * ```
 * const screenshotCreator = new ScreenshotCreator(context);
 * const image = screenshotCreator.capture(accumulateFramebuffer, gl.COLOR_ATTACHMENT0);
 * const dataURL = ScreenshotCreator.createDataURL(image);
 * ```
 */
export class ScreenshotCreator {
    /**
     * Read-only access to the objects context, used to get WebGL API access.
     */
    protected _context: Context;

    /**
     * Creates a data URL for the given image. The data will be encoded according to type. The type defaults to png,
     * if no type is given. Quality can be only set for types using lossy compression. The default quality is 0.92.
     * @param imageData - Image to create the data URL for.
     * @param type - Optional format used for encoding.
     * @param quality - Optional quality used for lossy compression.
     */
    static createDataURL(imageData: ImageData, type?: string, quality?: number): void {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;

        canvas.width = imageData.width;
        canvas.height = imageData.height;

        context.putImageData(imageData, 0, 0);

        const image = new Image();
        image.src = canvas.toDataURL(type, quality);
    }

    constructor(context: Context) {
        this._context = context;
    }

    /**
     * Captures the gl.BACK buffer of the default framebuffer and writes it into the given framebuffer. Sets the color
     * buffer source for the default framebuffer to gl.BACK.
     * @param rect - Part of the framebuffer to capture.
     * @param buffer - Buffer to write the data into.
     */
    protected captureDefaultFramebufferIntoBuffer(rect: ScreenshotCreator.Rect, buffer: Uint8Array): void {
        const gl = this._context.gl;

        gl.readBuffer(gl.BACK);
        gl.readPixels(rect.x, rect.y, rect.width, rect.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    }

    /**
     * Captures the given attachment of the given framebuffer. Sets the color buffer source to the given attachment.
     * @param framebuffer - Framebuffer to capture.
     * @param attachment - Attachment to capture.
     * @param rect - Part of the framebuffer to capture.
     * @param buffer - Buffer to write the data into.
     */
    protected captureFramebufferIntoBuffer(framebuffer: Framebuffer, attachment: GLenum,
        rect: ScreenshotCreator.Rect, buffer: Uint8Array): void {
        const gl = this._context.gl;

        const texture = framebuffer.texture(attachment);
        assert(texture !== undefined, `Framebuffer does not have given attachment ${attachment}.`);
        assert(texture!.format === gl.RGBA, `Unsupported texture format ${texture!.format}.`);
        assert(texture!.type === gl.UNSIGNED_BYTE || texture!.type === gl.FLOAT || texture!.type === gl.HALF_FLOAT,
            `Unsupported texture type ${texture!.type}.`);

        gl.readBuffer(attachment);

        if (texture!.type === gl.FLOAT || texture!.type === gl.HALF_FLOAT) {
            const tempBuffer = new Float32Array(rect.width * rect.height * 4);
            gl.readPixels(rect.x, rect.y, rect.width, rect.height, gl.RGBA, gl.FLOAT, tempBuffer);

            tempBuffer.forEach((value: number, index: number) => {
                buffer[index] = value * 255;
            });
        } else if (texture!.type === gl.UNSIGNED_BYTE) {
            gl.readPixels(rect.x, rect.y, rect.width, rect.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
        }
    }

    /**
     * Flips the given image vertically.
     * @param imageData - Image to flip.
     */
    protected flipImageDataVertically(imageData: ImageData): void {
        const buffer = new Uint32Array(imageData.data.buffer);
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < Math.floor(height / 2); y++) {
            for (let x = 0; x < width; x++) {
                const top = x + y * width;
                const bot = x + (height - y) * width;

                const temp = buffer[top];
                buffer[top] = buffer[bot];
                buffer[bot] = temp;
            }
        }
    }

    /**
     * Captures (part of) the given attachment of a framebuffer. The format of the underlying texture has to be gl.RGBA
     * and the type has to be either gl.UNSIGNED_BYTE, gl.HALF_FLOAT or gl.FLOAT.
     * @param framebuffer - Framebuffer to capture.
     * @param attachment - Optional attachment to capture from. Is ignored for the default framebuffer.
     * @param rect - Optional part of the framebuffer to capture.
     * @returns - The captured image.
     */
    capture(framebuffer: Framebuffer | DefaultFramebuffer, attachment?: GLenum,
        rect?: ScreenshotCreator.Rect): ImageData {
        const gl = this._context.gl;

        const framebufferSize = framebuffer.size;
        if (rect === undefined) {
            rect = { x: 0, y: 0, width: framebufferSize[0], height: framebufferSize[1] };
        }

        if (attachment === undefined) {
            attachment = gl.COLOR_ATTACHMENT0 as GLenum;
        }

        const imageData = new ImageData(rect.width, rect.height);
        const buffer = new Uint8Array(imageData.data.buffer);

        framebuffer.bind(gl.READ_FRAMEBUFFER);

        if (framebuffer instanceof DefaultFramebuffer) {
            this.captureDefaultFramebufferIntoBuffer(rect, buffer);
        } else if (framebuffer instanceof Framebuffer) {
            this.captureFramebufferIntoBuffer(framebuffer, attachment, rect, buffer);
        }

        framebuffer.unbind(gl.READ_FRAMEBUFFER);

        this.flipImageDataVertically(imageData);

        return imageData;
    }
}

export namespace ScreenshotCreator {
    export interface Rect {
        x: number,
        y: number,
        width: number,
        height: number
    }
}
