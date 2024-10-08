
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';
import assert = auxiliaries.assert;

/* spellchecker: enable */


interface MethodDecorator { (target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor; }


/**
 * Mixin that incorporates basic (un-)initialization workflow. The inheritor should specialize initialize and
 * uninitialize and decorate them with @initialize and @uninitialize respectively. When the object gets constructed it
 * is not initialized. It can be initialized only when it is not initialized and uninitialized vice versa. Failure
 * states result in invalid asserts.
 * The initialization status within the inheritor can be asserted using assertInitialized and assertUninitialized.
 * Note that the use of this class requires decorator support (compilerOptions: experimentalDecorators: true).
 * ```
 * class Test extends Initializable {
 *
 *     @initialize()
 *     initialize(name: string): boolean {
 *         ....
 *         return true;
 *     }
 *
 *     @uninitialize()
 *     uninitialize(): void {
 *         ...
 *     }
 *
 *     doStuffWhenInitialized(): void {
 *         this.assertInitialized();
 *         ...
 *     }
 *     // ... or alternatively:
 *     @assert_initialized()
 *     doOtherStuffWhenInitialized(): void {
 *         ...
 *     }
 * ```
 */
export abstract class Initializable {

    /** @see {@link initialized} */
    private _initialized = false;


    protected static readonly assertInitializedFalse = (object: Initializable) =>
        /* tslint:disable-next-line:semicolon */
        assert(false, `instance of ${object.constructor.name} expected to be initialized`);
    protected static readonly assertUninitializedFalse = (object: Initializable) =>
        /* tslint:disable-next-line:semicolon */
        assert(false, `instance of ${object.constructor.name} not expected to be initialized`);

    /**
     * Method decorator for initialization of Initializable inheritors. This decorator asserts the initialization status
     * of the instance that is to be initialized, invokes its initialization with arbitrary number of parameters,
     * and sets the initialization status to the initialization success (either false or true).
     * In order to encourage the use of `assertInitialized` and `assertUninitialized` they are dynamically
     * bound to either a static, always-failing assert or an empty/undefined function.
     */
    static initialize(): MethodDecorator {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor => {

            const initialize = descriptor.value;
            /* tslint:disable-next-line:space-before-function-paren only-arrow-functions */
            descriptor.value = function (): boolean {
                assert(this._initialized === false, `re-initialization of initialized object not anticipated`);

                /* Call actual initialization and set initialization status. */
                // eslint-disable-next-line prefer-rest-params
                this._initialized = initialize.apply(this, arguments);

                /* Assign assert functions for better performance when initialized. */
                if (this._initialized) {
                    this.assertInitialized = () => undefined;
                    this.assertUninitialized = () => Initializable.assertUninitializedFalse(this);
                } else {
                    this.assertUninitialized = () => undefined;
                    this.assertInitialized = () => Initializable.assertInitializedFalse(this);
                }
                return this._initialized;
            };
            return descriptor;
        };
    }

    /**
     * Method decorator for uninitialization of Initializable inheritors. This decorator asserts the initialization
     * status of the instance that is to be uninitialized, invokes its uninitialization, and falsifies the
     * initialization status. In order to encourage the use of `assertInitialized` and `assertUninitialized` they are
     * dynamically bound to a static, always-failing assert and an empty/undefined function respectively.
     */
    static uninitialize(): MethodDecorator {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

            const uninitialize = descriptor.value;
            /* tslint:disable-next-line:space-before-function-paren only-arrow-functions */
            descriptor.value = function (): void {
                assert(this._initialized === true, `expected object to be initialized in order to uninitialize`);

                /* call actual uninitialization */
                uninitialize.apply(this);
                this._initialized = false;

                /* assign assert functions for better performance when uninitialized */
                this.assertUninitialized = () => undefined;
                this.assertInitialized = () => Initializable.assertInitializedFalse(this);
            };
            return descriptor;
        };
    }

    /**
     * Method decorator for discarding of Initializable inheritors. This decorator asserts the initialization
     * status of the instance that is to be discarded, invokes its uninitialization, and falsifies the
     * initialization status. In order to encourage the use of `assertInitialized` and `assertUninitialized` they are
     * dynamically bound to a static, always-failing assert and an empty/undefined function respectively.
     */
    static discard(): MethodDecorator {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

            const discard = descriptor.value;
            /* tslint:disable-next-line:space-before-function-paren only-arrow-functions */
            descriptor.value = function (): void {
                assert(this._initialized === true, `expected object to be initialized in order to uninitialize`);

                /* call actual uninitialization */
                discard.apply(this);
                this._initialized = false;

                /* assign assert functions for better performance when uninitialized */
                this.assertUninitialized = () => undefined;
                this.assertInitialized = () => Initializable.assertInitializedFalse(this);
            };
            return descriptor;
        };
    }

    /**
     * Method decorator for asserting the initialization status of an initializable to be true.
     * @see {@link assertInitialized}
     */
    static assert_initialized(): MethodDecorator {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

            const initialize = descriptor.value;
            /* tslint:disable-next-line:space-before-function-paren only-arrow-functions */
            descriptor.value = function (): any {
                this.assertInitialized();
                /* call actual initialization and set initialization status */
                // eslint-disable-next-line prefer-rest-params
                return initialize.apply(this, arguments);
            };
            return descriptor;
        };
    }

    /**
     * Method decorator for asserting the initialization status of an initializable to be false.
     * @see {@link assertUninitialized}
     */
    static assert_uninitialized(): MethodDecorator {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

            const initialize = descriptor.value;
            /* tslint:disable-next-line:space-before-function-paren only-arrow-functions */
            descriptor.value = function (): void {
                this.assertUninitialized();
                /* Call actual initialization and set initialization status. */
                // eslint-disable-next-line prefer-rest-params
                initialize.apply(this, arguments);
            };
            return descriptor;
        };
    }


    /**
     * Asserts the objects initialization status to be true. Note that the implementation is cached and forwarded to
     * either an empty function when initialized and to an acutal assert(false) otherwise.
     */
    protected assertInitialized: () => void = () => Initializable.assertInitializedFalse(this);

    /**
     * Asserts the objects initialization status to be false. Note that the implementation is cached and forwarded to
     * either an empty function when uninitialized and to an acutal assert(false) otherwise.
     */
    protected assertUninitialized: () => void = () => undefined;

    /**
     * Should implement actual initialization and has to be decorated by @initialize in order to assert initialization
     * status and update the initialization status (based on return value).
     * @param args - All args are passed to the onInitialize function a subclass must override.
     * @returns - True if initialization was successful.
     */
    abstract initialize(...args: Array<any>): boolean;

    /**
     * Uninitialization event that should be specialized by inheritor and has to be decorated by @uninitialize in order
     * to assert initialization status and set the initialization status to false.
     */
    abstract uninitialize(): void;

    /**
     * Property getter for readonly access to the initialization status of an initializable instance.
     */
    get initialized(): boolean {
        return this._initialized;
    }

}
