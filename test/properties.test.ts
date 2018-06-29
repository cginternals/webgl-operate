
import * as chai from 'chai';
import * as sinon from 'sinon';

const expect = chai.expect;
const stub = sinon.stub;


import { SchemaError } from 'jsonschema';

import { ChangeLookup } from '../source/changelookup';
import { compare, complement, validate } from '../source/properties';


/* tslint:disable:no-unused-expression */

describe('Property validation', () => {

    it('should trigger JSON-schema based validation', () => {

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

        expect(validate({ some_flag: true }, schema)).to.be.true;

        expect(validate({}, schema)).to.be.false;
        expect(validate({ additional: 1.0 }, schema)).to.be.false;
        expect(validate({ some_flag: 1 }, schema)).to.be.false;
        expect(validate({ some_flag: 'true' }, schema)).to.be.false;
        expect(validate({ some_flag: { value: true } }, schema)).to.be.false;

        consoleLogStub.restore();
    });

    it('should resolve schema references for validation', () => {

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

        expect(validate({ special: { value: true } }, schema, [[special, '/special']])).to.be.true;

        expect(validate({ other: { value: true } }, schema, [[special, '/special']])).to.be.false;
        expect(validate({ value: true }, schema, [[special, '/special']])).to.be.false;

        expect(() => validate({ special: { value: true } }, schema)).to.throw(SchemaError);

        consoleLogStub.restore();
    });

});


describe('Property complementation', () => {

    it('should not complement undefined', () => {

        const object: any = undefined;
        complement(object, {});
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
        complement(object, schema);
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
        complement(object, schema);

        expect(object).to.not.haveOwnProperty('foo');

        object = { foo: {} };
        complement(object, schema);

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
        complement(object, schema);

        expect(object[0]).to.haveOwnProperty('foo');
        expect(object[0].foo).to.equal('baz');
        expect(object[0]).to.not.haveOwnProperty('bar');

        consoleLogStub.restore();
    });

    it('should not complement defaults for non-object arrays', () => {

        const schema: any = { type: 'array', items: { type: 'integer' } };
        const consoleLogStub = stub(console, 'log');

        const object: Array<number> = [];
        complement(object, schema);

        expect(object).to.be.empty;

        consoleLogStub.restore();
    });

});


describe('Property comparison', () => {

    it('should deep compare two basic objects', () => {

        expect(compare(true, true)).to.be.false;
        expect(compare(true, false)).to.be.true;

        expect(compare('foo', 'foo')).to.be.false;
        expect(compare('bar', 'baz')).to.be.true;

        expect(compare(1.0, 1.0)).to.be.false;
        expect(compare([1.0, 2.0], [1.0, 2.0])).to.be.false;

        expect(compare(1.0, '1.0')).to.be.true;

        expect(compare([1.0], 1.0)).to.be.true;
        expect(compare(1.0, [1.0])).to.be.true;

        expect(compare(undefined, 1.0)).to.be.true;
        expect(compare(1.0, undefined)).to.be.true;

        expect(compare([1.0, 2.0], [2.0, 1.0])).to.be.true;

    });

    it('should deep compare two objects', () => {

        expect(compare({ foo: 1.0, bar: 2.0 }, { foo: 1.0, bar: 2.0 })).to.be.false;
        expect(compare({ foo: 1.0, bar: ['baz', 'null'] }, { foo: 1.0, bar: ['baz', 'null'] })).to.be.false;

        expect(compare({ foo: 1.0, bar: ['baz', 'null'] }, { foo: 1.0, bar: ['baz', 'none'] })).to.be.true;
        expect(compare({ foo: 2.0, bar: '1.0' }, { foo: 1.0, bar: '2.0' })).to.be.true;
        expect(compare({ foo: 1.0, bar: ['baz', 'null'] }, { foo: 1.0, bar: 2.0 })).to.be.true;
        expect(compare({ foo: 1.0, bar: 2.0 }, { foo: 1.0, bar: ['baz', 'null'] })).to.be.true;

        expect(compare([{ foo: 1.0 }, { bar: 2.0 }], [{ foo: 1.0 }, { bar: 2.0 }])).to.be.false;
        expect(compare([{ foo: 1.0 }, { bar: 2.0 }], [{ foo: 1.0 }, { baz: 2.0 }])).to.be.true;

    });

    it('should track alterations on compare', () => {

        const altered = Object.assign(new ChangeLookup(), {
            any: false, foo: { any: false, bar: false, baz: false }, other: false,
        });

        expect(compare(
            { foo: { bar: 1.0, baz: '2.0' }, other: [3, 4] },
            { foo: { bar: 1.0, baz: '2.0' }, other: [3, 4] }, altered)).to.be.false;
        expect(altered.any).to.be.false;
        altered.reset();


        expect(compare(
            { foo: { bar: 1.0, baz: '2.0' }, other: [3, 4] },
            { foo: { bar: 1.0, baz: '2.0' }, other: [3, 5] }, altered)).to.be.true;
        expect(altered.any).to.be.true;
        expect(altered.foo.any).to.be.false;
        expect(altered.other).to.be.true;
        altered.reset();


        expect(compare(
            { foo: { bar: 1.0, baz: '2.0' }, other: [3, 4] },
            { foo: { bar: 2.0, baz: '2.0' }, other: [3, 4] }, altered)).to.be.true;
        expect(altered.any).to.be.true;
        expect(altered.foo.any).to.be.true;
        expect(altered.foo.bar).to.be.true;
        expect(altered.foo.baz).to.be.false;
        expect(altered.other).to.be.false;
        altered.reset();


        expect(compare(
            { foo: { bar: 1.0 }, other: [3, 4] },
            { foo: { bar: 1.0 } }, altered)).to.be.true;
        expect(altered.any).to.be.true;
        expect(altered.foo.any).to.be.false;
        expect(altered.other).to.be.true;
        altered.reset();


        expect(compare(
            { foo: { bar: 1.0 } },
            { foo: { bar: 1.0 }, other: [3, 4] }, altered)).to.be.true;
        expect(altered.any).to.be.true;
        expect(altered.foo.any).to.be.false;
        expect(altered.other).to.be.true;
        altered.reset();


        expect(compare(
            { foo: undefined },
            { foo: { bar: 1.0 }, other: undefined }, altered)).to.be.true;
        expect(altered.any).to.be.true;
        expect(altered.foo.any).to.be.true;
        expect(altered.other).to.be.false;
        altered.reset();


        expect(compare(undefined, { foo: { bar: 1.0 } }, altered)).to.be.true;
        expect(altered.any).to.be.true;
        expect(altered.foo.any).to.be.true;
        expect(altered.other).to.be.true;
        altered.reset();

        expect(compare(1.0, { foo: { bar: 1.0 } }, altered)).to.be.true;
        expect(altered.any).to.be.true;
        expect(altered.foo.any).to.be.true;
        expect(altered.other).to.be.true;
        altered.reset();

    });

});
