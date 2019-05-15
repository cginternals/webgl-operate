
import { assert } from '../auxiliaries';

import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';
import { Material } from '../scene';
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
     * Internal storage of material.
     */
    protected _materials = new Map<string, Material>();

    /**
     * Internal storage of geometries.
     */
    protected _geometries = new Map<string, Geometry>();

    /**
     * Internal storage of buffers.
     */
    protected _buffers = new Map<string, Buffer>();

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
     * If all given identifiers are already in use, the resource manager does not take ownership of the resource.
     * @param resource - Resource to add.
     * @param identifiers - The identifiers by which the resource can be queried from the ResourceManager.
     * @returns - The array of added indentifiers. If an identifier already exists for another resource it is not added.
     */
    add(resource: Texture2D | Material | Geometry | Buffer, identifiers: Array<string>): Array<string> {

        const addedIdentifiers = new Array<string>();

        if (resource instanceof Texture2D) {
            const texture = resource as Texture2D;

            for (const identifier of identifiers) {
                if (!this._texture2Ds.has(identifier)) {
                    this._texture2Ds.set(identifier, texture);
                    addedIdentifiers.push(identifier);
                }
            }
        }

        if (resource instanceof Material) {
            const material = resource as Material;

            for (const identifier of identifiers) {
                if (!this._materials.has(identifier)) {
                    this._materials.set(identifier, material);
                    addedIdentifiers.push(identifier);
                }
            }
        }

        if (resource instanceof Geometry) {
            const geometry = resource as Geometry;

            for (const identifier of identifiers) {
                if (!this._geometries.has(identifier)) {
                    this._geometries.set(identifier, geometry);
                    addedIdentifiers.push(identifier);
                }
            }
        }

        if (resource instanceof Buffer) {
            const buffer = resource as Buffer;

            for (const identifier of identifiers) {
                if (!this._buffers.has(identifier)) {
                    this._buffers.set(identifier, buffer);
                    addedIdentifiers.push(identifier);
                }
            }
        }

        return addedIdentifiers;
    }

    /**
     * Queries a resource based on the given identifier.
     * @param identifier - Name of a previously added resource
     */
    get(identifier: string): Texture2D | Material | Geometry | Buffer | undefined {

        if (this._texture2Ds.has(identifier)) {
            return this._texture2Ds.get(identifier);
        }

        if (this._materials.has(identifier)) {
            return this._materials.get(identifier);
        }

        if (this._geometries.has(identifier)) {
            return this._geometries.get(identifier);
        }

        if (this._buffers.has(identifier)) {
            return this._buffers.get(identifier);
        }

        return undefined;
    }

}
