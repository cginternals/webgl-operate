
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

    protected static updateDistance(update1: Update, update2: Update): number {
        const orderedUpdate = update1.begin <= update2.begin ? [update1, update2] : [update2, update1];
        return orderedUpdate[1].begin - orderedUpdate[0].end;
    }

    constructor(context: Context, sizeInBytes: number, usage: GLenum, mergeThreshold = 0, identifier?: string) {
        super();

        this._cpuBuffer = new ArrayBuffer(sizeInBytes);
        this._gpuBuffer = new Buffer(context, identifier);
        this._usage = usage;
        this._mergeThreshold = mergeThreshold;
    }

    protected addUpdate(update: Update): void {
        const toRemove = new Array<number>();
        const toMerge = new Array<Update>();

        // Mark all older updates which overlap with the new update
        // for removing / merging
        this._updates.forEach((current: Update, index: number) => {
            if (UnifiedBuffer.updateDistance(current, update) <= this._mergeThreshold || this._mergeThreshold === -1) {
                toRemove.push(index);
                toMerge.push(current);
            }
        });

        // Remove all older updates, since they get merged in the next step
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this._updates.splice(toRemove[i], 1);
        }

        // Finally merge all overlapping updates
        toMerge.push(update);
        const begin = Math.min(...toMerge.map((merge: Update) => merge.begin));
        const end = Math.max(...toMerge.map((merge: Update) => merge.end));

        this._updates.push({ begin, end });
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
