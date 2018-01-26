
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
    protected _context: Context;

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
     * Bindable constructor, requires a valid identifier.
     * @param identifier - Human readable name for identification of this instance.
     */
    constructor(context: Context, identifier?: string) {
        super();
        this._context = context;
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
     * Ensure that an object handle is created at the point of initialization. When overriding this function
     * super.initialize() has to be invoked immediately/first. Please note that initialization of invalid 
     * object raises an assertion in order to prevent further actions without a valid WebGL object.
     */
    @initialize()
    initialize(): boolean {
        this._object = this.create();
        this._identifier = this._context.allocationRegister.createUniqueIdentifier(this._identifier);

        const valid = this._object !== undefined;
        assert(valid, `initialization of ${this._identifier} failed`);

        return valid;
    }

    /**
     * @override
     * Ensure that an object handle is deleted, invalidated, and its allocated GPU resources are set to zero. 
     * When overriding this function super.uninitialize() has to be invoked last/at the end.
     */
    @uninitialize()
    uninitialize() {
        /* tslint:disable-next-line:no-null-keyword */
        // assert(this instanceof DefaultFramebuffer || (this._object !== undefined && this._object !== null)
        //     , `expected object handle to be created`);

        this._context.allocationRegister.reallocate(this._identifier, 0);
        this._context.allocationRegister.deleteUniqueIdentifier(this._identifier);

        this.delete();
        this._object = undefined;
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
        return this.initialized;
    }

}
