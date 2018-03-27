
import { Validator } from 'jsonschema';

import { AlterationLookup } from './alterable';
import { assert, logIf, LogLevel } from './auxiliaries';


export namespace JsonSchema {

    /**
     * Validates if an object (POJO/JSON) adheres to a specific structure using a JSON schema.
     * @param instance - Object to validate.
     * @param schema - JSON schema used for validation.
     * @param references - Schema references for types etc.
     * @returns - True iff the provided instance in valid according to the schema.
     */
    export function validate(instance: any, schema: object, references?: Array<[object, string]>): boolean {
        const validator = new Validator();
        if (references !== undefined) {
            for (const reference of references) {
                validator.addSchema(reference[0], reference[1]);
            }
        }
        /* Validate of (sub) schema of given POJO/JSON. */
        const result = validator.validate(instance, schema);

        logIf(!result.valid, LogLevel.Dev, `schema conformance issue (setter ignored):\n${result.toString()}`);
        return result.valid;
    }


    /**
     * Complements default values for all (nested) properties and array's of objects of a given object (POJO/JSON).
     * ```
     * const schema: any = { type: 'object', properties: {
     *          foo: { type: 'object', properties: {
     *              bar: { type: 'string', default: 'moep' },
     *              baz: { type: 'string' } } } } };
     *
     * const object: any = { };
     * JsonSchema.complement(object, schema);
     * console.log(object.foo.bar); // should exist and output 'moep'
     * ```
     *
     * @param instance - Object to complement default values for.
     * @param schema - Schema used for validation.
     */
    export function complement(instance: any | undefined, schema: any): void {
        if (instance === undefined) {
            return;
        }
        assert((schema.hasOwnProperty('properties') && (schema as any)['type'] === 'object') ||
            (schema.hasOwnProperty('items') && (schema as any)['type'] === 'array'),
            `expected schema to have 'properties' or 'items', given ${schema}`);

        /* tslint:disable-next-line:switch-default */
        switch ((schema as any)['type']) {

            case 'object':
                const propertiesSchema = (schema as any)['properties'];
                const properties = Object.getOwnPropertyNames(propertiesSchema);

                for (const key of properties) {
                    const propertySchema = propertiesSchema[key];
                    const type: string | undefined = propertySchema['type'];

                    const isObject = type === 'object';
                    const isDefined = instance.hasOwnProperty(key);

                    const hasProperties = propertySchema.hasOwnProperty('properties');
                    const hasDefault = propertySchema.hasOwnProperty('default');

                    assert((hasProperties && isObject) || (!hasProperties && !isObject),
                        `expected property '${key}' to be of type 'object', given '${propertySchema['type']}'`);

                    if (isDefined && hasProperties) {
                        /* Invoke recursive defaulting for already defined object with properties. */
                        JsonSchema.complement(instance[key], propertySchema);

                    } else if (hasProperties) {
                        /* Invoke recursive defaulting for not yet defined object with properties. */
                        Object.defineProperty(instance, key, { value: {} });
                        JsonSchema.complement(instance[key], propertySchema);

                    } else if (!isDefined && hasDefault) {
                        /* Default value for not yet defined property. */
                        Object.defineProperty(instance, key, { value: propertySchema['default'] });
                    }
                }
                break;

            case 'array':
                const itemsSchema = (schema as any)['items'];
                if (itemsSchema['type'] !== 'object') {
                    break;
                }
                /* Invoke recursive defaulting for array of objects. */
                for (const name of Object.getOwnPropertyNames(instance)) {
                    if (name === 'length') {
                        continue;
                    }
                    JsonSchema.complement(instance[name], itemsSchema);
                }
                break;
        }
    }

    /**
     * Deep comparison of two objects. It computes whether or not changes have been found (returns true) or objects
     * seem to be equal w.r.t. to their property structure and respective values (returns false). All changes that
     * are found will be passed to the alteration lookup.
     * @param objectL - Left operand for deep comparison.
     * @param objectR - Right operand for deep comparison.
     * @param lookup - Actual alteration lookup used for top-down property traversal.
     * @returns - False iff both objects are equal w.r.t. structure and values. True otherwise.
     */
    export function compare(objectL: object | undefined, objectR: object | undefined,
        tracker: AlterationLookup, path: string): boolean {
        assert((tracker as object).hasOwnProperty('any'),
            `expected allocation lookup object to have 'any' key`);

        if ((objectL === undefined && objectR !== undefined) || (objectL !== undefined && objectR === undefined)) {
            tracker.alter(path);
            return true;
        }

        // const properties = Object.getOwnPropertyNames(objectL);

        // let equals = true;
        // for (const key of properties) {
        //     const values = [(objectL as any)[key], (objectR as any)[key]];
        //     const typeL = (objectL as any)[key]
        // }


        /** @todo implement deep compare for alteration tracking */
        // let objectsDiffer = true;
        // for (const key of Object.keys(tracker)) {
        //     if (key === 'any') {
        //         continue;
        //     }
        //     if (typeof key === 'object') {
        //     }
        // }

        return false;
    }

}
