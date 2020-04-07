
/* spellchecker: disable */

import { Buffer } from './buffer';
import { Context } from './context';
import { Initializable } from './initializable';

/* spellchecker: enable */


export class UnifiedBuffer extends Initializable {

    protected _cpuBuffer: ArrayBuffer;
    protected _gpuBuffer: Buffer;
    protected _updates = new Array<Update>();
    protected _usage: GLenum;
    protected _mergeThreshold: number;

    protected static updatesNeedMerge(lhsUpdate: Update, rhsUpdate: Update, mergeThreshold: number): boolean {
        return rhsUpdate.begin - lhsUpdate.end < mergeThreshold || mergeThreshold === -1;
    }

    constructor(context: Context, sizeInBytes: number, usage: GLenum, mergeThreshold = 0, identifier?: string) {
        super();

        this._cpuBuffer = new ArrayBuffer(sizeInBytes);
        this._gpuBuffer = new Buffer(context, identifier);
        this._usage = usage;
        this._mergeThreshold = mergeThreshold;
    }

    /**
     * Merges all updates left of index transitively with the update at index
     * until there are no more updates within the merge threshold.
     * @param index - Index of the update that should get merged
     * @returns - Number of merged updates
     */
    protected mergeUpdatesLeft(index: number): number {
        let removeCount = 0;
        const rhs = this._updates[index];

        for (let i = index - 1; i >= 0; i--) {
            const lhs = this._updates[i];

            if (UnifiedBuffer.updatesNeedMerge(lhs, rhs, this._mergeThreshold)) {
                rhs.begin = Math.min(rhs.begin, lhs.begin);
                rhs.end = Math.max(rhs.end, lhs.end);
                removeCount++;
            } else {
                break;
            }
        }

        this._updates.splice(index - removeCount, removeCount);

        return removeCount + 1;
    }

    /**
     * Merges all updates right of index transitively with the update at index
     * until there are no more updates within the merge threshold.
     * @param index - Index of the update that should get merged
     * @returns - Number of merged updates
     */
    protected mergeUpdatesRight(index: number): number {
        let removeCount = 0;
        const lhs = this._updates[index];

        for (let i = index + 1; i < this._updates.length; i++) {
            const rhs = this._updates[i];

            if (UnifiedBuffer.updatesNeedMerge(lhs, rhs, this._mergeThreshold)) {
                lhs.begin = Math.min(lhs.begin, rhs.begin);
                lhs.end = Math.max(lhs.end, rhs.end);
                removeCount++;
            } else {
                break;
            }
        }

        this._updates.splice(index + 1, removeCount);

        return removeCount + 1;
    }

    protected addUpdate(update: Update): void {
        const start = this._updates.findIndex((current: Update) => {
            return update.begin < current.begin;
        });

        if (start === -1) {
            this._updates.push(update);

            this.mergeUpdatesLeft(this._updates.length - 1);
        } else {
            this._updates.splice(start, 0, update);

            this.mergeUpdatesRight(start);
            this.mergeUpdatesLeft(start);
        }
    }

    @Initializable.initialize()
    initialize(target: GLenum): boolean {
        return this._gpuBuffer.initialize(target);
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._gpuBuffer.uninitialize();
    }

    @Initializable.assert_initialized()
    bind(): void {
        this._gpuBuffer.bind();
    }

    @Initializable.assert_initialized()
    unbind(): void {
        this._gpuBuffer.unbind();
    }

    @Initializable.assert_initialized()
    attribEnable(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean = false,
        stride: GLsizei = 0, offset: GLintptr = 0, bind: boolean = true, unbind: boolean = true): void {
        this._gpuBuffer.attribEnable(index, size, type, normalized, stride, offset, bind, unbind);
    }

    @Initializable.assert_initialized()
    attribDisable(index: GLuint, bind: boolean = true, unbind: boolean = true): void {
        this._gpuBuffer.attribDisable(index, bind, unbind);
    }

    /**
     * Merges all recorded subData ranges.
     */
    mergeSubDataRanges(): void {
        let index = 0;
        while (index < this._updates.length) {
            index += this.mergeUpdatesRight(index);
        }
    }

    subData(dstByteOffset: GLintptr, srcData: ArrayBufferView | ArrayBuffer): void {
        let src: Uint8Array;
        if (srcData instanceof ArrayBuffer) {
            src = new Uint8Array(srcData);
        } else {
            src = new Uint8Array(srcData.buffer).subarray(srcData.byteOffset, srcData.byteOffset + srcData.byteLength);
        }

        const dst = new Uint8Array(this._cpuBuffer);

        dst.set(src, dstByteOffset);
        this.addUpdate({ begin: dstByteOffset, end: dstByteOffset + src.byteLength });
    }

    @Initializable.assert_initialized()
    update(bind: boolean = false, unbind: boolean = false): void {
        if (bind) {
            this._gpuBuffer.bind();
        }

        if (this._gpuBuffer.bytes !== this._cpuBuffer.byteLength) {
            this._gpuBuffer.data(this._cpuBuffer, this._usage);
        } else {
            const bufferView = new Uint8Array(this._cpuBuffer);
            for (const update of this._updates) {
                const subBufferView = bufferView.subarray(update.begin, update.end);
                this._gpuBuffer.subData(update.begin, subBufferView);
            }
        }

        if (unbind) {
            this._gpuBuffer.unbind();
        }

        this._updates.length = 0;
    }

    get size(): number {
        return this._cpuBuffer.byteLength;
    }

    set size(sizeInBytes: number) {
        const oldBuffer = this._cpuBuffer;
        this._cpuBuffer = new ArrayBuffer(sizeInBytes);

        // Takes the whole buffer, if sizeInBytes > oldBuffer
        // Takes sizeInBytes of oldBuffer otherwise
        const src = new Uint8Array(oldBuffer).slice(0, sizeInBytes);
        const dst = new Uint8Array(this._cpuBuffer);
        dst.set(src);
    }

    get usage(): GLenum {
        return this._usage;
    }

    set usage(usage: GLenum) {
        this._usage = usage;
    }

    get mergeThreshold(): number {
        return this._mergeThreshold;
    }

    set mergeThreshold(mergeThreshold: number) {
        this._mergeThreshold = mergeThreshold;
    }
}

interface Update {
    /** inclusive */
    begin: number;
    /** exclusive */
    end: number;
}
