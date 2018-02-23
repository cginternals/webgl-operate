
import { assert } from './auxiliaries';


/**
 * Recursively decorates a property. For internal use only, please refer to the methods internal documentation for
 * more details.
 * @param target - Target object that contains the property (on first level this should be the decorated target).
 * @param property - The actual (probably default/initial) property value.
 * @param lookup - Alteration lookup table to use for capturing alteration.
 * @param altered - Alteration lookup object to replicate the property structure to.
 * @param key - Full key of the current property (chained, dot joined property keys).
 */
function decorate(target: any, property: any, lookup: AlterationLookup, altered: any, key: string) {

    const isArray = property instanceof Array;
    const isObject = property instanceof Object;
    const propertyKey: PropertyKey = key.split('.').pop() as string;
    assert(!altered.hasOwnProperty(propertyKey), `expected property '${key} to be not yet defined`);


    const getter = (): typeof property => property;

    /**
     * Setter for non-object properties such as booleans, numbers, and arrays.
     * @param value - New value to be set to the internal value store.
     */
    const flatSetter = (value: typeof property) => {
        assert(typeof value === typeof property
            , `expected value of type '${typeof property}' for alteration | given '${typeof value}'`);

        if (property === value) {
            return;
        }
        lookup.alter(key);
        property = value;
    };

    /**
     * Setter for array properties with deep compare of all elements. Please not that for now, no deep equal check is
     * performed, and every set will result in an alteration. This does also not cover for direct value manipulation.
     * @param value - New value to be set to the internal value store.
     */
    const arraySetter = (value: typeof property) => {
        assert(typeof value === typeof property && value instanceof Array
            , `expected array value of type '${typeof property}' for alteration | given '${typeof value}'`);

        /* No deep equal for actual detection change on arrays for now ... */
        // const newKeys = Array.from(value.keys());
        // const oldKeys = Array.from(property.keys());
        // let equal = newKeys.length === oldKeys.length;

        // for (let i = 0; equal && i < newKeys.length; ++i) {
        //     equal = value[i] === property[i];
        // }
        // if (equal) {
        //     return;
        // }
        lookup.alter(key);
        property = value;
    };

    /**
     * @param value - New value to be set to the internal value store.
     */
    const deepSetter = (value: typeof property) => {
        assert(false, `deep object setter currently not implemented, try modifying the leafs directly`);
    };

    /* Capture the actual member variable by replacing it with getters and setters of this decorator. */
    delete target[propertyKey];
    Object.defineProperty(target, propertyKey, {
        get: getter,
        set: isObject && !isArray ? deepSetter : isArray ? arraySetter : flatSetter,
    });


    if (isObject && !isArray) {
        /* Create the alteration lookup property, which is an object that will be decorated with more properties. */
        Object.defineProperty(altered, propertyKey, { value: new Object(), writable: true });
        /* Create an 'any' lookup property that is used for bottom-up propagation of alterations. */
        Object.defineProperty(altered[propertyKey], 'any', { value: false, writable: true });

        /* Replicate the objects property structure to the alteration lookup property. */
        for (const k of Object.keys(property)) {
            decorate(property, property[k], lookup, altered[propertyKey], key + '.' + k);
        }

    } else {
        /* In case of a non-object type, create the alteration lookup property (boolean). */
        Object.defineProperty(altered, propertyKey, { value: false, writable: true });
    }
}

/**
 * Typed decorator that enables alteration tracking on public properties of a class.
 * Let us assume the following example:
 * ```
 * class SomeClass {
 *
 *     @alterable<number>(1.6180)
 *     golden: number;
 *
 *     @alterable<string>('linear')
 *     modifier: string;
 *
 *     @alterable<SomeInterface>({
 *         alpha: true,
 *         beta: 'true',
 *         gamma: {
 *             min: 0.0,
 *             max: 1.0,
 *             value: 0.2,
 *         },
 *         delta: 1.0,
 *     })
 *     data: SomeInterface;
 *
 *     // altered: AlterationLookup; // implicitly generated once on decoration of any property.
 * ```
 * With these decorators, every `SomeClass` instance has now an `altered` object that replicates all properties as well
 * ass nested properties (e.g., in the case of `data`). Now `someLazyFunction` could check for alterations on all
 * alterable properties and nested properties:
 * ```
 * someLazyFunction(): void { // of SomeClass
 *     if(this.altered.golden) {
 *         redoGoldenStuff(...);
 *     }
 *     if(this.altered.data.gamma.value) {
 *         redoGammaValueStuff(...);
 *     }
 *     // or detect any changes on any level
 *     if(this.altered.data.any) {
 *         ...
 *     }
 *     ...
 *     this.altered.reset();
 * }
 * ```
 * If, e.g., `someInstanceOfSomeClass.data.gamma.value = 0.0` would be called, the second and third if-cases of the
 * lazy function above would be executed.
 *
 * Note that deep setter and alteration detection of array value manipulations are currently not supported.
 * If more complex objects are required (e.g., with variable structure), limit the use of `alterable` to the static/
 * fixed/non-changing part of the object to allow alteration detection up to that point.
 *
 * @param defaultValue - A default value that is required for and should be favored as value initialization.
 * Especially for objects (POJO), this default value is mandatory in order to replicated its structure for the `altered`
 * object.
 */
export function alterable<T>(defaultValue: T) {
    return (target: any, key: string) => {

        /* Create alterables lookup for capturing and accessing alteration states. */
        if (!target.hasOwnProperty('altered')) {
            Object.defineProperty(target, 'altered', { value: new AlterationLookup(), writable: false });
            Object.defineProperty(target.altered, 'any', { value: false, writable: true });
        }

        /**
         * Used to redirect the decorated property to this internal value.
         */
        const property: T = defaultValue as T;
        decorate(target, property, target.altered, target.altered, key);
    };
}


/**
 * Utility class to replicate the structure of all alterable properties of a class to. This should not be created
 * explicitly, but is intended to be generated by decoration of properties with `alterable<...>`.
 * @see {@link alterable} for example use.
 */
export class AlterationLookup {

    /**
     * Also allow for string-based index access in TypeScript.
     */
    [index: string]: boolean | any;

    /**
     * Map of keys that have been altered and their 'parent' objects. This cache is used for more efficient reset.
     */
    protected _cache = new Map<string, object>();

    /**
     * Alters the given key as well as the `any` element of all parent objects. For example, the key 'foo.bar' would
     * cause `altered.foo.bar` and `altered.foo.any` as well as `altered.any` to be true. Note that the `altered`
     * object should only be modified using this method to avoid erroneous states.
     * @param fullKey - Full object path to the altered key (keys joined using '.', e.g., 'foo.bar').
     */
    alter(fullKey: string): void {
        assert(fullKey.length > 0, `expected non-empty key`);

        if (this._cache.has(fullKey)) {
            return;
        }
        const subKeys = fullKey.split('.');

        let cacheKey = '*';
        let object = this;

        /** Capture on root 'any' property. */
        if (!this._cache.has(cacheKey)) {
            this['any'] = true;
            this._cache.set(cacheKey, this);
        }

        /* Capture change of a nested/child property in altered lookup. */
        for (let i = 0; i < subKeys.length - 1; ++i) {
            const key = subKeys[i] as string;
            assert(object.hasOwnProperty(key), `expected object to have key '${key}' in order to capture alterations`);

            /* Remember this alteration for more efficient reset. */
            cacheKey = cacheKey + '.' + key;
            if (this._cache.has(cacheKey)) {
                object = object[key] as any;
                continue;
            }
            object = object[key] as any;
            object['any'] = true;

            this._cache.set(cacheKey, object);
        }

        /* Capture actual associated leaf property. */
        const key = subKeys.pop() as string;

        assert(object.hasOwnProperty(key), `expected object to have key '${key}' in order to capture alterations`);
        object[key] = true;

        /* Cache key for efficient reset. */
        this._cache.set(fullKey, object);
    }

    /**
     * Reset all alteration states to false. Note that only alteration states are reset that were actually modified
     * using this class's `alter` method (since caching is used).
     */
    reset(): void {
        this._cache.forEach((o: any, key: string) => {
            key.startsWith('*') ? o['any'] = false : o[key.split('.').pop() as string] = false;
        });
        this._cache.clear();
    }

}
