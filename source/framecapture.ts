
/* spellchecker: disable */

import { assert } from './auxiliaries';

import { Framebuffer } from './framebuffer';
import { DefaultFramebuffer } from './defaultframebuffer';

/* spellchecker: enable */


/**
 * Utility for capturing images directly from any framebuffer. This enables taking a screenshot bigger than the used
 * canvas. Supports capturing of only part of the framebuffer. The resulting image can be transformed to a data URL.
 * The data URL can then be used to embed the image inline in documents or to download it.
 *
 * ```
 * controller.postFrameEvent$.pipe(rxjs.operators.first()).subscribe(() => {
 *     const img = gloperate.FrameCapture.capture(renderer._defaultFBO);
 *     const data = gloperate.FrameCapture.createDataURL(img, 'image/png');
 *     console.log(data);
 * })
 * ```
 */
export class FrameCapture {

    /**
     * Creates a data URL for the given image. The data will be encoded according to type. The type defaults to png,
     * if no type is given. Quality can be only set for types using lossy compression. The default quality is 0.92.
     * @param imageData - Image to create the data URL for.
     * @param type - Optional format used for encoding.
     * @param quality - Optional quality used for lossy compression.
     */
    static createDataURL(imageData: ImageData, type?: string, quality?: number): string {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;

        canvas.width = imageData.width;
        canvas.height = imageData.height;

        context.putImageData(imageData, 0, 0);

        return canvas.toDataURL(type, quality);
    }

    /**
     * Captures the gl.BACK buffer of the default framebuffer and writes it into the given framebuffer. Sets the color
     * buffer source for the default framebuffer to gl.BACK.
     * @param rect - Part of the framebuffer to capture.
     * @param buffer - Buffer to write the data into.
     */
    protected static captureDefaultFramebuffer(framebuffer: Framebuffer, rect: FrameCapture.Rect, buffer: Uint8Array): void {
        const gl = framebuffer.context.gl;

        framebuffer.bind();
        gl.readPixels(rect.x, rect.y, rect.width, rect.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
        framebuffer.unbind();
    }

    /**
     * Captures the given attachment of the given framebuffer. Sets the color buffer source to the given attachment.
     * @param framebuffer - Framebuffer to capture.
     * @param attachment - Attachment to capture.
     * @param rect - Part of the framebuffer to capture.
     * @param buffer - Buffer to write the data into.
     */
    protected static captureFramebuffer(framebuffer: Framebuffer, attachment: GLenum,
        rect: FrameCapture.Rect, buffer: Uint8Array): void {
        const gl = framebuffer.context.gl;

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
     * Flips the given image data vertically.
     * @param imageData - Image data to flip.
     */
    static flipImageDataVertically(imageData: ImageData): void {
        const rows = imageData.height;
        const elementsPerRow = imageData.data.length / rows;

        const rEnd = Math.floor(rows / 2.0);
        for (let r = 0; r < rEnd; ++r) {

            const temp = imageData.data.slice(r * elementsPerRow, (r + 1) * elementsPerRow);
            imageData.data.copyWithin(r * elementsPerRow, (rows - r - 1) * elementsPerRow, (rows - r) * elementsPerRow);
            imageData.data.set(temp, (rows - r - 1) * elementsPerRow);
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
    static capture(framebuffer: Framebuffer | DefaultFramebuffer, attachment?: GLenum,
        rect?: FrameCapture.Rect): ImageData {
        const gl = framebuffer.context.gl;

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
            FrameCapture.captureDefaultFramebuffer(framebuffer, rect, buffer);
        } else if (framebuffer instanceof Framebuffer) {
            FrameCapture.captureFramebuffer(framebuffer, attachment, rect, buffer);
        }

        framebuffer.unbind(gl.READ_FRAMEBUFFER);

        FrameCapture.flipImageDataVertically(imageData);
        return imageData;
    }
}


export namespace FrameCapture {

    export interface Rect {
        x: number,
        y: number,
        width: number,
        height: number
    }

}
