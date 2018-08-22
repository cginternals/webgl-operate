
import * as chai from 'chai';

const expect = chai.expect;

import { AntiAliasingKernel } from '../source/antialiasingkernel';


describe('AntiAliasingKernel', () => {

    it('should comprise at least a single element', () => {
        const kernel = new AntiAliasingKernel(0);
        expect(kernel.elements).to.be.equal(1);
    });

    it('should have two component samples and provide byte information', () => {
        const kernel = new AntiAliasingKernel(4);
        expect(kernel.elements).to.be.equal(4);
        expect(kernel.components).to.be.equal(2);
        expect(kernel.bytesPerComponent).to.be.equal(4);
        expect(kernel.bytesLength).to.be.equal(4 * 4 * 2);
    });

    it('should start with [0.0, 0.0] unless golden set', () => {
        const kernel = new AntiAliasingKernel(1);
        expect(kernel.get(0)).to.deep.equal([0.0, 0.0]);

        kernel.width = 4;
        expect(kernel.elements).to.be.equal(4);
        expect(kernel.get(0)).to.deep.equal([0.0, 0.0]);

        kernel.width = 8;
        expect(kernel.elements).to.be.equal(8);
        expect(kernel.get(0)).to.not.deep.equal([0.0, 0.0]);

        kernel.width = 64;
        expect(kernel.elements).to.be.equal(64);
        expect(kernel.get(0)).to.not.deep.equal([0.0, 0.0]);
    });

    it('should not regenerate when (re)setting same width', () => {
        const kernel = new AntiAliasingKernel(4);
        const before = kernel.samples.slice();
        kernel.width = 4;
        const after = kernel.samples.slice();
        expect(before).to.deep.equal(after);
    });

});
