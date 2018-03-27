
import * as chai from 'chai';
import * as sinon from 'sinon';

const expect = chai.expect;
const stub = sinon.stub;


import { SchemaError } from 'jsonschema';

import { JsonSchema } from '../source/jsonschema';


/* tslint:disable:no-unused-expression */

describe('JSON Schema', () => {

    it('should trigger validation', () => {

        /* This is only as simple test for test coverage. Since the validation itself is using the validator of the 
        jsonschema package and is expected to be tested. */

        const schema: any = {
            type: 'object',
            properties: {
                some_flag: { type: 'boolean' },
            },
            required: ['some_flag'],
            additionalProperties: false,
        };

        const consoleLogStub = stub(console, 'log');

        expect(JsonSchema.validate({ some_flag: true }, schema)).to.be.true;

        expect(JsonSchema.validate({}, schema)).to.be.false;
        expect(JsonSchema.validate({ additional: 1.0 }, schema)).to.be.false;
        expect(JsonSchema.validate({ some_flag: 1 }, schema)).to.be.false;
        expect(JsonSchema.validate({ some_flag: 'true' }, schema)).to.be.false;
        expect(JsonSchema.validate({ some_flag: { value: true } }, schema)).to.be.false;

        consoleLogStub.restore();
    });

    it('should resolve references for validation', () => {

        const special: any = {
            type: 'object',
            properties: {
                value: { type: 'boolean' },
            },
            required: ['value'],
            additionalProperties: false,
        };

        const schema: any = {
            type: 'object',
            properties: {
                special: { $ref: '/special' },
            },
            required: ['special'],
            additionalProperties: false,
        };

        const consoleLogStub = stub(console, 'log');

        expect(JsonSchema.validate({ special: { value: true } }, schema, [[special, '/special']])).to.be.true;

        expect(JsonSchema.validate({ other: { value: true } }, schema, [[special, '/special']])).to.be.false;
        expect(JsonSchema.validate({ value: true }, schema, [[special, '/special']])).to.be.false;

        expect(() => JsonSchema.validate({ special: { value: true } }, schema)).to.throw(SchemaError);

        consoleLogStub.restore();
    });

    it('should not complement undefined', () => {

        const object: any = undefined;
        JsonSchema.complement(object, {});
        expect(object).to.be.undefined;
    });

    it('should complement defaults (plain)', () => {

        const schema: any = {
            type: 'object',
            properties: {
                foo: { type: 'boolean', default: true },
                bar: {
                    anyOf: [
                        { type: 'number' }, { type: 'string' }],
                    default: 'value',
                },
            },
        };

        const consoleLogStub = stub(console, 'log');

        const object: any = {};
        JsonSchema.complement(object, schema);
        expect(object).to.haveOwnProperty('foo');
        expect(object.foo).to.be.true;
        expect(object).to.haveOwnProperty('bar');
        expect(object.bar).to.equal('value');

        consoleLogStub.restore();
    });

    it('should complement defaults (object)', () => {

        const schema: any = {
            type: 'object',
            properties: {
                foo: {
                    type: 'object', properties: {
                        bar: {
                            type: 'number',
                            default: 2.0,
                        },
                        baz: {
                            type: 'number',
                        },
                    },
                },
            },
        };

        const consoleLogStub = stub(console, 'log');

        let object: any = {};
        JsonSchema.complement(object, schema);

        expect(object).to.haveOwnProperty('foo');
        expect(object.foo).to.haveOwnProperty('bar');
        expect(object.foo.bar).to.equal(2.0);
        expect(object.foo).to.not.haveOwnProperty('baz');

        object = { foo: {} };
        JsonSchema.complement(object, schema);

        expect(object.foo).to.haveOwnProperty('bar');
        expect(object.foo.bar).to.equal(2.0);

        consoleLogStub.restore();
    });

    it('should complement defaults (arrays)', () => {

        const schema: any = {
            type: 'array',
            items: {
                type: 'object', properties: {
                    foo: { type: 'string', enum: ['bar', 'baz'], default: 'baz' },
                    bar: {
                        type: 'object', properties: {
                            baz: { type: 'integer', default: 5 },
                        },
                    },

                },
            },
        };

        const consoleLogStub = stub(console, 'log');

        const object: any = [{ other: true }];
        JsonSchema.complement(object, schema);

        expect(object[0]).to.haveOwnProperty('foo');
        expect(object[0].foo).to.equal('baz');
        expect(object[0]).to.haveOwnProperty('bar');
        expect(object[0].bar).to.haveOwnProperty('baz');
        expect(object[0].bar.baz).to.equal(5);

        consoleLogStub.restore();
    });

    it('should not complement defaults for non-object arrays', () => {

        const schema: any = { type: 'array', items: { type: 'integer' } };
        const consoleLogStub = stub(console, 'log');

        const object: Array<number> = [];
        JsonSchema.complement(object, schema);

        expect(object).to.be.empty;

        consoleLogStub.restore();
    });

});
