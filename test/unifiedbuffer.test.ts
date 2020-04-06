
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
        let data: ArrayBuffer;
        if (srcData instanceof ArrayBuffer) {
            data = srcData;
        } else {
            data = srcData.buffer.slice(srcData.byteOffset, srcData.byteOffset + srcData.byteLength);
        }
        this.subDataCalls.push({ dstOffset: dstByteOffset, data });
    }

    get bytes(): number {
        return this._bytes;
    }
}

class UnifiedBufferMock extends UnifiedBuffer {
    _gpuBuffer: BufferMock;

    constructor(context: ContextMock, size: number, mergeThreshold = 0) {
        super(context as Context, size, 0, mergeThreshold);

        this._gpuBuffer = new BufferMock(context);
    }

    get cpuBuffer(): ArrayBuffer {
        return this._cpuBuffer;
    }
}


describe('UnifiedBuffer', () => {

    it('should create buffer on gpu lazily', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32);

        buffer.initialize(0);
        expect(buffer._gpuBuffer.dataCalled).to.be.false;

        buffer.update();
        expect(buffer._gpuBuffer.dataCalled).to.be.true;
    });

    it('should work with different TypedArrays', () => {
        const buffer = createUsableUnifiedBuffer(32);

        buffer.subData(0, new Float32Array(8).fill(3456));
        buffer.update();

        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(1);
        const expectedFloats = new Float32Array(8).fill(3456);
        expect(new Float32Array(buffer._gpuBuffer.subDataCalls[0].data)).to.be.eql(expectedFloats);

        buffer._gpuBuffer.subDataCalls.length = 0;

        buffer.subData(0, new Int32Array(8).fill(-2134));
        buffer.update();

        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(1);
        const expectedInts = new Int32Array(8).fill(-2134);
        expect(new Int32Array(buffer._gpuBuffer.subDataCalls[0].data)).to.be.eql(expectedInts);
    });

    it('should keep content on resize', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32);

        buffer.subData(0, new Float32Array(8).fill(17));

        buffer.size = 16;
        expect(buffer.size).to.be.equal(16);

        const expectedSmall = new Float32Array(4).fill(17);
        expect(new Float32Array(buffer.cpuBuffer)).to.be.eql(expectedSmall);

        buffer.size = 32;
        expect(buffer.size).to.be.equal(32);

        const expectedLarge = new Float32Array(8).fill(17);
        expectedLarge.fill(0, 4, 8);
        expect(new Float32Array(buffer.cpuBuffer)).to.be.eql(expectedLarge);
    });
});

describe('UnifiedBuffer subData', () => {

    it('should throw on data exceeding size', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32);

        expect(() => buffer.subData(0, new Uint8Array(64))).to.throw;
        expect(() => buffer.subData(8, new Uint8Array(32))).to.throw;
    });

    it('should work with subarrays', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32);

        const tooBigArray = new ArrayBuffer(64);
        const tooBigArrayView = new Uint8Array(tooBigArray);
        tooBigArrayView.fill(13, 0, 16);
        tooBigArrayView.fill(17, 16, 32);
        const subArray = tooBigArrayView.subarray(8, 24);

        expect(() => buffer.subData(0, subArray)).to.not.throw;
        buffer.subData(0, subArray);

        const expected = new Uint8Array(32);
        expected.fill(13, 0, 8);
        expected.fill(17, 8, 16);
        expect(new Uint8Array(buffer.cpuBuffer)).to.be.eql(expected);
    });
});

describe('UnifiedBuffer update', () => {

    it('should not make unnecessary subData calls', () => {
        const context = new ContextMock();
        const buffer = new UnifiedBufferMock(context, 32);

        buffer.initialize(0);

        buffer.subData(0, new Uint8Array(32));
        buffer.update();
        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(0);
        expect(buffer._gpuBuffer.dataCalled).to.be.true;

        buffer._gpuBuffer.dataCalled = false;
        buffer.subData(0, new Uint8Array(32));
        buffer.update();
        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(1);
        expect(buffer._gpuBuffer.dataCalled).to.be.false;

        buffer._gpuBuffer.subDataCalls.length = 0;
        buffer.size = 16;
        buffer.subData(0, new Uint8Array(16));
        buffer.update();
        expect(buffer._gpuBuffer.subDataCalls.length).to.be.equal(0);
        expect(buffer._gpuBuffer.dataCalled).to.be.true;
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
            dstOffset: 0, data: expectedData,
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
            dstOffset: 0, data: expectedData,
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
            dstOffset: 0, data: expectedData,
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
            dstOffset: 0, data: expectedData,
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
            { dstOffset: 0, data: new Uint8Array(8).fill(1) },
            { dstOffset: 24, data: new Uint8Array(8).fill(2) });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });

    it('should respect the merge threshold on non-overlapping ranges 1', () => {
        const buffer = createUsableUnifiedBuffer(32, -1);

        buffer.subData(0, new Uint8Array(8).fill(1));
        buffer.subData(24, new Uint8Array(8).fill(2));

        buffer.update();

        const expectedData = new Uint8Array(32).fill(1, 0, 8).fill(2, 24, 32);
        const expectedSubDataCalls = new Array<SubDataCall>(
            { dstOffset: 0, data: expectedData });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });

    it('should respect the merge threshold on non-overlapping ranges 2', () => {
        const buffer = createUsableUnifiedBuffer(32, 4);

        buffer.subData(0, new Uint8Array(8).fill(1));
        buffer.subData(10, new Uint8Array(8).fill(2));
        buffer.subData(24, new Uint8Array(8).fill(3));

        buffer.update();

        const expectedData = new Uint8Array(18).fill(1, 0, 8).fill(2, 10, 18);
        const expectedSubDataCalls = new Array<SubDataCall>(
            { dstOffset: 0, data: expectedData },
            { dstOffset: 24, data: new Uint8Array(8).fill(3) });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });

    it('should respect the merge threshold on overlapping ranges', () => {
        const buffer = createUsableUnifiedBuffer(32, 4);

        buffer.subData(8, new Uint8Array(8).fill(1));
        buffer.subData(12, new Uint8Array(8).fill(2));

        buffer.update();

        const expectedData = new Uint8Array(12).fill(1, 0, 4).fill(2, 4, 12);
        const expectedSubDataCalls = new Array<SubDataCall>(
            { dstOffset: 8, data: expectedData });

        expect(mapSubDataCalls(buffer._gpuBuffer.subDataCalls)).to.be.eql(expectedSubDataCalls);
    });
});

function createUsableUnifiedBuffer(size: number, mergeThreshold = 0): UnifiedBufferMock {
    const context = new ContextMock();
    const buffer = new UnifiedBufferMock(context as Context, 32, mergeThreshold);

    buffer.initialize(0);
    buffer.update();

    return buffer;
}

function mapSubDataCalls(subDataCalls: Array<SubDataCall>): Array<SubDataCall> {
    return subDataCalls.map((subDataCall: SubDataCall) => {
        return {
            dstOffset: subDataCall.dstOffset,
            data: new Uint8Array(subDataCall.data),
        };
    });
}
