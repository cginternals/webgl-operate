
import { Observable, ReplaySubject } from 'rxjs';

import { assert, prettyPrintBytes } from './auxiliaries';


/**
 * This register enables monitoring of memory (de)allocations and is intended for use in WebGL context for internal GPU
 * memory allocation tracking. For it, a unique identifier for registration has to be created:
 * ```
 * let gpuAllocReg = this.context.gpuAllocationRegister;
 * const identifier = gpuAllocReg.createUniqueIdentifier('gpu-object');
 * ```
 *
 * Then allocations, deallocations, and reallocations can be registered:
 * ```
 * gpuAllocReg.allocate(identifier, this.sizeofRGBAColorAttachment());
 * gpuAllocReg.allocate(identifier, this.sizeofDepthStencilAttachment());
 * // ... reallocation
 * gpuAllocReg.reallocate(identifier,
 *     this.sizeofRGBAColorAttachment() + this.sizeofDepthStencilAttachment());
 * // ... uninitialize
 * gpuAllocReg.reallocate(identifier, 0);
 * ```
 *
 * Requesting the allocated memory can be done as follows:
 * ```
 * // memory allocated by identifier:
 * console.log(mfCanvas.context.gpuAllocationRegister.toString());
 * //> IntermediateFBO: 10.582MiB, AccumulationPingFBO: 21.163MiB, AccumulationPongFBO: 21.163MiB
 *
 * // memory allocated over all identifiers:
 * console.log(mfCanvas.context.gpuAllocationRegister.bytesToString());
 * //> 52.908MiB
 * ```
 */
export class AllocationRegister {

    /**
     * Map that provides access to the accumulated memory allocations for all registered identifiers.
     */
    protected _bytesByIdentifier = new Map<string, GLsizei>();

    /** @see {@link bytes} */
    protected _bytes: GLsizei = 0;
    protected _bytesSubject = new ReplaySubject<[GLsizei, string]>(1);

    /**
     * Utility for communicating this._bytes changes to its associated subject.
     */
    protected bytesNext(): void {
        this._bytesSubject.next([this._bytes, this.bytesToString()]);
    }


    /**
     * Asserts existence of an identifier.
     * @param identifier - Identifier to assert the existence of.
     */
    protected assertIdentifier(identifier: string): void {
        assert(this._bytesByIdentifier.has(identifier), `allocation identifier unknown`);
    }


    /**
     * Creates a unique identifier based on a given identifier: if the identifier is already unique it is returned as
     * is. If not, an enumerated identifier is returned, e.g., 'TempFBO-2' when 'TempFBO' already exists. This also
     * enables tracking for the identifier, thus, it should always be called before tracking/monitoring.
     * @param identifier - Requested identifier for allocation registration.
     * @returns - Unique identifier (might differ from given identifier) for which allocation registration is enabled.
     */
    createUniqueIdentifier(identifier: string): string {
        let uniqueIdentifier: string = identifier;
        let unificationSuffix = 2;

        while (this._bytesByIdentifier.has(uniqueIdentifier)) {
            uniqueIdentifier = `${identifier}-${unificationSuffix}`;
            ++unificationSuffix;
        }

        this._bytesByIdentifier.set(uniqueIdentifier, 0);
        return uniqueIdentifier;
    }

    /**
     * Removes a previously created unique identifier from the allocation registry.
     * @param identifier - Identifier that is to be deleted from allocation registration.
     */
    deleteUniqueIdentifier(identifier: string): void {
        assert(this._bytesByIdentifier.has(identifier), `identifier expected to be known for allocation registration`);
        this._bytesByIdentifier.delete(identifier);
    }

    /**
     * Registers allocated bytes for a given identifier.
     * @param identifier - Identifier to register the allocated bytes for.
     * @param allocate - Allocated bytes to register for identifier.
     */
    allocate(identifier: string, allocate: number): void {
        this.assertIdentifier(identifier);

        assert(allocate >= 0, `positive number of bytes expected for allocation, given ${allocate}`);

        /* Nothing to do if no bytes are allocated */
        if (allocate === 0) {
            return;
        }

        const bytes = (this._bytesByIdentifier.get(identifier) as number) + allocate;
        this._bytesByIdentifier.set(identifier, bytes);

        this._bytes = this._bytes + allocate; // allocate total
        this.bytesNext();
    }

    /**
     * Registers deallocated bytes for a given identifier.
     * @param identifier - Identifier to register the deallocated bytes for.
     * @param allocate - Number of deallocated bytes to register for identifier.
     */
    deallocate(identifier: string, deallocate: number): void {
        this.assertIdentifier(identifier);

        const bytes = this._bytesByIdentifier.get(identifier) as number;
        assert(deallocate >= 0, `positive number of bytes expected for deallocation, given ${deallocate}`);
        assert(deallocate <= bytes, `deallocation cannot exceed previous allocations of ${bytes}, given ${deallocate}`);

        /* Nothing to do if no bytes are deallocated */
        if (deallocate === 0) {
            return;
        }

        this._bytesByIdentifier.set(identifier, bytes - deallocate);

        this._bytes = this._bytes - deallocate; // deallocate total
        this.bytesNext();
    }

    /**
     * Resets the previously allocated bytes for the given identifier and registers the given allocated bytes instead.
     * @param identifier - Identifier to register the reallocated bytes for.
     * @param allocate - Number of reallocated bytes to register for identifier.
     */
    reallocate(identifier: string, reallocate: number): void {
        this.assertIdentifier(identifier);
        assert(reallocate >= 0, `positive number of bytes expected for reallocation, given ${reallocate}`);

        const previousBytes = this._bytesByIdentifier.get(identifier) as number;

        /* Nothing to do if same size should be reallocated */
        if (previousBytes === reallocate) {
            return;
        }

        this._bytes = this._bytes - previousBytes; // deallocate total
        this._bytesByIdentifier.set(identifier, reallocate);

        this._bytes = this._bytes + reallocate; // allocate total
        this.bytesNext();
    }

    /**
     * Provides access to the allocated bytes for an identifier as well as the overall allocated bytes (when identifier
     * is undefined, default). If the identifier is undefined, the overall allocated number of bytes is returned.
     * @param identifier - Identifier to return the allocated bytes for.
     * @param allocate - Number of allocated bytes registered for identifier.
     */
    allocated(identifier?: string): number {
        if (identifier === undefined) {
            return this._bytes;
        }
        this.assertIdentifier(identifier);
        return this._bytesByIdentifier.get(identifier) as number;
    }

    /**
     * Provides a pretty printed string of the allocated bytes of this register and their identifier. The output for a
     * register of three objects could be as follows:
     * ```
     * IntermediateFBO: 10.582MiB, AccumulationPingFBO: 21.163MiB, AccumulationPongFBO: 21.163MiB
     * ```
     * @returns - Pretty printed string of all memory allocations.
     */
    toString(): string {
        const output = new Array<string>();
        this._bytesByIdentifier.forEach((bytes: number, identifier: string) => {
            output.push(`${identifier}: ${prettyPrintBytes(bytes)}`);
        });
        return output.join(', ');
    }

    /**
     * Provides a pretty printed string of the overall number of bytes or a specific identifier. If the identifier is
     * undefined, the overall number of bytes is pretty printed.
     * @param identifier - Identifier to pretty print the bytes for.
     * @returns - Pretty printed string of the requested number of bytes.
     */
    bytesToString(identifier?: string): string {
        return prettyPrintBytes(this.allocated(identifier));
    }


    /**
     * Cache for the overall number of allocated bytes (over all identifiers). This should always be the sum of the
     * bytes allocated over each identifier, which can be validated using validate().
     *
     * This property can be observed, e.g., `allocationRegister.bytesObservable.subscribe()`.
     */
    get bytes(): GLsizei {
        return this._bytes;
    }

    /**
     * Observable that can be used to subscribe to bytes value changes. Yields a 2-tuple of overall allocated bytes as
     * number and pretty printed string.
     */
    get bytesObservable(): Observable<[GLsizei, string]> {
        return this._bytesSubject.asObservable();
    }
}
