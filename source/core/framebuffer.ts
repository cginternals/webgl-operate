
// import { assert, bitInBitfield, log_if, LogLevel } from './auxiliaries';

// import { Bindable } from './bindable';
// import { Initializable } from './initializable';
// import { AbstractObject } from './object';
// import { Renderbuffer } from './renderbuffer';
// import { Texture2 } from './texture2';


// /**
//  * WebGL Framebuffer base implementation providing size accessors and requiring for bind, unbind, resize, validity,
//  * and initialization implementations.
//  */
// export class Framebuffer extends AbstractObject<WebGLFramebuffer> implements Bindable {

//     /**
//      * Default framebuffer, e.g., used for unbind.
//      */
//     static readonly DEFAULT_FRAMEBUFFER = undefined;


//     /**
//      * Access to all attached renderbuffer objects.
//      */
//     protected _buffersByAttachment = new Map<GLenum, Renderbuffer>();

//     /**
//      * Access to all attached texture objects.
//      */
//     protected _texturesByAttachment = new Map<GLenum, Texture2>();

//     /**
//      * RGBA color, depth value, or stencil value used for clearing the
//      * associated buffer.
//      */
//     protected _clearDepth: GLfloat;
//     protected _clearStencil: GLint;
//     protected _clearColors: GLclampf3Array<GLclampf> = new Array<number>(3);
//     /**
//      * Queue of all draw buffers that are to be cleared on `clear`.
//      */
//     protected _colorClearQueue = new Array<GLint>();

//     /**
//      * Used to remember which attachments are available as potential draw buffers.
//      */
//     protected _drawBuffers = new Array<GLenum>();
//     protected _drawBuffersChanged = false;

//     /**
//      * Depending on the webgl version and provided bitmask, clears attachments of the framebuffer.
//      * Note that this function is set/unset to gl1Clear or gl2Clear on initialization/uninitialization.
//      *
//      * @param mask - Bitmask specifying which bits are to be cleared (and thereby which attachments).
//      * @param bind - Allows to skip binding the framebuffer (e.g., when binding is handled outside).
//      * @param unbind - Allows to skip unbinding the framebuffer (e.g., when binding is handled outside).
//      * @param colorClearQueue - allows to specify a specific queue of color attachments to be cleared. The webgl1
//      * implementation ignores this parameter. If no parameter is given, the webgl2 implementation clears all color
//      * attachments.
//      */
//     clear: ((mask: GLbitfield, bind: boolean, unbind: boolean, colorClearQueue?: Array<GLint>) => void) | undefined;

//     /**
//      * Create a framebuffer object on the GPU.
//      */
//     protected create(): WebGLFramebuffer | undefined {
//         return this.context.gl.createFramebuffer();
//     }

//     /**
//      * Delete the framebuffer object on the GPU.
//      * This should have the reverse effect of ```create```.
//      */
//     protected delete(): void {
//         this.context.gl.deleteFramebuffer(this._object);
//     }

//     /**
//      * Attaches all given renderable objects (either renderbuffer or texture) to the framebuffer object.
//      *
//      * @param attachments - tuples that associate an attachment to its actual render object, either a renderbuffer or
//      * texture, e.g., ```[ gl.COLOR_ATTACHMENT0, someTexture ]```.
//      */
//     protected onInitialize(attachments: Array<[GLenum, Renderbuffer | Texture2]>): void {
//         const gl = this.context.gl;
//         const gl2facade = this.context.gl2facade;

//         // Initialize clearing.

//         this._clearColors = new Array<vec4>(gl2facade.COLOR_ATTACHMENT_MAX - gl2facade.COLOR_ATTACHMENT0);
//         this._clearDepth = 1.0;
//         this._clearStencil = 0;

//         if (this.context.isWebGL1) {
//             this.clear = this.es2Clear;
//         } else {
//             this.clear = this.es3Clear;
//         }

//         // Classify color attachments in textures and renderbuffer.

//         for (const tuple of attachments) {
//             const attachment = tuple[0];
//             const bufferOrTexture = tuple[1];

//             if (bufferOrTexture instanceof Renderbuffer) {
//                 this._buffersByAttachment.set(attachment, bufferOrTexture as Renderbuffer);
//             } else if (bufferOrTexture instanceof Texture2) {
//                 this._texturesByAttachment.set(attachment, bufferOrTexture as Texture2);
//             }

//             if (attachment < gl2facade.COLOR_ATTACHMENT_MIN || attachment > gl2facade.COLOR_ATTACHMENT_MAX) {
//                 continue;
//             }

//             // Queue color attachments for color clearing.
//             this._drawBuffers.push(attachment);

//             // Derive the draw buffer index as GLint is required for clearBuffer
//             const index = attachment - gl.COLOR_ATTACHMENT0;
//             this._colorClearQueue.push(index as GLint);
//             // setup default clear color (required in webgl2 or drawBuffers extension)
//             this._clearColors[index] = vec4.create();
//         }
//         this._drawBuffersChanged = true;

//         // Setup attachments.

//         this.bind();

//         this._buffersByAttachment.forEach((buffer: Renderbuffer, attachment: GLenum) => {
//             gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, buffer.object);
//         });
//         this._texturesByAttachment.forEach((texture: Texture2, attachment: GLenum) => {
//             gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, texture.object, 0);
//         });

//         if (gl2facade.drawBuffers) {
//             gl2facade.drawBuffers(this._drawBuffers);
//         }

//         // Check status and cache minimum renderable area.

//         const status: GLenum = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
//         this._valid = gl.isFramebuffer(this._object) && (status === gl.FRAMEBUFFER_COMPLETE);

//         this.unbind();
//     }

//     /**
//      * Uninitialize the framebuffer object (webgl object will not be deleted).
//      */
//     protected onUninitialize(): void {
//         this.clear = undefined;
//     }


//     /**
//      * WebGL1 implementation for clearing framebuffer attachments.
//      * @param mask - A GLbitfield bitwise OR mask that indicates the buffers to be cleared.
//      * @param bind - Allows to skip binding the framebuffer (e.g., when binding is handled outside).
//      * @param unbind - Allows to skip unbinding the framebuffer (e.g., when binding is handled outside).
//      */
//     @assert_initialized()
//     protected es2Clear(mask: GLbitfield, bind: boolean = true, unbind: boolean = true): void {
//         const gl = this.context.gl;

//         const clearDepth = bitInBitfield(mask, gl.DEPTH_BUFFER_BIT);
//         const clearStencil = bitInBitfield(mask, gl.STENCIL_BUFFER_BIT);
//         const clearColor = bitInBitfield(mask, gl.COLOR_BUFFER_BIT);

//         if (!clearColor && !clearDepth && !clearStencil) {
//             return;
//         }

//         if (bind) {
//             this.bind();
//         }

//         if (clearColor && this._clearColors[0] !== undefined) {
//             const color = this._clearColors[0];
//             gl.clearColor(color[0], color[1], color[2], color[3]);
//         }
//         if (clearDepth && this._clearDepth !== undefined) {
//             gl.clearDepth(this._clearDepth);
//         }
//         if (clearStencil && this._clearStencil !== undefined) {
//             gl.clearStencil(this._clearStencil);
//         }

//         gl.clear(mask);

//         if (unbind) {
//             this.unbind();
//         }
//     }

//     /**
//      * WebGL2 implementation for clearing framebuffer attachments.
//      * @param mask - A GLbitfield bitwise OR mask that indicates the buffers to be cleared.
//      * @param bind - Allows to skip binding the framebuffer (e.g., when binding is handled outside).
//      * @param unbind - Allows to skip unbinding the framebuffer (e.g., when binding is handled outside).
//      * @param colorClearQueue - Allows to specify a specific queue of color attachments to be cleared. If no
//      * parameter is given, the webgl2 implementation clears all color attachments.
//      */
//     @assert_initialized()
//     protected es3Clear(mask: GLbitfield, bind: boolean = true, unbind: boolean = true
//         , colorClearQueue?: Array<GLint>): void {
//         const gl = this.context.gl;

//         const clearDepth = bitInBitfield(mask, gl.DEPTH_BUFFER_BIT);
//         const clearStencil = bitInBitfield(mask, gl.STENCIL_BUFFER_BIT);
//         const clearColor = bitInBitfield(mask, gl.COLOR_BUFFER_BIT);

//         if (!clearColor && !clearDepth && !clearStencil) {
//             return;
//         }

//         if (bind) {
//             this.bind();
//         }

//         if (clearColor) {
//             // Multiple color attachments either by WebGL2 or WEBGL_draw_buffers can be expected.
//             for (const drawBuffer of colorClearQueue ? colorClearQueue : this._colorClearQueue) {
//                 gl.clearBufferfv(gl.COLOR, drawBuffer, this._clearColors[drawBuffer]);
//             }
//         }

//         if (clearDepth && clearStencil) {
//             /**
//              * Unfortunately, the following code doesn't work, on Intel HD, -> fallback to WebGL 1 interface for
//              * clearing depth and stencil.
//              */
//             // gl.clearBufferfi(gl.DEPTH_STENCIL, 0, this._clearDepth, this._clearStencil);
//             gl.clearStencil(this._clearStencil);
//             gl.clearDepth(this._clearDepth);
//             gl.clear(gl.STENCIL_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//         } else if (clearDepth) {
//             gl.clearBufferfv(gl.DEPTH, 0, [this._clearDepth]);

//         } else if (clearStencil) {
//             /**
//              * Unfortunately, the following code doesn't work, at least in Chrome, -> fallback to WebGL 1 interface
//              * for clearing depth and stencil.
//              */
//             // gl.clearBufferiv(gl.STENCIL, 0, [this._clearStencil]);
//             gl.clearStencil(this._clearStencil);
//             gl.clear(gl.STENCIL_BUFFER_BIT);
//         }

//         if (unbind) {
//             this.unbind();
//         }
//     }

//     /**
//      *
//      * @param attachment -
//      */
//     protected hasAttachment(attachment: GLenum): boolean {
//         return this._texturesByAttachment.has(attachment) || this._buffersByAttachment.has(attachment);
//     }


//     /**
//      * Binds the framebuffer object as framebuffer to the provided target.
//      * @param target - Specifying the binding point (target).
//      */
//     @assert_initialized()
//     bind(target: GLenum = this.context.gl.FRAMEBUFFER): void {
//         this.context.gl.bindFramebuffer(target, this._object);

//         if (this._drawBuffersChanged && this.context.gl2facade.drawBuffers) {
//             this.context.gl2facade.drawBuffers(this._drawBuffers);
//             this._drawBuffersChanged = false;
//         }
//     }

//     /**
//      * Binds the default back buffer as framebuffer to the provided target.
//      * @param target - Specifying the binding point (target).
//      */
//     @assert_initialized()
//     unbind(target: GLenum = this.context.gl.FRAMEBUFFER): void {
//         this.context.gl.bindFramebuffer(target, Framebuffer.DEFAULT_FRAMEBUFFER);
//     }


//     /**
//      * Sets the clear color used for clearing a draw buffer. In order to have transparency working, the canvas needs
//      * to have the alpha  attribute enabled. This stage also supports premultiplied alpha, which is applied
//      * automatically when the context's `premultipliedAlpha` attribute is set.
//      * @param drawBuffer - The draw buffer index.
//      * @param color - RGBA clear color.
//      */
//     @assert_initialized()
//     clearColor(drawBuffer: GLint, color: vec4): void {
//         assert(drawBuffer === 0 || this.context.isWebGL2 || this.context.supportsDrawBuffers
//             , `WebGL2 context expected for clearing multiple color attachments.`);

//         const alphaIssue: boolean = color[3] < 1.0 && !this.context.alpha;
//         log_if(alphaIssue, LogLevel.Dev, `context has alpha disabled, clear color alpha is ignored`);

//         const color2 = vec4.create();
//         vec4.copy(color2, color);

//         if (alphaIssue) {
//             color2[3] = 1.0;
//         }
//         if (this.context.premultipliedAlpha && !alphaIssue) {
//             // premultiply alpha
//             color2[0] *= color2[3];
//             color2[1] *= color2[3];
//             color2[2] *= color2[3];
//         }

//         if (this._clearColors[drawBuffer] === undefined) {
//             this._clearColors[drawBuffer] = color2;
//         } else {
//             vec4.copy(this._clearColors[drawBuffer], color2);
//         }
//     }

//     @assert_initialized()
//     clearDepth(depth: GLfloat): void {
//         this._clearDepth = depth;
//     }

//     @assert_initialized()
//     clearStencil(stencil: GLint): void {
//         this._clearStencil = stencil;
//     }


//     /**
//      * Access to attached textures, identified by a valid framebuffer attachment.
//      * @param attachment - The attachment to request the texture object of.
//      * @returns A texture object if one exists for the given attachment, otherwise undefined.
//      */
//     @assert_initialized()
//     texture(attachment: GLenum): Texture2 | undefined {
//         if (!this._texturesByAttachment.has(attachment)) {
//             return undefined;
//         }
//         return this._texturesByAttachment.get(attachment);
//     }

//     /**
//      * Forwards a resize to all attachments, renderbuffers and textures.
//      * @param width - Targeted/new width for all attachments in px.
//      * @param height - Targeted/new height for all attachments in px.
//      * @param bind - Allows to skip binding the specific attachment (e.g., when binding is handled outside).
//      * @param unbind - Allows to skip unbinding the specific attachment (e.g., when binding is handled outside).
//      */
//     @assert_initialized()
//     resize(width: GLsizei, height: GLsizei, bind: boolean = true, unbind: boolean = true): void {
//         this._buffersByAttachment.forEach((buffer: Renderbuffer) => {
//             buffer.resize(width, height, bind, unbind);
//         });
//         this._texturesByAttachment.forEach((texture: Texture2) => {
//             texture.resize(width, height, bind, unbind);
//         });
//     }

//     /**
//      * Readonly access to the framebuffer resolution in pixel. If the sizes of the attachments are not all identical,
//      * the minimal width and height as the renderable size/area of this framebuffer is returned as size.
//      * @returns The minimal size of the renderable size over all attachments.
//      */
//     get width(): vec2 {
//         this.assertInitialized();

//         const size: vec2 = vec2.fromValues(undefined, undefined);

//         this._buffersByAttachment.forEach((buffer: Renderbuffer) => {
//             if (isNaN(size[0]) || buffer.width < size[0]) {
//                 size[0] = buffer.width;
//             }
//             if (isNaN(size[1]) || buffer.height < size[1]) {
//                 size[1] = buffer.height;
//             }
//         });
//         this._texturesByAttachment.forEach((texture: Texture2) => {
//             if (isNaN(size[0]) || texture.width < size[0]) {
//                 size[0] = texture.width;
//             }
//             if (isNaN(size[1]) || texture.height < size[1]) {
//                 size[1] = texture.height;
//             }
//         });

//         return size;
//     }


//     /**
//      * Set one or multiple draw buffers.
//      * @param attachments - Array of attachment identifier (e.g., gl.COLOR_ATTACHMENT0).
//      */
//     set drawBuffers(attachments: Array<GLenum>) {
//         const gl2facade = this.context.gl2facade;

//         for (const attachment of attachments) {
//             assert(this.hasAttachment(attachment), `valid attachment expected for draw buffer, given ${attachment}`);
//             assert(attachment >= gl2facade.COLOR_ATTACHMENT_MIN && attachment <= gl2facade.COLOR_ATTACHMENT_MAX
//                 , `color attachment expected for draw buffer, given ${attachment}`);
//             this._drawBuffersChanged = this._drawBuffersChanged || this._drawBuffers.indexOf(attachment) === -1;
//         }
//         this._drawBuffersChanged = this._drawBuffersChanged || attachments.length !== this._drawBuffers.length;

//         if (this._drawBuffersChanged) {
//             this._drawBuffers = attachments;
//         }
//     }

//     get drawBuffers(): Array<GLenum> {
//         return this._drawBuffers;
//     }

// }
