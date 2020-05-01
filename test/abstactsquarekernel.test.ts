/* spellchecker: disable */


import * as chai from 'chai';
import * as spies from 'chai-spies';

chai.use(spies);

const expect = chai.expect;

import {
    KernelF32, KernelI8, KernelUI32, KernelI32, KernelUI8, KernelJSON, AbstractKernel
} from '../source/kernel';


/* tslint:disable:no-unused-expression */

describe('PrimitiveKernels', () => {

    it('function position to never fail and return undefined', () => {
        const kernel32fArray = [new KernelF32(1, 1), new KernelF32(2, 2, 2), new KernelF32(4, 4, 4, 4)];
        expect(kernel32fArray).to.not.be.undefined;
        kernel32fArray.forEach((array) => {
            for (let x = 0; x < 4; x++) {
                for (let y = 0; y < 4; y++) {
                    for (let z = 0; z < 4; z++) {
                        expect(array.position(x + y * 4)).to.not.be.undefined;
                    }
                }
            }
        });
    });

    it('get function should run on correct indices', () => {
        const kernel32f1 = new KernelI8(1, 1);
        const kernel32f2 = new KernelI8(2, 2, 2);
        const kernel32f3 = new KernelI8(3, 3, 3, 3);
        const kernel32f4 = new KernelI8(4, 4, 4, 4);
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 4; y++) {
                for (let z = 0; z < 4; z++) {
                    expect(kernel32f4.get(x + y * 4 + z * 4 * 4)).to.not.be.undefined;
                    expect(kernel32f4.get(x, y, z)).to.not.be.undefined;
                }
            }
        }
        expect(() => { kernel32f1.get(0) }).to.not.throws();
        expect(() => { kernel32f2.get(3) }).to.not.throws();
        expect(() => { kernel32f3.get(26) }).to.not.throws();


        expect(() => { kernel32f4.get(10000000000) }).to.throws();
    });

    it('set function should run on correct indices', () => {
        const kernel32f1 = new KernelUI8(1, 1);
        const kernel32f2 = new KernelUI8(2, 2, 2);
        const kernel32f3 = new KernelUI8(3, 3, 3, 3);
        const kernel32f4 = new KernelUI8(4, 4, 4, 4);
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 4; y++) {
                for (let z = 0; z < 4; z++) {
                    expect(() => { kernel32f4.set([1, 2, 3, 4], x + y * 4 + z * 4 * 4) }).to.not.throws();
                    expect(() => { kernel32f4.set([1, 2, 3, 4], x, y, z) }).to.not.throws();
                }
            }
        }
        expect(() => { kernel32f1.set([1], 0) }).to.not.throws();
        expect(() => { kernel32f2.set([1, 2], 3) }).to.not.throws();
        expect(() => { kernel32f3.set([1, 2, 3], 26) }).to.not.throws();


        expect(() => { kernel32f4.set([1], 10000000000) }).to.throws();
    });

    it('should be sortable with evey sorting approach', () => {
        const kernel32fArray = [new KernelI32(1, 1), new KernelI32(2, 2, 2), new KernelI32(4, 4, 4, 4)];
        expect(kernel32fArray).to.not.be.undefined;
        kernel32fArray.forEach((array) => {
            array.sort(AbstractKernel.SortApproach.BySquaredLength);
        });
    });


    it('should be initializable from JSON', () => {
        let kernelJson: KernelJSON = { kernel: new Array<number>(1), size: { width: 1, height: 1, depth: 1 } };
        const kernelF32 = new KernelF32(1, 1);
        expect(() => { kernelF32.fromJSON(kernelJson) }).to.not.throws();

        kernelJson = { kernel: new Array<number>(1), size: { width: 1, height: 1, depth: 1 } };
        const kernelUI32 = new KernelUI32(1, 1);
        expect(() => { kernelUI32.fromJSON(kernelJson) }).to.not.throws();

        kernelJson = { kernel: new Array<number>(1), size: { width: 1, height: 1, depth: 1 } };
        const kernelI32 = new KernelI32(1, 1);
        expect(() => { kernelI32.fromJSON(kernelJson) }).to.not.throws();

        kernelJson = { kernel: new Array<number>(1), size: { width: 1, height: 1, depth: 1 } };
        const kernelUI8 = new KernelUI8(1, 1);
        expect(() => { kernelUI8.fromJSON(kernelJson) }).to.not.throws();

    });

    it('should be able to retrieve dimension lengths', () => {
        const kernelF32 = new KernelI32(1, 1);
        expect(() => { kernelF32.width}).to.not.throws();
        expect(kernelF32.width).to.not.be.undefined;

        expect(() => { kernelF32.height}).to.not.throws();
        expect(kernelF32.height).to.not.be.undefined;

        expect(() => { kernelF32.depth}).to.not.throws();
        expect(kernelF32.depth).to.not.be.undefined;
    });

    it('should be able to retrieve strides', () => {
        const kernelF32 = new KernelI32(1, 1);
        expect(() => { kernelF32.xStride}).to.not.throws();
        expect(kernelF32.xStride).to.not.be.undefined;

        expect(() => { kernelF32.yStride}).to.not.throws();
        expect(kernelF32.yStride).to.not.be.undefined;

        expect(() => { kernelF32.zStride}).to.not.throws();
        expect(kernelF32.zStride).to.not.be.undefined;

        expect(() => { kernelF32.bytesLength}).to.not.throws();
        expect(kernelF32.bytesLength).to.not.be.undefined;

        expect(() => { kernelF32.bytesPerComponent}).to.not.throws();
        expect(kernelF32.bytesPerComponent).to.not.be.undefined;
    });
});

