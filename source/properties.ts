
import { Validator } from 'jsonschema';

import { assert } from './auxiliaries';
import { ChangeLookup } from './changelookup';


namespace properties {

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

        /** @todo: the assert throws when testing because it's not defined!? */
        // assert(result.valid === true, `schema expected to be valid:\n${result.toString()}`);
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
                        complement(instance[key], propertySchema);

                    } else if (hasProperties) {
                        /* Invoke recursive defaulting for not yet defined object with properties. */
                        Object.defineProperty(instance, key, { value: {} });
                        complement(instance[key], propertySchema);

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
                    complement(instance[name], itemsSchema);
                }
                break;
        }
    }

    /**
     * Deep comparison of two objects. It returns whether or not changes have been found (returns true) or objects
     * seem to be equal w.r.t. to their property structure and respective values (returns false). All changes that
     * are found will be passed to the alteration lookup.
     * @param objectL - Left operand for deep comparison.
     * @param objectR - Right operand for deep comparison.
     * @param lookup - Actual alteration lookup used for top-down property traversal.
     * @returns - False iff both objects are equal w.r.t. structure and values. True otherwise.
     */
    export function compare(objectL: any | undefined, objectR: any | undefined,
        tracker?: ChangeLookup, path: string = ''): boolean {

        const track = tracker !== undefined;
        assert(!track || (tracker as object).hasOwnProperty('any'),
            `expected allocation lookup object to have 'any' key`);

        if ((objectL === undefined && objectR !== undefined) || (objectL !== undefined && objectR === undefined)) {
            if (track) {
                (tracker as ChangeLookup).alter(path);
            }
            return true;
        }

        let equals = true;

        /* Primitive compare if at least one operand is neither object nor array. */
        let types: [string, string] = [typeof objectL, typeof objectR];
        const isArray: [boolean, boolean] = [objectL instanceof Array, objectR instanceof Array];

        if ((!isArray[0] || !isArray[1]) && (types[0] !== 'object' || types[1] !== 'object')) {
            equals = objectL === objectR;
            if (!equals && track) {
                (tracker as ChangeLookup).alter(`${path}`);
            }
            return !equals;
        }

        /* Get set of unique names of both objects. */
        const names: Array<string> = Array.from(new Set<string>(
            Array<string>().concat(Object.getOwnPropertyNames(objectL), Object.getOwnPropertyNames(objectR))).values());

        /* Deep compare if both operands are either object or array. */
        for (const name of names) {
            if (name === 'length') {
                continue;
            }
            const values = [(objectL as any)[name], (objectR as any)[name]];
            types = [typeof values[0], typeof values[1]];

            const propertyPath = `${path}${path.length > 0 && !isArray[0] ? '.' : ''}${!isArray[0] ? name : ''}`;

            if ((values[0] instanceof Array && values[1] instanceof Array) ||
                (types[0] === 'object' && types[1] === 'object')) {
                equals = equals && !compare(values[0], values[1], tracker, propertyPath);
            } else {
                if (types[0] === types[1] && values[0] === values[1]) {
                    continue;
                }
                equals = false;
                if (track) {
                    (tracker as ChangeLookup).alter(propertyPath);
                }
            }
        }
        return !equals;
    }

}

export = properties;
