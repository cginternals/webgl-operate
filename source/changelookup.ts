
import { assert } from './auxiliaries';


/**
 * Utility class to replicate the structure of all alterable properties of a class to. This was initially designed
 * to be used in combination with an `alterable` decorator (but instance-based property decoration does not work
 * yet). For now though, this is used for explicit alterable structure replication and management.
 * ```
 * const alterable = {
 *     any: false,
 *     data: { any: false, alpha: false, beta: false },
 *     modifier: false };
 *
 * const altered = Object.assign(new ChangeLookup(), alterable);
 * altered.alter('data.beta');
 * if(altered.data.any) { ... }
 * ```
 */
export class ChangeLookup {

    /**
     * Also allow for string-based index access in TypeScript.
     */
    [index: string]: boolean | any;


    /**
     * One step of the recursive traversal of a given properties path in order to invalidate the alteration states.
     * Please note, that this is design is not intended for very large structures since no caching is applied.
     * @param path - Relative path w.r.t. to the given property.
     * @param property - Property to continue traversal of the given relative path on.
     */
    protected static alter(path: string, property: any): void {

        assert(property.hasOwnProperty('any'), `expected alterable object to provide 'any' key`);
        property.any = true;

        const names = path.split('.');
        const name = names.shift() as string;

        assert(name === '' || property.hasOwnProperty(name),
            `expected object to have key '${name}' in order to capture alterations`);

        if (name !== '' && typeof property[name] !== 'object') {
            property[name] = true;
            return;
        }

        if (name !== '' && names.length > 0) {
            ChangeLookup.alter(names.join('.'), property[name]);
            return;
        }

        const parent = name !== '' ? property[name] : property;
        for (const child of Object.getOwnPropertyNames(parent)) {
            if (child === 'any') {
                continue;
            }
            ChangeLookup.alter(child, parent);
        }
    }

    /**
     * Resets all nested alteration states of a given parent property recursively. Children of object type are
     * recursively reset. Every other child is directly set to false (including any).
     * @param property - Property to reset alteration states of.
     */
    protected static reset(property: any): void {
        for (const name of Object.getOwnPropertyNames(property)) {
            if (typeof property[name] === 'object') {
                ChangeLookup.reset(property[name]);
                continue;
            }
            property[name] = false;
        }
    }


    /**
     * Alters the given key as well as the `any` element of all parent objects. For example, the key 'foo.bar' would
     * cause `altered.foo.bar` and `altered.foo.any` as well as `altered.any` to be true. Note that the `altered`
     * object should only be modified using this method to avoid erroneous states.
     * @param path - Full object path to the altered key (keys joined using '.', e.g., 'foo.bar'). If the path is
     * referring to an object, the alteration is propagated top-down to all children.
     */
    alter(path: string): void {
        return ChangeLookup.alter(path, this);
    }

    /**
     * Reset all alteration states to false.
     */
    reset(): void {
        return ChangeLookup.reset(this);
    }

}
