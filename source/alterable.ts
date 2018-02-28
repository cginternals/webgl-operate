
import { assert } from './auxiliaries';


/**
 * Utility class to replicate the structure of all alterable properties of a class to. This was initially designed to
 * be used in combination with an `alterable` decorator (but instance-based property decoration does not work yet). For
 * now though, this is used for explicit alterable structure replication and management.
 * ```
 * const alterable = {
 *     any: false,
 *     data: { any: false, alpha: false, beta: false },
 *     modifier: false };
 *
 * const altered = Object.assign(new AlterationLookup(), alterable);
 * altered.alter('data.beta');
 * if(altered.data.any) { ... }
 * ```
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
