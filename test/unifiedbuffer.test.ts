
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

    it('should split overlapping updates 1', () => {
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

        const expectedSubDataCalls = new Array<SubDataCall>(2);
        expectedSubDataCalls[0] = { srcOffset: 0, dstOffset: 0, length: 8, data: new Uint8Array(8).fill(1) };
        expectedSubDataCalls[1] = { srcOffset: 8, dstOffset: 8, length: 16, data: new Uint8Array(16).fill(2) };

        const actualSubDataCalls = buffer._gpuBuffer.subDataCalls.map((subDataCall: SubDataCall) => {
            return {
                srcOffset: subDataCall.srcOffset,
                dstOffset: subDataCall.dstOffset,
                length: subDataCall.length,
                data: new Uint8Array(subDataCall.data),
            };
        });

        expect(actualSubDataCalls).to.be.eql(expectedSubDataCalls);
    });

    it('should split overlapping updates 2', () => {
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

        const expectedSubDataCalls = new Array<SubDataCall>(2);
        expectedSubDataCalls[0] = { srcOffset: 16, dstOffset: 16, length: 8, data: new Uint8Array(8).fill(1) };
        expectedSubDataCalls[1] = { srcOffset: 0, dstOffset: 0, length: 16, data: new Uint8Array(16).fill(2) };

        const actualSubDataCalls = buffer._gpuBuffer.subDataCalls.map((subDataCall: SubDataCall) => {
            return {
                srcOffset: subDataCall.srcOffset,
                dstOffset: subDataCall.dstOffset,
                length: subDataCall.length,
                data: new Uint8Array(subDataCall.data),
            };
        });

        expect(actualSubDataCalls).to.be.eql(expectedSubDataCalls);
    });

    it('should split overlapping updates 3', () => {
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

        const expectedSubDataCalls = new Array<SubDataCall>(3);
        expectedSubDataCalls[0] = { srcOffset: 0, dstOffset: 0, length: 8, data: new Uint8Array(8).fill(1) };
        expectedSubDataCalls[1] = { srcOffset: 24, dstOffset: 24, length: 8, data: new Uint8Array(8).fill(1) };
        expectedSubDataCalls[2] = { srcOffset: 8, dstOffset: 8, length: 16, data: new Uint8Array(16).fill(2) };

        const actualSubDataCalls = buffer._gpuBuffer.subDataCalls.map((subDataCall: SubDataCall) => {
            return {
                srcOffset: subDataCall.srcOffset,
                dstOffset: subDataCall.dstOffset,
                length: subDataCall.length,
                data: new Uint8Array(subDataCall.data),
            };
        });

        expect(actualSubDataCalls).to.be.eql(expectedSubDataCalls);
    });

    it('should split overlapping updates 4', () => {
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

        const expectedSubDataCalls = new Array<SubDataCall>(1);
        expectedSubDataCalls[0] = { srcOffset: 0, dstOffset: 0, length: 32, data: new Uint8Array(32).fill(2) };

        const actualSubDataCalls = buffer._gpuBuffer.subDataCalls.map((subDataCall: SubDataCall) => {
            return {
                srcOffset: subDataCall.srcOffset,
                dstOffset: subDataCall.dstOffset,
                length: subDataCall.length,
                data: new Uint8Array(subDataCall.data),
            };
        });

        expect(actualSubDataCalls).to.be.eql(expectedSubDataCalls);
    });
});

function createUsableUnifiedBuffer(size: number): UnifiedBufferMock {
    const context = new ContextMock();
    const buffer = new UnifiedBufferMock(context as Context, 32, 0);

    buffer.initialize(0);
    buffer.update();

    return buffer;
}
