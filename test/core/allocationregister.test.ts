
import * as chai from 'chai';

const expect = chai.expect;


import { AllocationRegister } from '../../source/core/allocationregister';


describe('AllocationTracker', () => {

    it('should provide unique identifier', () => {
        const tracker = new AllocationRegister();
        const id1 = tracker.createAndTrackUniqueIdentifier('foo');
        const id2 = tracker.createAndTrackUniqueIdentifier('foo');

        expect(id1).to.equal('foo');
        expect(id2.substr(0, 3)).to.equal('foo');
        expect(id2).not.to.equal('foo');
    });

    it('should not allow tracking for unknown identifier', () => {
        const tracker = new AllocationRegister();
        expect(() => tracker.allocate('foo', 0)).to.throw();
    });

    it('should accumulate identifier allocations', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        tracker.allocate(id, 0);
        expect(tracker.allocated(id)).to.equal(0);
        tracker.allocate(id, 1);
        tracker.allocate(id, 2);
        tracker.allocate(id, 3);
        expect(tracker.allocated(id)).to.equal(6);
        expect(tracker.allocated()).to.equal(6);
    });

    it('should accumulate identifier deallocations', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        tracker.allocate(id, 3);
        tracker.deallocate(id, 0);
        expect(tracker.allocated(id)).to.equal(3);
        tracker.deallocate(id, 2);
        expect(tracker.allocated(id)).to.equal(1);
    });

    it('should accumulate multiple identifier allocations', () => {
        const tracker = new AllocationRegister();
        const id1 = tracker.createAndTrackUniqueIdentifier('foo-1');
        const id2 = tracker.createAndTrackUniqueIdentifier('foo-2');
        tracker.allocate(id1, 1);
        tracker.allocate(id2, 2);
        tracker.allocate(id1, 3);
        tracker.allocate(id2, 4);
        expect(tracker.allocated(id1)).to.equal(4);
        expect(tracker.allocated(id2)).to.equal(6);
        expect(tracker.allocated()).to.equal(10);
    });

    it('should be initialized with zero bytes for every identifier', () => {
        const tracker = new AllocationRegister();
        const id1 = tracker.createAndTrackUniqueIdentifier('foo-1');
        const id2 = tracker.createAndTrackUniqueIdentifier('foo-2');
        expect(tracker.allocated(id1)).to.equal(0);
        expect(tracker.allocated(id2)).to.equal(0);
        expect(tracker.allocated()).to.equal(0);
    });

    it('should throw on allocations for an unknown identifier', () => {
        const tracker = new AllocationRegister();
        const id = 'foo';
        expect(() => tracker.allocate(id, 0)).to.throw();
        expect(() => tracker.deallocate(id, 0)).to.throw();
        expect(() => tracker.reallocate(id, 0)).to.throw();
        expect(() => tracker.allocated(id)).to.throw();
    });

    it('should not allow negatie allocations', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        expect(() => tracker.allocate(id, -1)).to.throw();
        expect(() => tracker.deallocate(id, -1)).to.throw();
        expect(() => tracker.reallocate(id, -1)).to.throw();
    });

    it('should not allow deallocations to exceed allocations', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        tracker.allocate(id, 1);
        expect(() => tracker.deallocate(id, 2)).to.throw();
    });

    it('should reset on reallocation', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        tracker.allocate(id, 5);
        tracker.reallocate(id, 2);
        expect(tracker.allocated(id)).to.equal(2);
    });

    it('should reset cached size on reallocations', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        tracker.allocate(id, 5);
        tracker.reallocate(id, 2);
        expect(tracker.allocated(id)).to.equal(2);
        expect(tracker.allocated()).to.equal(2);
    });

    it('should track correct overall bytes on allocations', () => {
        const tracker = new AllocationRegister();
        const id1 = tracker.createAndTrackUniqueIdentifier('foo');
        const id2 = tracker.createAndTrackUniqueIdentifier('bar');
        tracker.allocate(id1, 5);
        tracker.allocate(id2, 3);
        expect(tracker.allocated()).to.equal(8);
    });

    it('should track correct overall bytes on deallocations', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        tracker.allocate(id, 5);
        tracker.deallocate(id, 3);
        expect(tracker.allocated()).to.equal(2);
        tracker.deallocate(id, 1);
        expect(tracker.allocated()).to.equal(1);
    });

    it('should track correct overall bytes on reallocations', () => {
        const tracker = new AllocationRegister();
        const id = tracker.createAndTrackUniqueIdentifier('foo');
        tracker.allocate(id, 5);
        tracker.reallocate(id, 3);
        expect(tracker.allocated()).to.equal(3);
        tracker.reallocate(id, 1);
        expect(tracker.allocated()).to.equal(1);
    });

    it('should pretty print allocated bytes by identifier', () => {
        const tracker = new AllocationRegister();
        const foo = tracker.createAndTrackUniqueIdentifier('foo');
        const bar = tracker.createAndTrackUniqueIdentifier('bar');
        tracker.allocate(foo, 123);
        tracker.reallocate(bar, 456789);
        expect(tracker.toString()).to.equal('foo: 123B, bar: 446.083KiB');
    });

    it('should be validate print allocated bytes by identifier', () => {
        const tracker = new AllocationRegister();
        const foo = tracker.createAndTrackUniqueIdentifier('foo');
        const bar = tracker.createAndTrackUniqueIdentifier('bar');
        tracker.allocate(foo, 123);
        tracker.reallocate(bar, 456789);
        expect(tracker.toString()).to.equal('foo: 123B, bar: 446.083KiB');
    });

});
