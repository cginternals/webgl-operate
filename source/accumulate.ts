
// import { vec2 } from 'gl-matrix';
// import { assert, log_if, LogLevel } from '../core/common';

// import { Context } from '../core/context';
// import { Stage } from '../core/stage';

// import { Framebuffer } from '../core/framebuffer';
// import { Program } from '../core/program';
// import { Renderbuffer } from '../core/renderbuffer';
// import { Texture2 } from '../core/texture';

// import { ScreenAlignedTriangle, ScreenAlignedTriangleDrawable } from '../assets/screenalignedtriangle';


// /**
//  * This stage accumulates the color attachment 0 of a framebuffer, e.g., the result of an intermediate frame, into an
//  * accumulation buffer. For accumulation the frame number is used to derive the accumulation weight. For rendering to
//  * texture, a textured screen-aligned triangle is used to reduce rasterization overhead of quad diagonals.
//  *
//  * The accumulation stage can be used as follows:
//  * ```
//  * this.accumulationStage.framebuffer = this.intermediateFBO;
//  * this.accumulationStage.frame(this.defaultFBO, frameNumber, multiFrameNumber);
//  * ```
//  */
// export class AccumulationStage extends Stage {

//     /**
//      * Used to resize the accumulation framebuffers when passthrough is active.
//      */
//     protected static readonly MIN_SIZE = vec2.fromValues(1.0, 1.0);

//     /**
//      * Texture that is to be accumulated.
//      */
//     protected _framebuffer: Framebuffer;

//     /**
//      * Current frame number.
//      *
//      * This is used to select the current read and write framebuffer as well as the current frame weight.
//      */
//     protected _frameNumber: number;

//     /**
//      * Derived accumulation format as string: valid values are 'float', 'half', and 'byte'.
//      */
//     protected _accumulationFormat: string;

//     /**
//      * Two rgba-framebuffers used for accumulation (buffer ping-ponging is used for alternating the buffers for read
//      * and write access due to a limitation in WebGL).
//      */
//     protected accumulationFBOs: Array<Framebuffer>;
//     protected accumulationTextures: Array<Texture2>;

//     protected passthrough: boolean;

//     /**
//      * Stores the index of the last buffer written to.
//      */
//     protected write: number;

//     protected saTriangleDrawable = new ScreenAlignedTriangleDrawable();

//     protected program: Program;

//     protected uWeight: WebGLUniformLocation;

//     /**
//      * Specializes this stage's initialization. This stage requires screen-aligned triangle geometry, a single program,
//      * and two accumulation framebuffers for ping pong (simultaneous read and write is currently not allowed by webgl).
//      * All attribute and dynamic uniform locations are cached.
//      *
//      * @param context - Wrapped gl context for function resolution (passed to all stages).
//      */
//     protected onInitialize(context: Context): void {
//         super.onInitialize(context);
//         const gl = this.context.gl;

//         // create and initialize accumulation texture and fbos

//         this.accumulationFBOs = [
//             new Framebuffer(this.context, 'AccumPingFBO'),
//             new Framebuffer(this.context, 'AccumPongFBO')];

//         this.accumulationTextures = [
//             new Texture2(this.context, 'AccumPingRenderTexture'),
//             new Texture2(this.context, 'AccumPongRenderTexture')];

//         // Initialize the accumulation textures for lowest precision.
//         this.accumulationFormat = 'byte';

//         this.program = new Program(context, 'AccumulationProgram');
//         this.program.initialize([require('../shaders/screenaligned.vert')], [require('../shaders/accumulation.frag')]);

//         this.uWeight = this.program.uniform('u_weight');
//         const uAccumulationTexture = this.program.uniform('u_accumulationTexture');
//         const uCurrentFrameTexture = this.program.uniform('u_currentFrameTexture');

//         this.program.bind();
//         gl.uniform1f(this.uWeight, 0.0);
//         gl.uniform1i(uAccumulationTexture, 0);
//         gl.uniform1i(uCurrentFrameTexture, 1);
//         this.program.unbind();
//     }

//     /**
//      * Specializes this stage's uninitialization. Program and framebuffer resources are released. Cached uniform and
//      * attribute locations are invalidated.
//      */
//     protected onUninitialize() {
//         this.write = undefined;

//         this.accumulationFBOs[0].uninitialize();
//         this.accumulationFBOs[0] = undefined;
//         this.accumulationFBOs[1].uninitialize();
//         this.accumulationFBOs[1] = undefined;

//         this.accumulationTextures[0].uninitialize();
//         this.accumulationTextures[0] = undefined;
//         this.accumulationTextures[1].uninitialize();
//         this.accumulationTextures[1] = undefined;

//         if (this.saTriangleDrawable.initialized) {
//             this.saTriangleDrawable.uninitialize();
//         }

//         this._framebuffer = undefined;

//         this.uWeight = undefined;
//         this.program.uninitialize();

//         super.onUninitialize();
//     }

//     /**
//      * An accumulation frame binds the two accumulation textures (ping-pong framebuffer), one for read, the other for
//      * write/accumulating into. A screen-aligned triangle is used to fill the viewport and mix the input texture with
//      * the weight of 1 / (frameNumber + 1) with the previous accumulation result.
//      */
//     onFrame() {
//         assert(this._framebuffer !== undefined && this._framebuffer.valid,
//             `valid framebuffer for accumulation expected`);

//         if (this.passthrough) {
//             return;
//         }

//         const gl = this.context.gl;
//         const gl2facade = this.context.gl2facade;

//         const size = this._framebuffer.size;

//         assert(this.accumulationFBOs[0].valid && this.accumulationFBOs[1].valid,
//             `valid accumulation framebuffers expected`);

//         if (!vec2.exactEquals(size, this.accumulationTextures[0].size)) {
//             /**
//              * Change the size of the accumulation buffer. Note: the frame buffer are not uninitialized, since
//              * re-initialization is supported, favoring object reuse.
//              */
//             this.accumulationTextures[0].resize(size);
//             this.accumulationTextures[1].resize(size);
//         }

//         const readIndex = this._frameNumber % 2;
//         const writeIndex = this.write = 1 - readIndex;

//         gl.viewport(0, 0, size[0], size[1]);

//         const accumTexture = this.accumulationTextures[readIndex];
//         const frameTexture = this._framebuffer.texture(gl2facade.COLOR_ATTACHMENT0);

//         accumTexture.bind(gl.TEXTURE0);
//         frameTexture.bind(gl.TEXTURE1);

//         this.program.bind();
//         gl.uniform1f(this.uWeight, 1.0 / (this._frameNumber + 1));

//         this.accumulationFBOs[writeIndex].bind(gl.DRAW_FRAMEBUFFER); // bind draw only does not work for IE and EDGE
//         this.saTriangleDrawable.draw();
//         this.accumulationFBOs[writeIndex].unbind(gl.DRAW_FRAMEBUFFER);

//         /* Every stage is expected to bind its own program when drawing, thus, unbinding is not necessary. */
//         // this.program.unbind();

//         accumTexture.unbind(gl.TEXTURE0);
//         frameTexture.unbind(gl.TEXTURE1);
//     }

//     set multiFrameNumber(multiFrameNumber: number) {
//         const passthrough = this.passthrough;
//         this.passthrough = multiFrameNumber === 1;

//         if (this.passthrough && !passthrough) {
//             this.accumulationFBOs[0].resize(AccumulationStage.MIN_SIZE);
//             this.accumulationFBOs[1].resize(AccumulationStage.MIN_SIZE);
//         }
//     }

//     set frameNumber(frameNumber: number) {
//         this._frameNumber = frameNumber;
//     }

//     /**
//      * Queries and caches the preferred accumulation format for this context. If no data-attribute is set, 'auto' is
//      * assumed and the maximum accuracy supported is used.
//      *
//      * @param format - data-accumulation-format of the canvas element or direct format identifier, i.e.,
//      * 'auto', 'float', 'half', 'byte'
//      */
//     set accumulationFormat(format: string) {
//         const gl = this.context.gl;
//         const gl2facade = this.context.gl2facade;

//         let internalFormat: GLenum = gl.RGBA;
//         let type: GLenum = gl.UNSIGNED_BYTE;

//         /**
//          * in WebGL1 contexts, OES_texture_float always implies WEBGL_color_buffer_float and OES_texture_half_float
//          * implies EXT_color_buffer_half_float.
//          */
//         const floatWriteSupport = (this.context.isWebGL1 && this.context.supportsTextureFloat) ||
//             (this.context.isWebGL2 && this.context.supportsColorBufferFloat);
//         const halfWriteSupport = (this.context.isWebGL1 && this.context.supportsTextureHalfFloat) ||
//             (this.context.isWebGL2 && this.context.supportsColorBufferFloat);

//         // in the cas of string argument, parse and check for validity
//         let request: string = /^(byte|half|float|auto)$/.test(format) ? format : 'auto';

//         if (request === 'auto') { // derive maximum supported write to texture/buffer format.
//             request = floatWriteSupport ? 'float' : halfWriteSupport ? 'half' : 'byte';
//         }

//         if (request === 'half' && halfWriteSupport) {
//             type = gl2facade.HALF_FLOAT;
//         } else if ((request === 'float' || request === 'half') && floatWriteSupport) {
//             // if not explicitly requested, fallback for half_float
//             type = gl.FLOAT;
//         } else {
//             // if not explicitly requested, fallback for float
//             type = gl.UNSIGNED_BYTE;
//         }

//         // enable required extension
//         switch (type) {
//             case gl.FLOAT:
//                 this._accumulationFormat = 'float';
//                 /* tslint:disable-next-line:no-unused-expression */
//                 this.context.isWebGL2 ? this.context.colorBufferFloat : this.context.textureFloat;
//                 internalFormat = this.context.isWebGL2 ? gl.RGBA32F : gl.RGBA;
//                 break;

//             case gl2facade.HALF_FLOAT:
//                 this._accumulationFormat = 'half';
//                 /* tslint:disable-next-line:no-unused-expression */
//                 this.context.isWebGL2 ? this.context.colorBufferFloat : this.context.textureHalfFloat;
//                 internalFormat = this.context.isWebGL2 ? gl.RGBA16F : gl.RGBA;
//                 break;

//             default:
//                 this._accumulationFormat = 'byte';
//                 internalFormat = this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA;
//         }

//         log_if(request !== this._accumulationFormat, LogLevel.Dev,
//             `accumulation format changed to '${this._accumulationFormat}', ` + `given '${format}'`);

//         if (this.accumulationTextures[0].initialized) {
//             this.accumulationTextures[0].reformat(internalFormat, gl.RGBA, type);
//         } else {
//             this.accumulationTextures[0].initialize(AccumulationStage.MIN_SIZE, internalFormat, gl.RGBA, type);
//         }
//         if (this.accumulationTextures[1].initialized) {
//             this.accumulationTextures[1].reformat(internalFormat, gl.RGBA, type);
//         } else {
//             this.accumulationTextures[1].initialize(AccumulationStage.MIN_SIZE, internalFormat, gl.RGBA, type);
//         }

//     }

//     get accumulationFormat(): string {
//         return this._accumulationFormat;
//     }

//     /**
//      * Sets the framebuffer that is to be accumulated.
//      *
//      * @param framebuffer - Framebuffer that is to be accumulated.
//      */
//     set framebuffer(framebuffer: Framebuffer) {
//         this._framebuffer = framebuffer;
//     }

//     set depthStencilAttachment(depthStencilAttachment: Texture2 | Renderbuffer) {
//         const gl = this.context.gl;
//         const gl2facade = this.context.gl2facade;

//         this.accumulationTextures[0].resize(depthStencilAttachment.size);
//         this.accumulationTextures[1].resize(depthStencilAttachment.size);

//         this.accumulationFBOs[0].initialize([[gl2facade.COLOR_ATTACHMENT0, this.accumulationTextures[0]]
//             , [gl.DEPTH_STENCIL_ATTACHMENT, depthStencilAttachment]]);
//         this.accumulationFBOs[1].initialize([[gl2facade.COLOR_ATTACHMENT0, this.accumulationTextures[1]]
//             , [gl.DEPTH_STENCIL_ATTACHMENT, depthStencilAttachment]]);
//     }

//     /**
//      * Returns the framebuffer last accumulated into. Note: the accumulation
//      * buffer is represented by two framebuffers swapped for read and write
//      * every frame. The accumulation result is in the first color attachment.
//      *
//      * @returns The rgba framebuffer last accumulated into.
//      */
//     get accumulated(): Framebuffer {
//         return this.passthrough ? this._framebuffer : this.accumulationFBOs[this.write];
//     }

//     /**
//      * Geometry used to draw on, not provided internally to allow for geometry sharing.
//      *
//      * @param saTriangle - Screen-aligned triangle to render a full viewport.
//      */
//     set saTriangle(saTriangle: ScreenAlignedTriangle) {
//         this.saTriangleDrawable.initialize(this.context, saTriangle, this.program.attribute('a_vertex', 0));
//     }

// }
