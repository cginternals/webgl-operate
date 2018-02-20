
import { assert } from './auxiliaries';
import { GLclampf4 } from './tuples';

import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';


/**
 * Default framebuffer with framebuffer interface. It is intended for use as default buffer binding and enables lazy
 * target size reconfiguration of stages.
 *
 * ```
 * this._someStage.frame(this._nullFBO, frameNumber, multiFrameNumber);
 * ```
 *
 * Note that this buffer does query its size from the current context's canvas.
 */
export class DefaultFramebuffer extends Framebuffer {

    /**
     * @override
     * Default framebuffer cannot be created.
     */
    protected create(): WebGLFramebuffer | undefined {
        this._object = Framebuffer.DEFAULT_FRAMEBUFFER;
        this._valid = true;

        this._clearColors = new Array<GLclampf4>(1);
        this._clearDepth = 1.0;
        this._clearStencil = 0;

        this.clear = this.es2Clear;

        return this._object;
    }

    /**
     * @override
     * Default framebuffer cannot be deleted.
     */
    protected delete(): void {
        this._object = undefined;
        this._valid = false;

        this.clear = undefined;
    }

    /**
     * @override
     * @returns - Always false, since default buffer cannot have any attachments.
     */
    protected hasAttachment(attachment: GLenum): boolean {
        return false;
    }

    /**
     * @override
     * Binds the default framebuffer object to the provided target.
     * @param target - Specifying the binding point (target).
     */
    @Initializable.assert_initialized()
    bind(target: GLenum = this.context.gl.FRAMEBUFFER): void {
        this.context.gl.bindFramebuffer(target, this._object);
    }

    /**
     * @override
     * Sets the clear color used for clearing the default color buffer. In order to have transparency working, the
     * canvas needs to have the alpha  attribute enabled. This stage also supports premultiplied alpha, which is applied
     * automatically when the context's `premultipliedAlpha` attribute is set.
     * @param color - RGBA clear color.
     */
    clearColor(color: GLclampf4): void {
        super.clearColor(color);
    }

    /**
     * Resets the size (important for valid size change detection in stages).
     */
    resize(): void {
        assert(false, `the default framebuffer cannot be resized directly`);
    }

    /**
     * Convenience accessor: returns the renderable width of the canvas back buffer.
     */
    get width(): GLsizei {
        return this.context.gl.canvas.width as GLsizei;
    }

    /**
     * Convenience accessor: returns the renderable height of the canvas back buffer.
     */
    get height(): GLsizei {
        return this.context.gl.canvas.height as GLsizei;
    }

}
