
import { assert } from './common';


const assertInitializedFalse = (object: Initializable) =>
    assert(false, `instance of ${object.constructor.name} expected to be initialized`);
const assertUninitializedFalse = (object: Initializable) =>
    assert(false, `instance of ${object.constructor.name} not expected to be initialized`);


export function initialize() {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

        assert(target.__proto__.constructor.name === 'Initializable'
            , `expected ${target} to extend Initializable`);
        assert(propertyKey === 'initialize'
            , `expected an 'initialize(...args: any[]): boolean' method to be decorated by @initialize`);

        const initialize = descriptor.value;
        /* tslint:disable-next-line:space-before-function-paren only-arrow-functions */
        descriptor.value = function (): boolean {
            assert(this._initialized === false, `re-initialization of initialized object not anticipated`);

            /* call actual initialization and set initialization status */
            this._initialized = initialize.apply(this, arguments);

            /* assign assert functions for better performance when initialized */
            if (this._initialized) {
                this.assertInitialized = () => undefined;
                this.assertUninitialized = () => assertUninitializedFalse(this);
            } else {
                this.assertUninitialized = () => undefined;
                this.assertInitialized = () => assertInitializedFalse(this);
            }
            return this._initialized;
        };
        return descriptor;
    };
}

export function uninitialize() {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

        assert(target.__proto__.constructor.name === 'Initializable'
            , `expected ${target} to extend Initializable`);
        assert(propertyKey === 'uninitialize'
            , `expected an 'uninitialize(): void' method to be decorated by @uninitialize`);

        const uninitialize = descriptor.value;
        /* tslint:disable-next-line:space-before-function-paren only-arrow-functions */
        descriptor.value = function (): void {
            assert(this._initialized === true, `expected object to be initialized in order to uninitialize`);

            /* call actual uninitialization */
            uninitialize.apply(this);
            this._initialized = false;

            /* assign assert functions for better performance when uninitialized */
            this.assertUninitialized = () => undefined;
            this.assertInitialized = () => assertInitializedFalse(this);
        };
        return descriptor;
    };
}

/**
 * Mixin that incorporates basic (un)initialization workflow. The inheritor should specialize initialize and
 * uninitialize and decorate them with @initialize and @uninitialize respectively. When the object gets constructed it
 * is not initialized. It can be initialized only when it is not initialized and uninitialized vice versa. Failure
 * states result in invalid asserts.
 * The initialization status within the inheritor can be asserted using assertInitialized and assertUninitialized.
 *
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
 * ```
 */
export abstract class Initializable {

    /**
     * Initialization status of an initializable instance.
     */
    private _initialized = false;


    /**
     * Asserts the objects initialization status to be true. Note that the implementation is cached and forwarded to
     * either an empty function when initialized and to an acutal assert(false) otherwise.
     */
    protected assertInitialized: () => void = () => assertInitializedFalse(this);

    /**
     * Asserts the objects initialization status to be false. Note that the implementation is cached and forwarded to
     * either an empty function when uninitialized and to an acutal assert(false) otherwise.
     */
    protected assertUninitialized: () => void = () => undefined;

    /**
     * Should implement actual initialization and has to be decorated by @initialize in order to assert initialization
     * status and update the initialization status (based on return value).
     *
     * @param args - All args are passed to the onInitialize function a subclass must override.
     * @returns - True if initialization was successful.
     */
    abstract initialize(...args: any[]): boolean;

    /**
     * Uninitialization event that should be specialized by inheritor and has to be decorated by @uninitialize in order
     * to assert initialization status and set the initialization status to false.
     */
    abstract uninitialize(): void;

    /**
     * Property getter for readonly access to initialization status.
     */
    get initialized() {
        return this._initialized;
    }

}
