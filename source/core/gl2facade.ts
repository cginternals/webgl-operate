

// import { assert } from './common';

// import { BackendType, Context } from './context';


// /**
//  * A WebGL 2 facade, simplifying the access to gl functions that are either not available, exposed via extension or
//  * supported directly, e.g., in webgl2. All gl features/interfaces handled by this facade are mandatory.
//  *
//  * This facade currently comprises the following interfaces:
//  * - COLOR_ATTACHMENT enumerators
//  * - half_float
//  * - instanced_arrays
//  */
// export class GL2Facade {

//     /* tslint:disable:member-ordering variable-name */

//     /**
//      * @param context - Wrapped gl context for function resolution.
//      * @param extensions - Identifiers of mandatory extensions for which the support is asserted.
//      */
//     constructor(context: Context) {
//         assert(context !== undefined, `gl2 facade expects a valid webgl context`);

//         this.queryColorAttachments(context);

//         this.queryHalfFloatSupport(context);
//         this.queryInstancedArraySupport(context);
//         this.queryDrawBuffersSupport(context);
//         this.queryMaxUniformVec3Components(context);
//     }


//     // HALF FLOAT

//     /**
//      * Stores the HALF_FLOAT enum if supported.
//      */
//     protected _halfFloat: GLenum;

//     /**
//      * The HALF_FLOAT format enum. Is ```undefined``` if not supported.
//      */
//     get HALF_FLOAT(): GLenum {
//         return this._halfFloat;
//     }

//     /**
//      *  For WebGL1 the HALF_FLOAT enum needs to be saved via the extension object.
//      */
//     protected queryHalfFloatSupport(context: Context): void {
//         switch (context.backend) {
//             case BackendType.WebGL1:
//                 this._halfFloat = context.supportsTextureHalfFloat && context.textureHalfFloat ?
//                     context.textureHalfFloat.HALF_FLOAT_OES : undefined;
//                 break;

//             case BackendType.WebGL2:
//             default:
//                 this._halfFloat = context.gl.HALF_FLOAT;
//                 break;
//         }
//     }


//     // COLOR ATTACHMENTS

//     /**
//      * Stores the lowest color attachment identifier.
//      */
//     protected _colorAttachmentMin: GLenum;
//     /**
//      * The lowest color attachment identifier format enum.
//      */
//     get COLOR_ATTACHMENT_MIN(): GLenum {
//         return this._colorAttachmentMin;
//     }

//     /**
//      * Stores the highest supported color attachment identifier.
//      */
//     protected _colorAttachmentMax: GLenum;

//     protected _colorAttachments: Array<GLenum>;

//     /**
//      * The lowest color attachment identifier format enum.
//      * Is at least ```COLOR_ATTACHMENT_MIN```.
//      */
//     get COLOR_ATTACHMENT_MAX(): GLenum {
//         return this._colorAttachmentMax;
//     }

//     get COLOR_ATTACHMENT0(): GLenum {
//         return this._colorAttachments[0];
//     }
//     get COLOR_ATTACHMENT1(): GLenum {
//         return this._colorAttachments[1];
//     }
//     get COLOR_ATTACHMENT2(): GLenum {
//         return this._colorAttachments[2];
//     }
//     get COLOR_ATTACHMENT3(): GLenum {
//         return this._colorAttachments[3];
//     }
//     get COLOR_ATTACHMENT4(): GLenum {
//         return this._colorAttachments[4];
//     }
//     get COLOR_ATTACHMENT5(): GLenum {
//         return this._colorAttachments[5];
//     }
//     get COLOR_ATTACHMENT6(): GLenum {
//         return this._colorAttachments[6];
//     }
//     get COLOR_ATTACHMENT7(): GLenum {
//         return this._colorAttachments[7];
//     }
//     get COLOR_ATTACHMENT8(): GLenum {
//         return this._colorAttachments[8];
//     }
//     get COLOR_ATTACHMENT9(): GLenum {
//         return this._colorAttachments[9];
//     }
//     get COLOR_ATTACHMENT10(): GLenum {
//         return this._colorAttachments[10];
//     }
//     get COLOR_ATTACHMENT11(): GLenum {
//         return this._colorAttachments[11];
//     }
//     get COLOR_ATTACHMENT12(): GLenum {
//         return this._colorAttachments[12];
//     }
//     get COLOR_ATTACHMENT13(): GLenum {
//         return this._colorAttachments[13];
//     }
//     get COLOR_ATTACHMENT14(): GLenum {
//         return this._colorAttachments[14];
//     }
//     get COLOR_ATTACHMENT15(): GLenum {
//         return this._colorAttachments[15];
//     }

//     /**
//      * Queries the valid range of color attachments and provides an interface for convenience.
//      */
//     protected queryColorAttachments(context: Context): void {
//         const gl = context.gl;

//         this._colorAttachments = new Array<GLenum>(16);
//         this._colorAttachments[0] = gl.COLOR_ATTACHMENT0;

//         switch (context.backend) {
//             case BackendType.WebGL1:
//                 const drawBuffers = context.supportsDrawBuffers ? context.drawBuffers : undefined;

//                 this._colorAttachmentMin = this._colorAttachments[0];
//                 this._colorAttachmentMax = this._colorAttachmentMin + (drawBuffers ?
//                     gl.getParameter(drawBuffers.MAX_COLOR_ATTACHMENTS_WEBGL) : 0) as GLenum;

//                 this._colorAttachments[0] = drawBuffers ? drawBuffers.COLOR_ATTACHMENT0_WEBGL : gl.COLOR_ATTACHMENT0;
//                 if (!drawBuffers) {
//                     break;
//                 }
//                 for (let i = 1; i < 16; ++i) {
//                     // Enums are assumed to be incremental in their definition ...
//                     this._colorAttachments[i] = drawBuffers.COLOR_ATTACHMENT0_WEBGL + i;
//                 }
//                 break;

//             case BackendType.WebGL2:
//             default:
//                 this._colorAttachmentMin = context.gl.COLOR_ATTACHMENT0;
//                 this._colorAttachmentMax = context.gl.COLOR_ATTACHMENT0
//                     + gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) as GLenum;

//                 for (let i = 0; i < 16; ++i) {
//                     // Enums are assumed to be incremental in their definition ...
//                     this._colorAttachments[i] = gl.COLOR_ATTACHMENT0 + i;
//                 }
//                 break;
//         }
//     }


//     // INSTANCED ARRAYS

//     vertexAttribDivisor: (index: GLuint, divisor: GLuint) => void;
//     drawArraysInstanced: (mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) => void;

//     protected queryInstancedArraySupport(context: Context): void {
//         assert(context.isWebGL2 || context.supportsInstancedArrays, `instanced arrays extension expected`);

//         this.vertexAttribDivisor = context.isWebGL2 ?
//             (index: GLuint, divisor: GLuint) => context.gl.vertexAttribDivisor(index, divisor) :
//             (index: GLuint, divisor: GLuint) => context.instancedArrays.vertexAttribDivisorANGLE(index, divisor);

//         this.drawArraysInstanced = context.isWebGL2 ?
//             (mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) =>
//                 context.gl.drawArraysInstanced(mode, first, count, instanceCount) :
//             (mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) =>
//                 context.instancedArrays.drawArraysInstancedANGLE(mode, first, count, instanceCount);
//     }


//     // DRAW BUFFERS

//     drawBuffers: ((buffers: Array<GLenum>) => void) | undefined = undefined;

//     protected queryDrawBuffersSupport(context: Context): void {
//         if (!context.isWebGL2 && !context.supportsDrawBuffers) {
//             return;
//         }
//         this.drawBuffers = context.isWebGL2 ?
//             (buffers: Array<GLenum>) => context.gl.drawBuffers(buffers) :
//             (buffers: Array<GLenum>) => context.drawBuffers.drawBuffersWEBGL(buffers);
//     }

//     // MAX UNIFORM COMPONENTS

//     protected _maxUniformVec3Components: GLint | undefined;
//     get maxUniformVec3Components(): GLint {
//         return this._maxUniformVec3Components ? this._maxUniformVec3Components : 0;
//     }
//     protected queryMaxUniformVec3Components(context: Context): void {
//         const gl = context.gl;

//         this._maxUniformVec3Components = context.isWebGL2
//             ? gl.getParameter(gl.MAX_VERTEX_UNIFORM_COMPONENTS)
//             : gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) * 3;
//     }

// }
