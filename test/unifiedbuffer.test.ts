
/* spellchecker: disable */

import * as chai from 'chai';
// import * as sinon from 'sinon';

const expect = chai.expect;
// const stub = sinon.stub;

import { AllocationRegister } from '../source/allocationregister';
import { Buffer } from '../source/buffer';
import { Context } from '../source/context';
import { UnifiedBuffer } from '../source/unifiedbuffer';

/* spellchecker: enable */


/* tslint:disable:max-classes-per-file no-unused-expression */

interface SubDataCall {
    dstOffset: number;
    srcOffset: number;
    length: number;
    data: ArrayBuffer;
}

class ContextMock {
    allocationRegister = new AllocationRegister();
}

class BufferMock extends Buffer {
    _bytes = 0;

    subDataCalls: Array<SubDataCall>;
    dataCalled: boolean;

    constructor(context: ContextMock) {
        super(context as Context);

        this.subDataCalls = new Array<SubDataCall>();
        this.dataCalled = false;
    }

    create(target: GLenum): WebGLBuffer | undefined {
        this._valid = true;
        return undefined;
    }

    data(data: ArrayBufferView | ArrayBuffer | GLsizeiptr, usage: GLenum,
        bind: boolean = true, unbind: boolean = true): void {
        this.dataCalled = true;
        this._bytes = typeof data === 'number' ? data : data.byteLength;
    }

    subData(dstByteOffset: GLintptr, srcData: ArrayBufferView | ArrayBuffer,
        srcOffset: GLuint = 0, length: GLuint = 0, bind: boolean = true, unbind: boolean = true): void {
        const buffer = srcData instanceof ArrayBuffer ? srcData : srcData.buffer;
        const data = new Uint8Array(buffer).buffer.slice(srcOffset, srcOffset + length);
        this.subDataCalls.push({ dstOffset: dstByteOffset, srcOffset, length, data });
    }

    get bytes(): number {
        return this._bytes;
    }
}

class UnifiedBufferMock extends UnifiedBuffer {
    _gpuBuffer: BufferMock;

    constructor(context: ContextMock, size: number, usage: GLenum) {
        super(context as Context, size, usage);

        this._gpuBuffer = new BufferMock(context);
    }

    get cpuBuffer(): ArrayBuffer {
        return this._cpuBuffer;
    }
}


describe('UnifiedBuffer', () => {

    it('should create buffer on gpu lazily', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32, 0);

        buffer.initialize(0);
        expect(buffer._gpuBuffer.dataCalled).to.be.equal(false);

        buffer.update();
        expect(buffer._gpuBuffer.dataCalled).to.be.equal(true);
    });

    it('should work with different TypedArrays', () => {
        const buffer = createUsableUnifiedBuffer(32);

        buffer.subData(0, new Float32Array(8).fill(3456));
        buffer.update();

        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(1);
        expect(new Float32Array(buffer._gpuBuffer.subDataCalls[0].data)).to.be.eql(new Float32Array(8).fill(3456));

        buffer._gpuBuffer.subDataCalls.length = 0;

        buffer.subData(0, new Int32Array(8).fill(-2134));
        buffer.update();

        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(1);
        expect(new Int32Array(buffer._gpuBuffer.subDataCalls[0].data)).to.be.eql(new Int32Array(8).fill(-2134));
    });

    it('should keep content on resize', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32, 0);

        buffer.subData(0, new Float32Array(8).fill(17));

        buffer.size = 16;
        expect(buffer.size).to.be.equal(16);
        expect(new Float32Array(buffer.cpuBuffer)).to.be.eql(new Float32Array(4).fill(17));

        buffer.size = 32;
        expect(buffer.size).to.be.equal(32);
        expect(new Float32Array(buffer.cpuBuffer)).to.be.eql(new Float32Array(8).fill(17).fill(0, 4, 8));
    });
});

describe('UnifiedBuffer subData', () => {

    it('should throw on data exceeding size', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32, 0);

        expect(() => buffer.subData(0, new Uint8Array(64))).to.throw;
        expect(() => buffer.subData(8, new Uint8Array(32))).to.throw;
    });

    it('should work with subarrays', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32, 0);

        const tooBigArray = new ArrayBuffer(64);
        const subArray = new Uint8Array(tooBigArray).fill(13, 0, 16).fill(17, 16, 32).subarray(8, 24);

        buffer.subData(0, subArray);
        expect(() => buffer.subData(0, subArray)).to.not.throw;

        const expected = new Uint8Array(32);
        expected.fill(13, 0, 8);
        expected.fill(17, 8, 16);
        expect(new Uint8Array(buffer.cpuBuffer)).to.be.eql(expected);
    });
});

describe('UnifiedBuffer update', () => {

    it('should not make unnecessary subData calls', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32, 0);

        buffer.initialize(0);

        buffer.subData(0, new Uint8Array(32));
        buffer.update();
        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(0);
        expect(buffer._gpuBuffer.dataCalled).to.be.equal(true);

        buffer._gpuBuffer.dataCalled = false;
        buffer.subData(0, new Uint8Array(32));
        buffer.update();
        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(1);
        expect(buffer._gpuBuffer.dataCalled).to.be.equal(false);

        buffer._gpuBuffer.subDataCalls.length = 0;
        buffer.size = 16;
        buffer.subData(0, new Uint8Array(16));
        buffer.update();
        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(0);
        expect(buffer._gpuBuffer.dataCalled).to.be.equal(true);
    });

    it('should discard old updates', () => {
        const buffer = createUsableUnifiedBuffer(32);

        buffer.subData(8, new Uint8Array(16).fill(1));
        buffer.subData(8, new Uint8Array(16).fill(2));

        buffer.update();

        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(1);
    });

    it('should merge overlapping updates 1', () => {
        const buffer = createUsableUnifiedBuffer(32);

        /**
         * _______
         * |______| old
         *    ________
         *    |_______| new
         */
        buffer.subData(0, new Uint8Array(16).fill(1));
        buffer.subData(8, new Uint8Array(16).fill(2));

        buffer.update();

        const expectedData = new Uint8Array(24).fill(1, 0, 16).fill(2, 8, 24);
        const expectedSubDataCalls = new Array<SubDataCall>({
            srcOffset: 0, dstOffset: 0, length: 24, data: expectedData,
        });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });

    it('should merge overlapping updates 2', () => {
        const buffer = createUsableUnifiedBuffer(32);

        /**
         *    _______
         *    |______| old
         * ________
         * |_______| new
         */
        buffer.subData(8, new Uint8Array(16).fill(1));
        buffer.subData(0, new Uint8Array(16).fill(2));

        buffer.update();

        const expectedData = new Uint8Array(24).fill(1, 8, 24).fill(2, 0, 16);
        const expectedSubDataCalls = new Array<SubDataCall>({
            srcOffset: 0, dstOffset: 0, length: 24, data: expectedData,
        });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });

    it('should merge overlapping updates 3', () => {
        const buffer = createUsableUnifiedBuffer(32);

        /**
         * ______________
         * |_____________| old
         *    ________
         *    |_______| new
         */
        buffer.subData(0, new Uint8Array(32).fill(1));
        buffer.subData(8, new Uint8Array(16).fill(2));

        buffer.update();

        const expectedData = new Uint8Array(32).fill(1, 0, 32).fill(2, 8, 24);
        const expectedSubDataCalls = new Array<SubDataCall>({
            srcOffset: 0, dstOffset: 0, length: 32, data: expectedData,
        });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });

    it('should merge overlapping updates 4', () => {
        const buffer = createUsableUnifiedBuffer(32);

        /**
         *    _______
         *    |______| old
         * ______________
         * |_____________| new
         */
        buffer.subData(8, new Uint8Array(16).fill(1));
        buffer.subData(0, new Uint8Array(32).fill(2));

        buffer.update();

        const expectedData = new Uint8Array(32).fill(2, 0, 32);
        const expectedSubDataCalls = new Array<SubDataCall>({
            srcOffset: 0, dstOffset: 0, length: 32, data: expectedData,
        });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });

    it('should not merge separate updates', () => {
        const buffer = createUsableUnifiedBuffer(32);

        /**
         * _______
         * |______| old
         *             _______
         *             |______| new
         */
        buffer.subData(0, new Uint8Array(8).fill(1));
        buffer.subData(24, new Uint8Array(8).fill(2));

        buffer.update();

        const expectedSubDataCalls = new Array<SubDataCall>(
            { srcOffset: 0, dstOffset: 0, length: 8, data: new Uint8Array(8).fill(1) },
            { srcOffset: 24, dstOffset: 24, length: 8, data: new Uint8Array(8).fill(2) });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });
});

function createUsableUnifiedBuffer(size: number): UnifiedBufferMock {
    const context = new ContextMock();
    const buffer = new UnifiedBufferMock(context as Context, 32, 0);

    buffer.initialize(0);
    buffer.update();

    return buffer;
}

function mapSubDataCalls(subDataCalls: Array<SubDataCall>): Array<SubDataCall> {
    return subDataCalls.map((subDataCall: SubDataCall) => {
        return {
            dstOffset: subDataCall.dstOffset,
            srcOffset: subDataCall.srcOffset,
            length: subDataCall.length,
            data: new Uint8Array(subDataCall.data),
        };
    });
}
