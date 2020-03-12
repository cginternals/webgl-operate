
/* spellchecker: disable */

import { Buffer } from './buffer';
import { Context } from './context';
import { Initializable } from './initializable';

/* spellchecker: enable */


export class UnifiedBuffer extends Initializable {

    protected _cpuBuffer: ArrayBuffer;
    protected _gpuBuffer: Buffer;
    protected _usage: GLenum;

    protected _updates = new Array<Update>();

    constructor(context: Context, sizeInBytes: number, usage: GLenum, identifier?: string) {
        super();

        this._cpuBuffer = new ArrayBuffer(sizeInBytes);
        this._gpuBuffer = new Buffer(context, identifier);
        this._usage = usage;
    }

    protected _addUpdate(update: Update): void {
        const toAdd = new Array<Update>();
        const toRemove = new Array<number>();

        this._updates.forEach((current: Update, index: number) => {
            if (current.begin >= update.begin && current.end <= update.end) {
                toRemove.push(index);
            } else if (current.begin >= update.begin && current.end >= update.end) {
                toAdd.push({ begin: update.end, end: current.end });
                toRemove.push(index);
            } else if (current.begin <= update.begin && current.end <= update.end) {
                toAdd.push({ begin: current.begin, end: update.begin });
                toRemove.push(index);
            } else if (current.begin <= update.begin && current.end >= update.end) {
                toAdd.push({ begin: current.begin, end: update.begin });
                toAdd.push({ begin: update.end, end: current.end });
                toRemove.push(index);
            }
        });

        for (let index = toRemove.length - 1; index >= 0; index--) {
            this._updates.splice(toRemove[index], 1);
        }

        this._updates.push(...toAdd);

        this._updates.push(update);
    }

    @Initializable.initialize()
    initialize(target: GLenum): boolean {
        return this._gpuBuffer.initialize(target);
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._gpuBuffer.uninitialize();

        this.subData(0, new Float32Array());
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
        const buffer = (srcData instanceof ArrayBuffer) ? srcData : srcData.buffer;

        const src = new Uint8Array(buffer);
        const dst = new Uint8Array(this._cpuBuffer);

        dst.set(src, dstByteOffset);
        this._addUpdate({ begin: dstByteOffset, end: dstByteOffset + src.byteLength });
    }

    @Initializable.assert_initialized()
    update(bind: boolean = false, unbind: boolean = false): void {
        if (bind) {
            this._gpuBuffer.bind();
        }

        if (this._gpuBuffer.bytes === 0) {
            this._gpuBuffer.data(this._cpuBuffer, this._usage);
        } else {
            for (const update of this._updates) {
                this._gpuBuffer.subData(update.begin, this._cpuBuffer, update.begin, update.end - update.begin);
            }
        }

        if (unbind) {
            this._gpuBuffer.unbind();
        }

        this._updates.length = 0;
    }

}

interface Update {
    /** inclusive */
    begin: number;
    /** exclusive */
    end: number;
}
