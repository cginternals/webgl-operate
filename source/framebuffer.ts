
/* spellchecker: disable */

import { assert, bitInBitfield, logIf, LogLevel } from './auxiliaries';
import { GLclampf4, GLsizei2 } from './tuples';

import { Bindable } from './bindable';
import { Context } from './context';
import { Initializable } from './initializable';
import { AbstractObject } from './object';
import { Renderbuffer } from './renderbuffer';
import { Texture2D } from './texture2d';

/* spellchecker: enable */


/**
 * WebGL Framebuffer base implementation providing size accessors and requiring for bind, unbind, resize, validity,
 * and initialization implementations.
 * ```
 * @todo add usage example
 * ```
 */
export class Framebuffer extends AbstractObject<WebGLFramebuffer> implements Bindable {

    /**
     * Default framebuffer, e.g., used for unbind.
     */
    static readonly DEFAULT_FRAMEBUFFER = undefined;


    /**
     * Access to all attached renderbuffer objects.
     */
    protected _buffersByAttachment = new Map<GLenum, Renderbuffer>();

    /**
     * Access to all attached texture objects.
     */
    protected _texturesByAttachment = new Map<GLenum, Texture2D>();

    /**
     * RGBA color, depth value, or stencil value used for clearing the
     * associated buffer.
     */
    protected _clearDepth: GLfloat;
    protected _clearStencil: GLint;
    protected _clearColors: Array<GLclampf4>;
    /**
     * Queue of all draw buffers that are to be cleared on `clear`.
     */
    protected _colorClearQueue = new Array<GLint>();

    /** @see {@link drawBuffers} */
    protected _drawBuffers = new Array<GLenum>();
    protected _drawBuffersChanged = false;

    /**
     * Depending on the webgl version and provided bitmask, clears attachments of the framebuffer. Note that this
     * function is set/unset to es2Clear or es3Clear on initialization/uninitialization.
     * @param mask - Bitmask specifying which bits are to be cleared (and thereby which attachments).
     * @param bind - Allows to skip binding the framebuffer (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the framebuffer (e.g., when binding is handled outside).
     * @param colorClearQueue - allows to specify a specific queue of color attachments to be cleared. The webgl1
     * implementation ignores this parameter. If no parameter is given, the webgl2 implementation clears all color
     * attachments.
     */
    clear: ((mask: GLbitfield, bind?: boolean, unbind?: boolean, colorClearQueue?: Array<GLint>) => void);

    /**
     * Returns a string describing the given status of a framebuffer object.
     * @param context - Context for valid GLenums.
     * @param status - A framebuffer's status.
     */
    protected static statusString(context: Context, status: GLenum): string {
        const gl = context.gl;

        switch (status) {
            case gl.FRAMEBUFFER_COMPLETE:
                return 'the framebuffer is ready to display (COMPLETE)';

            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                return 'the attachment types are mismatched or not all framebuffer attachment points are ' +
                    'framebuffer attachment complete (INCOMPLETE_ATTACHMENT)';

            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                return 'there is no attachment (INCOMPLETE_MISSING_ATTACHMENT)';

            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                return 'height and width of the attachment are not the same (INCOMPLETE_DIMENSIONS)';

            case gl.FRAMEBUFFER_UNSUPPORTED:
                return 'the format of the attachment is not supported or if depth and stencil attachments are not ' +
                    'the same renderbuffer (UNSUPPORTED)';

            case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
                return 'the values of gl.RENDERBUFFER_SAMPLES are different among attached renderbuffers, or are ' +
                    'non-zero if the attached images are a mix of renderbuffers and textures (INCOMPLETE_MULTISAMPLE)';

            default:
                assert(false, `expected known framebuffer status, given ${status}`);
                return '';
        }
    }

    /**
     * Create a framebuffer object on the GPU and attaches all given renderable objects (either renderbuffer or
     * texture) to the framebuffer object.
     * @param attachments - tuples that associate an attachment to its actual render object, either a renderbuffer or
     * texture, e.g., `[ gl.COLOR_ATTACHMENT0, someTexture ]`.
     */
    protected create(attachments: Array<[GLenum, Renderbuffer | Texture2D]>): WebGLFramebuffer | undefined {
        const gl = this._context.gl;
        const gl2facade = this.context.gl2facade;

        this._object = gl.createFramebuffer();

        /* Initialize clearing. */

        this._clearColors = new Array<GLclampf4>(gl2facade.COLOR_ATTACHMENT_MAX - gl2facade.COLOR_ATTACHMENT0);
        this._clearDepth = 1.0;
        this._clearStencil = 0;

        this.clear = this.context.isWebGL1 ? this.es2Clear : this.es3Clear;

        /* Classify color attachments in textures and renderbuffer. */

        for (const tuple of attachments) {
            const attachment = tuple[0];
            const bufferOrTexture = tuple[1];

            if (bufferOrTexture instanceof Renderbuffer) {
                this._buffersByAttachment.set(attachment, bufferOrTexture as Renderbuffer);
            } else if (bufferOrTexture instanceof Texture2D) {
                this._texturesByAttachment.set(attachment, bufferOrTexture as Texture2D);
            }

            if (attachment < gl2facade.COLOR_ATTACHMENT_MIN || attachment > gl2facade.COLOR_ATTACHMENT_MAX) {
                continue;
            }

            /* Queue color attachments for color clearing. */
            this._drawBuffers.push(attachment);

            /* Derive the draw buffer index as GLint is required for clearBuffer. */
            const index = attachment - gl.COLOR_ATTACHMENT0;
            this._colorClearQueue.push(index as GLint);
            /* Setup default clear color (required in webgl2 or drawBuffers extension). */
            this._clearColors[index] = [0.0, 0.0, 0.0, 0.0];
        }
        this._drawBuffersChanged = true;


        /* Setup attachments. */

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._object);

        this._buffersByAttachment.forEach((buffer: Renderbuffer, attachment: GLenum) => {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, buffer.object);

        });
        this._texturesByAttachment.forEach((texture: Texture2D, attachment: GLenum) => {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, texture.object, 0);
        });


        /* Check status and cache minimum renderable area. */
        const status: GLenum = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        this._valid = gl.isFramebuffer(this._object) && (status === gl.FRAMEBUFFER_COMPLETE);
        logIf(!this._valid, LogLevel.Warning, Framebuffer.statusString(this.context, status));

        gl.bindFramebuffer(gl.FRAMEBUFFER, Framebuffer.DEFAULT_FRAMEBUFFER);

        if (gl2facade.drawBuffers) {
            gl2facade.drawBuffers(this._drawBuffers);
        }

        return this._object;

    }

    /**
     * Delete the framebuffer object on the GPU. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        assert(this._object instanceof WebGLFramebuffer, `expected WebGLFramebuffer object`);
        this.context.gl.deleteFramebuffer(this._object);

        this._object = undefined;
        this._valid = false;
    }


    /**
     * WebGL1 implementation for clearing framebuffer attachments.
     * @param mask - A GLbitfield bitwise OR mask that indicates the buffers to be cleared.
     * @param bind - Allows to skip binding the framebuffer (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the framebuffer (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    protected es2Clear(mask: GLbitfield, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        const clearDepth = bitInBitfield(mask, gl.DEPTH_BUFFER_BIT);
        const clearStencil = bitInBitfield(mask, gl.STENCIL_BUFFER_BIT);
        const clearColor = bitInBitfield(mask, gl.COLOR_BUFFER_BIT);

        if (!clearColor && !clearDepth && !clearStencil) {
            return;
        }

        if (bind) {
            this.bind();
        }

        if (clearColor && this._clearColors[0] !== undefined) {
            const color = this._clearColors[0];
            gl.clearColor(color[0], color[1], color[2], color[3]);
        }
        if (clearDepth && this._clearDepth !== undefined) {
            gl.clearDepth(this._clearDepth);
        }
        if (clearStencil && this._clearStencil !== undefined) {
            gl.clearStencil(this._clearStencil);
        }

        gl.clear(mask);

        if (unbind) {
            this.unbind();
        }
    }

    /**
     * WebGL2 implementation for clearing framebuffer attachments.
     * @param mask - A GLbitfield bitwise OR mask that indicates the buffers to be cleared.
     * @param bind - Allows to skip binding the framebuffer (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the framebuffer (e.g., when binding is handled outside).
     * @param colorClearQueue - Allows to specify a specific queue of color attachments to be cleared. If no
     * parameter is given, the webgl2 implementation clears all color attachments.
     */
    @Initializable.assert_initialized()
    protected es3Clear(mask: GLbitfield, bind: boolean = true, unbind: boolean = true,
        colorClearQueue?: Array<GLint>): void {

        const gl = this.context.gl;

        const clearDepth = bitInBitfield(mask, gl.DEPTH_BUFFER_BIT);
        const clearStencil = bitInBitfield(mask, gl.STENCIL_BUFFER_BIT);
        const clearColor = bitInBitfield(mask, gl.COLOR_BUFFER_BIT);

        if (!clearColor && !clearDepth && !clearStencil) {
            return;
        }

        if (bind) {
            this.bind();
        }

        if (clearColor) {
            /* Multiple color attachments either by WebGL2 or WEBGL_draw_buffers can be expected. */

            // https://stackoverflow.com/a/48182999
            const isChrome = !!(window as any)['chrome'] &&
                (!!(window as any)['chrome']['webstore'] || !!(window as any)['chrome']['runtime']);

            if (isChrome) {
                /**
                 * Unfortunately, the clearBufferfv doesn't work in Chrome (symptom: ID buffer is not cleared), so
                 * clear every color buffer with the first clear color.
                 */
                const color = this._clearColors[0] ? this._clearColors[0] : [0.0, 0.0, 0.0, 1.0];
                gl.clearColor(color[0], color[1], color[2], color[3]);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }

            /**
             * Since for chrome, the above code cleared every color buffer with the same color, we clear again, but now
             * with the corresponding color.
             * NOTE: In chrome, we are double-clearing here. Be aware that if we remove the code above, some color
             * bufferes are not cleared at all, while using ONLY the above code would clear them with the wrong color.
             */
            for (const drawBuffer of colorClearQueue ? colorClearQueue : this._colorClearQueue) {
                gl.clearBufferfv(gl.COLOR, drawBuffer, this._clearColors[drawBuffer]);
            }

        }

        if (clearDepth && clearStencil) {
            /**
             * Unfortunately, the following code doesn't work, on Intel HD, -> fallback to WebGL 1 interface for
             * clearing depth and stencil.
             *
             * gl.clearBufferfi(gl.DEPTH_STENCIL, 0, this._clearDepth, this._clearStencil);
             */
            gl.clearStencil(this._clearStencil);
            gl.clearDepth(this._clearDepth);
            gl.clear(gl.STENCIL_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        } else if (clearDepth) {
            gl.clearBufferfv(gl.DEPTH, 0, [this._clearDepth]);

        } else if (clearStencil) {
            /**
             * Unfortunately, the following code doesn't work, at least in Chrome, -> fallback to WebGL 1 interface
             * for clearing depth and stencil.
             *
             * gl.clearBufferiv(gl.STENCIL, 0, [this._clearStencil]);
             */
            gl.clearStencil(this._clearStencil);
            gl.clear(gl.STENCIL_BUFFER_BIT);
        }

        if (unbind) {
            this.unbind();
        }
    }

    /**
     *
     * @param attachment -
     */
    protected hasAttachment(attachment: GLenum): boolean {
        return this._texturesByAttachment.has(attachment) || this._buffersByAttachment.has(attachment);
    }


    /**
     * Binds the framebuffer object as framebuffer to the provided target.
     * @param target - Specifying the binding point (target).
     */
    @Initializable.assert_initialized()
    bind(target: GLenum = this.context.gl.FRAMEBUFFER): void {
        this.context.gl.bindFramebuffer(target, this._object);

        if (this._drawBuffersChanged && this.context.gl2facade.drawBuffers) {
            this.context.gl2facade.drawBuffers(this._drawBuffers);
            this._drawBuffersChanged = false;
        }
    }

    /**
     * Binds the default back buffer as framebuffer to the provided target.
     * @param target - Specifying the binding point (target).
     */
    @Initializable.assert_initialized()
    unbind(target: GLenum = this.context.gl.FRAMEBUFFER): void {
        this.context.gl.bindFramebuffer(target, Framebuffer.DEFAULT_FRAMEBUFFER);
    }


    /**
     * Sets the clear color used for clearing a draw buffer. In order to have transparency working, the canvas needs
     * to have the alpha attribute enabled. This stage also supports premultiplied alpha, which is applied
     * automatically when the context's `premultipliedAlpha` attribute is set.
     * @param color - RGBA clear color.
     * @param drawBuffer - The draw buffer index. If no index is provided, the color will be applied to all buffers.
     */
    @Initializable.assert_initialized()
    clearColor(color: GLclampf4, drawBuffer?: GLint): void {
        assert(drawBuffer === undefined || drawBuffer === 0 || this.context.isWebGL2 ||
            this.context.supportsDrawBuffers, `WebGL2 context expected for clearing multiple color attachments.`);

        const alphaIssue: boolean = color[3] < 1.0 && !this.context.alpha;
        logIf(alphaIssue, LogLevel.Warning, `context has alpha disabled, clear color alpha is ignored`);

        const color2: GLclampf4 = [color[0], color[1], color[2], alphaIssue ? 1.0 : color[3]];

        if (this.context.premultipliedAlpha && !alphaIssue) {
            /* Premultiply alpha. */
            color2[0] *= color2[3];
            color2[1] *= color2[3];
            color2[2] *= color2[3];
        }

        /* Note that draw buffer index null is allowed, thus explicit check for undefined is required. */
        if (drawBuffer !== undefined) {
            this._clearColors[drawBuffer] = color2;
        } else {
            for (let i = 0; i < this._clearColors.length; ++i) {
                this._clearColors[i] = color2;
            }
        }
    }

    @Initializable.assert_initialized()
    clearDepth(depth: GLfloat): void {
        this._clearDepth = depth;
    }

    @Initializable.assert_initialized()
    clearStencil(stencil: GLint): void {
        this._clearStencil = stencil;
    }


    /**
     * Access to attached textures, identified by a valid framebuffer attachment.
     * @param attachment - The attachment to request the texture object of.
     * @returns - A texture object if one exists for the given attachment, otherwise undefined.
     */
    @Initializable.assert_initialized()
    texture(attachment: GLenum): Texture2D | undefined {
        return this._texturesByAttachment.get(attachment);
    }

    /**
     * Forwards a resize to all attachments, renderbuffers and textures.
     * @param width - Targeted/new width for all attachments in px.
     * @param height - Targeted/new height for all attachments in px.
     * @param bind - Allows to skip binding the specific attachment (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the specific attachment (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    resize(width: GLsizei, height: GLsizei, bind: boolean = true, unbind: boolean = true): void {
        this._buffersByAttachment.forEach((buffer: Renderbuffer) => {
            buffer.resize(width, height, bind, unbind);
        });
        this._texturesByAttachment.forEach((texture: Texture2D) => {
            texture.resize(width, height, bind, unbind);
        });
    }

    /**
     * Readonly access to the framebuffer width in pixel. If the width of the attachments are not all identical,
     * the minimal width as the renderable width of this framebuffer is returned.
     * @returns - The minimal width of the renderable width over all attachments.
     */
    get width(): GLsizei {
        this.assertInitialized();

        let width: GLsizei = NaN;
        this._buffersByAttachment.forEach((buffer: Renderbuffer) => {
            if (isNaN(width) || buffer.width < width) {
                width = buffer.width;
            }
        });
        this._texturesByAttachment.forEach((texture: Texture2D) => {
            if (isNaN(width) || texture.width < width) {
                width = texture.width;
            }
        });
        return width;
    }

    /**
     * Readonly access to the framebuffer height in pixel. If the height of the attachments are not all identical,
     * the minimal height as the renderable height of this framebuffer is returned.
     * @returns - The minimal height of the renderable height over all attachments.
     */
    get height(): GLsizei {
        this.assertInitialized();

        let height: GLsizei = NaN;
        this._buffersByAttachment.forEach((buffer: Renderbuffer) => {
            if (isNaN(height) || buffer.height < height) {
                height = buffer.height;
            }
        });
        this._texturesByAttachment.forEach((texture: Texture2D) => {
            if (isNaN(height) || texture.height < height) {
                height = texture.height;
            }
        });
        return height;
    }

    /**
     * Convenience getter for the 2-tuple containing the texture's width and height.
     * @see {@link width}
     * @see {@link heigth}
     */
    get size(): GLsizei2 {
        return [this.width, this.height];
    }


    /**
     * Set one or multiple draw buffers.
     * @param attachments - Array of attachment identifier (e.g., gl.COLOR_ATTACHMENT0).
     */
    set drawBuffers(attachments: Array<GLenum>) {
        this.assertInitialized();
        const gl2facade = this.context.gl2facade;

        for (const attachment of attachments) {
            assert(this.hasAttachment(attachment), `valid attachment expected for draw buffer, given ${attachment}`);
            assert(attachment >= gl2facade.COLOR_ATTACHMENT_MIN && attachment <= gl2facade.COLOR_ATTACHMENT_MAX,
                `color attachment expected for draw buffer, given ${attachment}`);
            this._drawBuffersChanged = this._drawBuffersChanged || this._drawBuffers.indexOf(attachment) === -1;
        }
        this._drawBuffersChanged = this._drawBuffersChanged || attachments.length !== this._drawBuffers.length;

        if (this._drawBuffersChanged) {
            this._drawBuffers = attachments;
        }
    }

    /**
     * Used to remember which attachments are available as potential draw buffers.
     */
    get drawBuffers(): Array<GLenum> {
        this.assertInitialized();
        return this._drawBuffers;
    }

}
