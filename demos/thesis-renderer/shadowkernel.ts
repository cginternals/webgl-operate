
/* spellchecker: disable */

import { auxiliaries } from 'webgl-operate';

import { vec3 } from 'gl-matrix';

import { AbstractKernel, KernelF32 } from 'webgl-operate'

import { DiskLight } from './arealight';

/* spellchecker: enable */


export class ShadowKernel extends KernelF32 {

    protected _diskLight: DiskLight;

    constructor(width: number, diskLight: DiskLight) {
        super(3, width);
        this._diskLight = diskLight;
        this.generate();
    }

    protected generate(): void {
        auxiliaries.assert(this.width > 0, `expected every kernel to comprise at least one element`);

        const center = this._diskLight.center;
        this.set([center[0], center[1], center[2]], 0);
        for (let i = 1; i < this.width; ++i) {
            const offset = vec3.random(vec3.create(), this._diskLight.radius);
            const eye = vec3.add(vec3.create(), center, offset);
            this.set([eye[0], eye[1], eye[2]], i);
        }

        this.sort(AbstractKernel.SortApproach.BySquaredLength);
    }

    get width(): GLsizei {
        return this._width;
    }

    set width(width: GLsizei) {
        if (this._width === width) {
            return;
        }
        this._width = width;
        this.resize();
        this.generate();
    }

}
