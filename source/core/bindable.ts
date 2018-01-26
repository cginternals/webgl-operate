
import { assert } from './common';

import { Context } from './context';
import { Initializable, initialize, uninitialize } from './initializable';

// import { DefaultFramebuffer } from './defaultframebuffer';


/**
 * Bindable trait that provides size accessors and demands bind, unbind, validity, and initialization implementations
 * as well as an identifier.
 */
export abstract class Bindable<T> extends Initializable {

    /**
     * Context used to get context information and WebGL API access.
     */
    protected context: Context;

    /**
     * @see {@link identifier}
     */
    protected _identifier: string;

    /**
     * @see {@link object}
     */
    protected _object: T | undefined;

    /**
     * @see {@link valid}
     */
    protected _valid = false;

    /**
     * Provides size in bytes of certain WebGL format and type enumerators.
     * @param context - The OpenGL context.
     * @param type - Type or format identifier of the target internal OpenGL data type.
     * @return - The size in bytes of one type instance on the GPU.
     */
    protected static bytes(context: Context, type: GLenum): number {
        const gl = context.gl;
        const gl2facade = context.gl2facade;

        switch (type) {
            case undefined: // must be first, in case any other type is not defined
            /* falls through */
            default:
                assert(false, `size of type ${type} is unknown`);
                return 0;

            case gl.ALPHA:
            case gl.LUMINANCE:
            case gl.UNSIGNED_BYTE:

            case gl.R8:
            case gl.R8UI:
            case gl.STENCIL_INDEX8:
                return 1;

            case gl.LUMINANCE_ALPHA:
            case gl2facade.HALF_FLOAT:

            case gl.R16F:
            case gl.RG8:
            case gl.RG8UI:
            case gl.RGB565:
            case gl.RGB5_A1:
            case gl.RGBA4444:
            case gl.DEPTH_COMPONENT16:
                return 2;

            case gl.RGB:
            case gl.RGB8:
            case gl.SRGB8:
            case gl.RGB8UI:
            case gl.DEPTH_COMPONENT24:
                return 3;

            case gl.RGBA:
            case gl.FLOAT:

            case gl.R32F:
            case gl.RG16F:
            case gl.RG16UI:
            case gl.R11F_G11F_B10F:
            case gl.RGB9_E5:
            case gl.RGBA8:
            case gl.SRGB_ALPHA8:
            case gl.SRGB_APLHA8: // cover this typo? :P
            // https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/texStorage2D

            case gl.RGBA8UI:

            case gl.DEPTH_COMPONENT32F:
            case gl.DEPTH_STENCIL:
            case gl.DEPTH24_STENCIL8:
                return 4;

            case gl.DEPTH32F_STENCIL8:
                return 5;

            case gl.RGB16F:
                return 6;

            case gl.RG32F:
            case gl.RG32UI:
            case gl.RGBA16F:
                return 8;

            case gl.RGB32F:
                return 12;
            case gl.RGBA32F:
                return 16;

            case gl.DEPTH_COMPONENT:
                return gl.getParameter(gl.DEPTH_BITS) / 8;
        }
    }


    /**
     * Bindable constructor, requires a valid identifier.
     * @param identifier - Human readable name for identification of this instance.
     */
    constructor(context: Context, identifier: string) {
        super();
        this.context = context;

        this._identifier = identifier !== undefined && identifier !== `` ? identifier : this.constructor.name;
    }


    /**
     * Object creation which is invoked on initialization.
     * @returns - The created, bindable GPU object handle.
     */
    protected abstract create(): T;

    /**
     * Object deletion which is invoked on uninitialization.
     */
    protected abstract delete(): void;


    /**
     * @override
     * Ensure that an object handle is created at the point of initialization.
     */
    @initialize()
    initialize(...args: any[]): boolean {
        this._object = this.create();
        this._identifier = this.context.gpuAllocationRegister.createUniqueIdentifier(this._identifier);

        this._valid = this._object !== undefined && this._identifier !== undefined;
        assert(this._valid, `initialization of ${this._identifier} failed`);

        return this._valid;
    }

    /**
     * @override
     * Ensure that an object handle is deleted, invalidated, and its allocated GPU resources are set to zero.
     */
    @uninitialize()
    uninitialize() {
        /* tslint:disable-next-line:no-null-keyword */
        // assert(this instanceof DefaultFramebuffer || (this._object !== undefined && this._object !== null)
        //     , `expected object handle to be created`);

        this.context.gpuAllocationRegister.reallocate(this._identifier, 0);
        this.context.gpuAllocationRegister.deleteUniqueIdentifier(this._identifier);

        this.delete();
        this._object = undefined;
        this._valid = false;
    }

    /**
     * Should bind the object.
     */
    abstract bind(target?: GLenum): void;

    /**
     * Should bind the default object.
     */
    abstract unbind(target?: GLenum): void;

    /**
     * Every GPU asset that allocates memory should provide a human readable identifier for GPU allocation tracking and
     * debugging purposes. Please note that the identifier might changed on initialization due to the generation and
     * assignment of a unique identifier.
     * @returns - This assets identifier used for gpu allocation tracking and debugging.
     */
    get identifier(): string {
        return this._identifier;
    }

    /**
     * Read-only access to the WebGL object handle.
     */
    get object(): T {
        assert(this._object !== undefined, `access to undefined object`);
        return this._object as T;
    }

    /**
     * Cached object status used to derive validity when initialized.
     * @returns - True if the object status is complete, false otherwise.
     */
    get valid(): boolean {
        return this._valid;
    }

}
