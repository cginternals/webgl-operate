
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';

import { Context } from './context';
import { Initializable } from './initializable';

/* spellchecker: enable */


/**
 * A generic WebGL object trait that has a size, a status, an identifier, and is initializable. A context and an object
 * handle are provided for internal use and can be read from outside. Furthermore, an object supports optional reference
 * counting. If used, an object cannot be initialized when already referenced, and cannot be delete as long as at least
 * a single reference is active.
 */
export abstract class AbstractObject<T> extends Initializable {

    /** @see {@link context} */
    protected _context: Context;

    /** @see {@link identifier} */
    protected _identifier: string;

    /** @see {@link object} */
    protected _object: T | undefined;

    /** @see {@link valid} */
    protected _valid = false;

    /**
     * Number of references to this object. If at least a single reference was counted, this object can neither be
     * initialized (and thus created) nor uninitialized (and thus deleted). The reference count is controlled via
     * ref() and unref() functions.
     */
    protected _referenceCount = 0;

    /**
     * Object constructor, requires a context and a valid identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     */
    constructor(context: Context, identifier?: string) {
        super();
        this._context = context;
        this._identifier = identifier !== undefined && identifier !== `` ? identifier : 'Object';
    }


    /**
     * Object creation which is invoked on initialization.
     * @returns - The created WebGL object handle.
     */
    protected abstract create(...args: Array<any>): T | undefined;

    /**
     * Object deletion which is invoked on uninitialization.
     */
    protected abstract delete(): void;


    /**
     * @override
     * Ensure that an object handle is created at the point of initialization. When overriding this function
     * super.initialize() has to be invoked immediately/first. Please note that initialization of invalid
     * object raises an assertion in order to prevent further actions without a valid WebGL object. After
     * object creation the valid property is expected to be set accordingly.
     */
    @Initializable.initialize()
    initialize(...args: Array<any>): boolean {
        this._identifier = this._context.allocationRegister.createUniqueIdentifier(this._identifier);
        this.create(...args);

        if (!this._valid) {
            this._context.allocationRegister.deleteUniqueIdentifier(this._identifier);
            auxiliaries.log(auxiliaries.LogLevel.Error, `initialization of '${this._identifier}' failed`);
        }
        return this._valid;
    }

    /**
     * @override
     * Ensure that an object handle is deleted, invalidated, and its allocated GPU resources are set to zero.
     * When overriding this function super.uninitialize() has to be invoked last/at the end.
     * Note that an object cannot be uninitialized if it is referenced (reference count > 0).
     */
    @Initializable.uninitialize()
    uninitialize(): void {
        this._context.allocationRegister.reallocate(this._identifier, 0);
        this._context.allocationRegister.deleteUniqueIdentifier(this._identifier);

        this.delete();
        auxiliaries.assert(this._object === undefined, `expected object '${this._identifier}' to be undefined after delete`);
        auxiliaries.assert(this._valid === false, `expected object '${this._identifier}' to be invalid after delete`);
    }


    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
    get context(): Context {
        return this._context;
    }

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
        auxiliaries.assert(this._object !== undefined, `access to undefined object`);
        return this._object as T;
    }

    /**
     * Cached object status used to derive validity when initialized.
     * @returns - True if the object status is complete, false otherwise.
     */
    get valid(): boolean {
        return this._valid;
    }

    /**
     * Increment the reference count of this object.
     */
    ref(): void {
        auxiliaries.assert(this.initialized, `expected object to be initialized in order to be referenced`);
        ++this._referenceCount;
    }

    /**
     * Decrement the reference count of this object.
     */
    unref(): void {
        auxiliaries.assert(this._referenceCount > 0, `expected object to be referenced in order to decrease its reference count`);
        --this._referenceCount;
    }

}
