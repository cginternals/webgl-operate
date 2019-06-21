
import { assert } from '../auxiliaries';

import { Context } from '../context';
import { Texture2D } from '../texture2d';


/**
 * @todo add description
 */
export class ResourceManager {

    /**
     * Context, used to get context information and WebGL API access.
     */
    protected _context: Context;

    /**
     * Internal storage of 2D textures.
     */
    protected _texture2Ds = new Map<string, Texture2D>();


    /**
     * Creates a resource manager that can be used to fetch and store resources such as textures, geometries, etc.
     * @param context - Valid context to created fetched objects for. Note that add external resources are expected to
     * belong to that same context.
     */
    constructor(context: Context) {
        this._context = context;
    }


    /**
     * Creates a Texture2D object and asynchronously loads its image via URL or data URI (@see {@link Texture2D.fetch}).
     * @param url - Uniform resource locator string referencing the image that should be loaded (data URI supported).
     * @param crossOrigin - Enable cross origin data loading.
     * @param identifier - Meaningful name for identification of this instance.
     * @returns - Promise for handling image load status. Returns undefined if identifier already exists.
     */
    fetchTexture2D(identifier: string, url: string, crossOrigin: boolean = false): Promise<void> | undefined {
        if (this._texture2Ds.has(identifier)) {
            return undefined;
        }
        const texture = new Texture2D(this._context, identifier);
        assert(texture.identifier === identifier, `expected object identifier to be unchanged`);

        this._texture2Ds.set(identifier, texture);
        return texture.fetch(url, crossOrigin);
    }


    /**
     * Allows to add a resource that, e.g., was not fetched by this resource manager but was loaded or generated
     * somewhere else instead. Please note that by adding the resource, the manager assumes 'taking ownership'.
     * @param resource - Resource to add. The resource is expected to have an identifier.
     * @returns - True if the resource has been added thus is owned by the manager. False otherwise.
     */
    add(resource: Texture2D): boolean {

        if (resource instanceof Texture2D) {
            const texture = resource as Texture2D;
            if (this._texture2Ds.has(texture.identifier)) {
                return false;
            }
            this._texture2Ds.set(texture.identifier, texture);
            return true;
        }

        // if (resource instanceof ...) {
        //     const ... = resource as ...;
        //     if (this._ ... .has(... .identifier)) {
        //         return false;
        //     }
        //     this._ ... .set(... .identifier, ...);
        //     return true;
        // }

        return false;
    }

    /**
     * Queries a resource based on the given identifier.
     * @param identifier - Name of a previously added resource
     */
    get(identifier: string): Texture2D | /* ... | */ undefined {

        if (this._texture2Ds.has(identifier)) {
            return this._texture2Ds.get(identifier);
        }

        // if (this._ ... .has(identifier)) {
        //     return this._ ... .get(identifier);
        // }

        return undefined;
    }

}
