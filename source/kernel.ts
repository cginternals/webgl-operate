
import { assert, logIf, LogLevel } from './auxiliaries';

import { GLsizei3 } from './tuples';


/* tslint:disable:max-classes-per-file */

export interface KernelJSON {
    kernel: any;
    size: {
        width: number,
        height: number,
        depth: number,
    };
}


/**
 * Kernel class is based on the idea of glkernel {@link https://github.com/cginternals/glkernel} and is the basis for
 * various auxiliary kernels that are mainly intended for but not limited to GPU use. A kernel stores samples in a
 * three-dimensional structure. Each sample can have up to four components (vec4) and is strongly typed, e.g.,
 * {@link KernelF32}. The samples can be accessed and modified in various ways and easily passed to the GPU.
 */
export abstract class AbstractKernel<T extends Float32Array | Uint32Array | Int32Array | Uint8Array | Int8Array> {

    protected _samples: T;

    /** @see {@link width} */
    protected _width: GLsizei;

    /** @see {@link height} */
    protected _height: GLsizei;

    /** @see {@link depth} */
    protected _depth: GLsizei;

    /** @see {@link components} */
    protected _components: 1 | 2 | 3 | 4;


    constructor(components: 1 | 2 | 3 | 4, width: GLsizei, height: GLsizei = 1, depth: GLsizei = 1) {
        this._components = components;
        this._width = Math.max(1, width);
        this._height = Math.max(1, height);
        this._depth = Math.max(1, depth);

        this.resize();
    }

    /**
     * Should resize the samples array w.r.t. to the typed array buffer.
     * The resulting array buffer may be empty.
     */
    protected abstract resize(): void;


    /**
     * Returns the n-tuple/n-component element at index within the cached kernel.
     * @param xPosOrIndex - If x is greater than width, this is interpreted as overall kernel index (requires y and z
     * positions to be undefined). Position is clamped to the range [0, width - 1].
     * @param yPos - Position along the y-axis to access the kernel element at (clamped to range [0, height - 1]).
     * @param zPos - Position along the z-axis to access the kernel element at (clamped to range [0, depth  - 1]).
     * @returns - Tuple of all components of the element at the requested index/position.
     */
    get(xPosOrIndex: GLsizei, yPos?: GLsizei, zPos?: GLsizei): number[] {

        let i: number;
        if (yPos === undefined && zPos === undefined) {
            i = this._components * xPosOrIndex;
        } else {
            i = this.index(xPosOrIndex, yPos, zPos ? zPos : 0);
        }
        assert(i < this.length, `index expected to be in range [0, ${this.length - 1}], given ${i}`);

        /* tslint:disable-next-line:switch-default */
        switch (this._components) {
            case 1:
                return [this._samples[i]];
            case 2:
                return [this._samples[i], this._samples[i + 1]];
            case 3:
                return [this._samples[i], this._samples[i + 1], this._samples[i + 2]];
            case 4:
                return [this._samples[i], this._samples[i + 1], this._samples[i + 2], this._samples[i + 3]];
        }
    }

    /**
     * Sets the n-tuple/n-component sample at index within the cached kernel.
     * @param sample - Values to be set at specified index or position.
     * @param xPosOrIndex - If x is greater than width, this is interpreted as overall kernel index (requires y and z
     * positions to be undefined). Position is clamped to the range [0, width - 1].
     * @param yPos - Position along the y-axis to access the kernel element at (clamped to range [0, height - 1]).
     * @param zPos - Position along the z-axis to access the kernel element at (clamped to range [0, depth  - 1]).
     */
    set(sample: number[], xPosOrIndex: GLsizei, yPos?: GLsizei, zPos?: GLsizei): void {
        assert(sample.length === this._components,
            `number of components expected to be ${this._components}, given ${sample.length}`);

        let i: number;
        if (yPos === undefined && zPos === undefined) {
            i = this._components * Math.min(this.elements, Math.max(0, xPosOrIndex));
        } else {
            i = this._components * this.index(xPosOrIndex, yPos, zPos ? zPos : 0);
        }
        assert(i < this.length, `index expected to be in range [0, ${this.length - 1}], given ${i}`);

        /* tslint:disable-next-line:switch-default */
        switch (this._components) {
            /* falls through */
            case 4:
                this._samples[i + 3] = sample[3];
            /* falls through */
            case 3:
                this._samples[i + 2] = sample[2];
            /* falls through */
            case 2:
                this._samples[i + 1] = sample[1];
            /* falls through */
            case 1:
                this._samples[i + 0] = sample[0];
                break;
        }
    }

    /**
     * Inheritor is expected to implement this in order to copy and type-convert a flat array.
     * @param samples - Array of all sample components in a flat sequence.
     */
    abstract fromArray(samples: Array<number>): void;

    /**
     * Fully reconfigures, i.e., resizes and copies samples, the kernel.
     * @param json - JSON object either from file, or set manually. These kernels can be generated using, e.g.,
     * glkernel {@link https://github.com/cginternals/glkernel}.
     */
    fromJSON(json: KernelJSON): void {

        assert(json.size && json.size.width !== undefined && json.size.height !== undefined &&
            json.size.depth !== undefined, `expected kernel width, height, and depth to be set, given '${json.size}'`);

        const flatten = (array: Array<number>): Array<number> => array.reduce(
            (a: any, b: any) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

        this._width = Math.max(1, json.size.width);
        this._height = Math.max(1, json.size.height);
        this._depth = Math.max(1, json.size.depth);

        const array = flatten(json.kernel);
        this._components = Math.floor(array.length / this.elements) as 1 | 2 | 3 | 4;

        this.resize();
        this.fromArray(array);
    }


    /**
     * Returns the index of an element at a specific position.
     * @param xPos - Position along the x-axis (clamped to range [0, width  - 1]).
     * @param yPos - Position along the y-axis (clamped to range [0, height - 1]).
     * @param zPos - Position along the z-axis (clamped to range [0, depth  - 1]).
     * @returns - The index of the element at the requested position.
     */
    index(xPos: GLsizei, yPos: GLsizei = 0, zPos: GLsizei = 0): GLsizei {
        return this._width * (this._height * Math.min(this._depth, Math.max(0, zPos))
            + Math.min(this._height, Math.max(0, yPos))) + Math.min(this._width, Math.max(0, xPos));
    }

    /**
     * Returns the position of an element at a specific index.
     * @param index - Index of the requested position (clamped to range [0, size]).
     * @returns - The position of the element at the requested index as 3-tuple [x, y, z].
     */
    position(index: GLsizei): GLsizei3 {
        let clamped = Math.min(this.elements, Math.max(0, index));
        const zPos: GLsizei = Math.floor(clamped / (this._width * this._height));
        clamped -= zPos * this._width * this._height;
        const yPos: GLsizei = Math.floor(clamped / this._width);
        clamped -= yPos * this._width;
        const xPos: GLsizei = clamped;
        return [xPos, yPos, zPos];
    }


    /**
     * All elements/samples of the kernel as array buffer.
     */
    get samples(): T {
        return this._samples;
    }

    /**
     * Returns the number of samples, i.e., the number of elements times the number of components per element.
     */
    get length(): GLsizei {
        return this._width * this._height * this._depth * this._components;
    }

    /**
     * Returns the number of samples.
     */
    get elements(): GLsizei {
        return this._width * this._height * this._depth;
    }

    /**
     * Number of components per sample, e.g., 2 for 2-tuple samples, 3 for 3-tuple samples, etc.
     */
    get components(): GLsizei {
        return this._components;
    }

    /**
     * The width of the kernel (x-axis)
     */
    get width(): GLsizei {
        return this._width;
    }

    /**
     * The height of the kernel (y-axis)
     */
    get height(): GLsizei {
        return this._height;
    }

    /**
     * The depth of the kernel (z-axis)
     */
    get depth(): GLsizei {
        return this._depth;
    }

    /**
     * Distance between the indices of two adjacent elements along the x-axis in bytes.
     */
    get xStride(): GLsizei {
        return this.bytesPerComponent * this._components;
    }

    /**
     * Distance between the indices of two adjacent elements along the y-axis in bytes.
     */
    get yStride(): GLsizei {
        return this.bytesPerComponent * this._components * this._width;
    }

    /**
     * Distance between the indices of two adjacent elements along the z-axis in bytes.
     */
    get zStride(): GLsizei {
        return this.bytesPerComponent * this._components * this._width * this._depth;
    }

    /**
     * Length of all samples in bytes.
     */
    get bytesLength(): GLsizei {
        return this.bytesPerComponent * this._components * this._width * this._height * this._depth;
    }

    /**
     * Size of a sample's component in bytes.
     */
    abstract get bytesPerComponent(): GLsizei;

}


export class KernelF32 extends AbstractKernel<Float32Array> {

    protected resize(): void {
        this._samples = new Float32Array(this.length);
    }

    /**
     * Copies and converts samples to this kernels typed samples.
     * @param samples - Flat array of all sample values.
     */
    fromArray(samples: Array<number>): void {
        assert(samples.length === this.length, `expected samples length to match this kernel's length`);
        this._samples.set(new Float32Array(samples));
    }

    get bytesPerComponent(): GLsizei {
        return 4;
    }
}


export class KernelUI32 extends AbstractKernel<Uint32Array> {

    protected resize(): void {
        this._samples = new Uint32Array(this.length);
    }

    /**
     * Copies and converts samples to this kernels typed samples.
     * @param samples - Flat array of all sample values.
     */
    fromArray(samples: Array<number>): void {
        assert(samples.length === this.length, `expected samples length to match this kernel's length`);
        this._samples.set(new Uint32Array(samples));
    }

    get bytesPerComponent(): GLsizei {
        return 4;
    }
}

export class KernelI32 extends AbstractKernel<Int32Array> {

    protected resize(): void {
        this._samples = new Int32Array(this.length);
    }

    /**
     * Copies and converts samples to this kernels typed samples.
     * @param samples - Flat array of all sample values.
     */
    fromArray(samples: Array<number>): void {
        assert(samples.length === this.length, `expected samples length to match this kernel's length`);
        this._samples.set(new Int32Array(samples));
    }

    get bytesPerComponent(): GLsizei {
        return 4;
    }
}


export class KernelUI8 extends AbstractKernel<Uint8Array> {

    protected resize(): void {
        this._samples = new Uint8Array(this.length);
    }

    /**
     * Copies and converts samples to this kernels typed samples.
     * @param samples - Flat array of all sample values.
     */
    fromArray(samples: Array<number>): void {
        assert(samples.length === this.length, `expected samples length to match this kernel's length`);
        this._samples.set(new Uint8Array(samples));
    }

    get bytesPerComponent(): GLsizei {
        return 4;
    }
}

export class KernelI8 extends AbstractKernel<Int8Array> {

    protected resize(): void {
        this._samples = new Int8Array(this.length);
    }

    /**
     * Copies and converts samples to this kernels typed samples.
     * @param samples - Flat array of all sample values.
     */
    fromArray(samples: Array<number>): void {
        assert(samples.length === this.length, `expected samples length to match this kernel's length`);
        this._samples.set(new Int8Array(samples));
    }

    get bytesPerComponent(): GLsizei {
        return 4;
    }
}
