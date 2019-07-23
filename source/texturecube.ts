
/* spellchecker: disable */

import { assert, log, LogLevel } from './auxiliaries';
import { byteSizeOfFormat } from './formatbytesizes';

import { Bindable } from './bindable';
import { TexImage2DData } from './gl2facade';
import { Initializable } from './initializable';
import { AbstractObject } from './object';

/* spellchecker: enable */


/**
 * Wrapper for an WebGL cube texture providing size accessors and requiring for bind, unbind, resize, validity, and
 * initialization implementations. The texture cube object is created on initialization and deleted on uninitialization.
 * After being initialized, the texture cube can be resized, reformated, and data can set directly or via load:
 * ```
 * const cubeMap = new TextureCube(context, 'CubeMap');
 * cubeMap.initialize(512, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
 * cubeMap.load({
 *     positiveX: 'data/cubemap.px.png', negativeX: 'data/cubemap.nx.png',
 *     positiveY: 'data/cubemap.py.png', negativeY: 'data/cubemap.ny.png',
 *     positiveZ: 'data/cubemap.pz.png', negativeZ: 'data/cubemap.nz.png',
 * }).then(() => this.invalidate(true);
 * ```
 * Please note that each of the six textures of a texture cube is required to be of the exact same, square dimensions.
 * This is reflected within this classes interface by providing a single size property in favor to width and height.
 */
export class TextureCube extends AbstractObject<WebGLTexture> implements Bindable {

    /**
     * Default texture, e.g., used for unbind.
     */
    static readonly DEFAULT_TEXTURE = undefined;

    /** @see {@link size} */
    protected _size: GLsizei = 0;

    /** @see {@link internalFormat} */
    protected _internalFormat: GLenum = 0;

    /** @see {@link format} */
    protected _format: GLenum = 0;

    /** @see {@link type} */
    protected _type: GLenum = 0;

    /**
     * For tracking approximate use of GPU storage in bytes per face.
     */
    protected _bytes: Array<GLsizei> = [0, 0, 0, 0, 0, 0];


    /**
     * Provides an ID for each of the six texture cube identifier (0: +x, 1: -x, 2: +y, 3: -y, 4: +z, 5: -z).
     * @param face - Texture cube face identifier, e.g., `TEXTURE_CUBE_MAP_POSITIVE_X`.
     * @returns - Face ID in the following sequence: 0: +x, 1: -x, 2: +y, 3: -y, 4: +z, 5: -z.
     */
    protected faceID(face: GLenum): GLint {
        const gl = this._context.gl;
        switch (face) {
            case gl.TEXTURE_CUBE_MAP_POSITIVE_X:
                return 0;
            case gl.TEXTURE_CUBE_MAP_NEGATIVE_X:
                return 1;
            case gl.TEXTURE_CUBE_MAP_POSITIVE_Y:
                return 2;
            case gl.TEXTURE_CUBE_MAP_NEGATIVE_Y:
                return 3;
            case gl.TEXTURE_CUBE_MAP_POSITIVE_Z:
                return 4;
            case gl.TEXTURE_CUBE_MAP_NEGATIVE_Z:
                return 5;
            default:
                assert(false, `expected texture cube map identifier (${gl.TEXTURE_CUBE_MAP_POSITIVE_X}, ` +
                    `${gl.TEXTURE_CUBE_MAP_NEGATIVE_X}, ${gl.TEXTURE_CUBE_MAP_POSITIVE_Y}, ` +
                    `${gl.TEXTURE_CUBE_MAP_NEGATIVE_Y}, ${gl.TEXTURE_CUBE_MAP_POSITIVE_Z}, or` +
                    `${gl.TEXTURE_CUBE_MAP_NEGATIVE_Z}), given ${face}`);
                return -1;
        }
    }


    /**
     * Create a texture object on the GPU.
     * @param size - Initial size (width/height) of each face, which are required to be a square texture.
     * @param internalFormat - Internal format of the texture object.
     * @param format - Format of the texture data even though no data is passed.
     * @param type - Data type of the texel data.
     */
    protected create(size: GLsizei, internalFormat: GLenum, format: GLenum, type: GLenum): WebGLTexture | undefined {

        assert(size > 0, `texture cube requires valid size (width/height) of greater than zero`);
        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        this._object = gl.createTexture();

        this._size = size;
        this._internalFormat = internalFormat;
        this._format = format;
        this._type = type;

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._object);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, this._internalFormat,
            this._size, this._size, 0, this._format, this._type);
        gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, this._internalFormat,
            this._size, this._size, 0, this._format, this._type);
        gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, this._internalFormat,
            this._size, this._size, 0, this._format, this._type);
        gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, this._internalFormat,
            this._size, this._size, 0, this._format, this._type);
        gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, this._internalFormat,
            this._size, this._size, 0, this._format, this._type);
        gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, this._internalFormat,
            this._size, this._size, 0, this._format, this._type);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, TextureCube.DEFAULT_TEXTURE);
        /* note that gl.isTexture requires the texture to be bound */
        this._valid = gl.isTexture(this._object);
        this.context.allocationRegister.reallocate(this._identifier, 0);

        return this._object;
    }

    /**
     * Delete the texture object on the GPU. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        assert(this._object instanceof WebGLTexture, `expected WebGLTexture object`);
        this._context.gl.deleteTexture(this._object);

        this._object = undefined;
        this._valid = false;

        this._internalFormat = 0;
        this._format = 0;
        this._type = 0;

        this._size = 0;
    }


    /**
     * Bind the texture object to a texture unit.
     */
    @Initializable.assert_initialized()
    bind(unit?: GLenum): void {
        const gl = this.context.gl;
        if (unit) {
            gl.activeTexture(unit);
        }
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._object);
    }

    /**
     * Unbind the texture object from a texture unit.
     */
    @Initializable.assert_initialized()
    unbind(unit?: GLenum): void {
        const gl = this.context.gl;
        if (unit) {
            gl.activeTexture(unit);
        }
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, TextureCube.DEFAULT_TEXTURE);
    }

    /**
     * Asynchronous load of multiple images (specified per texture cube face) via URI or data URI. Please note
     * that the texture will not be resized and is assumed to be resized upfront accordingly.
     * @param urisByFace - URI linking the image that should be loaded for a specific face. Data URI is also supported.
     * @param crossOrigin - Enable cross origin data loading.
     * @returns - Promise for handling images load status.
     */
    @Initializable.assert_initialized()
    fetch(urisByFace: TextureCube.PerFaceURI, mipLevel: number = 0, crossOrigin: boolean = false): Promise<void> {

        const gl = this.context.gl;
        return new Promise((resolve, reject) => {
            const images = new Array<[GLenum, string]>();

            if (urisByFace.positiveX) {
                images.push([gl.TEXTURE_CUBE_MAP_POSITIVE_X, urisByFace.positiveX]);
            }
            if (urisByFace.negativeX) {
                images.push([gl.TEXTURE_CUBE_MAP_NEGATIVE_X, urisByFace.negativeX]);
            }
            if (urisByFace.positiveY) {
                images.push([gl.TEXTURE_CUBE_MAP_POSITIVE_Y, urisByFace.positiveY]);
            }
            if (urisByFace.negativeY) {
                images.push([gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, urisByFace.negativeY]);
            }
            if (urisByFace.positiveZ) {
                images.push([gl.TEXTURE_CUBE_MAP_POSITIVE_Z, urisByFace.positiveZ]);
            }
            if (urisByFace.negativeZ) {
                images.push([gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, urisByFace.negativeZ]);
            }

            let waiting = images.length;
            for (const tuple of images) {
                const image = new Image();
                image.onerror = () => reject();

                image.onload = () => {
                    const size = this.calculateMipLevelSize(mipLevel);

                    if (image.width !== image.height) {
                        log(LogLevel.Warning, `image ignored, width and height expected to be equal (square image)`);
                        return;
                    }

                    if (image.width !== size) {
                        log(LogLevel.Warning, `image ignored, width and height expected to match ` +
                            `this texture's size ${size}, given ${image.width}`);
                        return;
                    }
                    this.data([tuple[0], image], mipLevel);

                    /* Resolve the promise when all requested images have been loaded. */
                    waiting = waiting - 1;
                    if (waiting === 0) {
                        resolve();
                    }
                };

                if (crossOrigin) {
                    image.crossOrigin = 'anonymous';
                }
                /* Trigger asynchronous loading of image data. */
                image.src = tuple[1];
            }

        });
    }

    /**
     * This function returns how big a specific mip level for this cubemap hast to be.
     * @param level - The level for which the size should be determined
     */
    calculateMipLevelSize(level: number): number {
        return this._size * Math.pow(0.5, level);
    }

    /**
     * Pass data of six images to the texture cube object.
     * @param data - Per face texel data that will be copied into the objects data store. Either provided via object
     * or as tuple, providing the data associated to the targeted face (as GLenum).
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    data(data: TextureCube.PerFaceData | [GLenum, TexImage2DData],
        mipLevel: number = 0,
        bind: boolean = true,
        unbind: boolean = true): void {

        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        const size = this.calculateMipLevelSize(mipLevel);

        let bytesPerFace = size * size * byteSizeOfFormat(this.context, this._internalFormat as GLenum);
        // Fix in case of implicit float and half-float texture generation (e.g., in webgl with half_float support).
        if (this._type === this.context.gl2facade.HALF_FLOAT && this._internalFormat !== this.context.gl.RGBA16F) {
            bytesPerFace *= 2;
        } else if (this._type === this.context.gl.FLOAT && this._internalFormat !== this.context.gl.RGBA16F) {
            bytesPerFace *= 4;
        }

        if (bind) {
            this.bind();
        }

        if (data instanceof Array && data.length === 2) { /* if tuple is provided... */
            gl2facade.texImage2D(data[0], mipLevel, this._internalFormat,
                size, size, 0, this._format, this._type, data[1]);
            const id = this.faceID(data[0]);
            this.context.allocationRegister.deallocate(this._identifier, this._bytes[id]);
            this.context.allocationRegister.allocate(this._identifier, bytesPerFace);
            this._bytes[id] = bytesPerFace;

        } else {
            const perFaceData = data as TextureCube.PerFaceData;

            if (perFaceData.positiveX !== undefined) {
                gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, mipLevel, this._internalFormat,
                    size, size, 0, this._format, this._type, perFaceData.positiveX);
                this.context.allocationRegister.deallocate(this._identifier, this._bytes[0]);
                this.context.allocationRegister.allocate(this._identifier, bytesPerFace);
                this._bytes[0] = bytesPerFace;
            }
            if (perFaceData.negativeX !== undefined) {
                gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, mipLevel, this._internalFormat,
                    size, size, 0, this._format, this._type, perFaceData.negativeX);
                this.context.allocationRegister.deallocate(this._identifier, this._bytes[1]);
                this.context.allocationRegister.allocate(this._identifier, bytesPerFace);
                this._bytes[1] = bytesPerFace;
            }
            if (perFaceData.positiveY !== undefined) {
                gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, mipLevel, this._internalFormat,
                    size, size, 0, this._format, this._type, perFaceData.positiveY);
                this.context.allocationRegister.deallocate(this._identifier, this._bytes[2]);
                this.context.allocationRegister.allocate(this._identifier, bytesPerFace);
                this._bytes[2] = bytesPerFace;
            }
            if (perFaceData.negativeY !== undefined) {
                gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, mipLevel, this._internalFormat,
                    size, size, 0, this._format, this._type, perFaceData.negativeY);
                this.context.allocationRegister.deallocate(this._identifier, this._bytes[3]);
                this.context.allocationRegister.allocate(this._identifier, bytesPerFace);
                this._bytes[3] = bytesPerFace;
            }
            if (perFaceData.positiveZ !== undefined) {
                gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, mipLevel, this._internalFormat,
                    size, size, 0, this._format, this._type, perFaceData.positiveZ);
                this.context.allocationRegister.deallocate(this._identifier, this._bytes[4]);
                this.context.allocationRegister.allocate(this._identifier, bytesPerFace);
                this._bytes[4] = bytesPerFace;
            }
            if (perFaceData.negativeZ !== undefined) {
                gl2facade.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, mipLevel, this._internalFormat,
                    size, size, 0, this._format, this._type, perFaceData.negativeZ);
                this.context.allocationRegister.deallocate(this._identifier, this._bytes[5]);
                this.context.allocationRegister.allocate(this._identifier, bytesPerFace);
                this._bytes[5] = bytesPerFace;
            }
        }

        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Sets the texture object's magnification and minification filter.
     * @param mag - Value for the TEXTURE_MAG_FILTER parameter.
     * @param min - Value for the TEXTURE_MIN_FILTER parameter.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    filter(mag: GLenum, min: GLenum, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, mag);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, min);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Sets the texture object's wrapping function for s and t coordinates.
     * @param wrap_s - Value for the TEXTURE_WRAP_S parameter.
     * @param wrap_t - Value for the TEXTURE_WRAP_T parameter.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    /* tslint:disable-next-line:variable-name */
    wrap(wrap_s: GLenum, wrap_t: GLenum, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wrap_s);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wrap_t);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Set the textures base and max level for mip mapping. This needs to be used when mip levels
     * are uploaded manually to specifiy how many mip levels exist.
     * @param baseLevel - The level with the maximal resolution, usually this will be 0.
     * @param maxLevel - The level with the minimal resolution.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    levels(baseLevel: number, maxLevel: number, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_BASE_LEVEL, baseLevel);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAX_LEVEL, maxLevel);

        if (unbind) {
            this.unbind();
        }
    }

    /**
     * This can be used to reformat the texture image without creating a new texture object. Please note that this
     * resets the texture's image data to undefined. @see {@link data} for setting new image data.
     * @param internalFormat - Internal format of the texture object.
     * @param format - Format of the texture data even though no data is passed.
     * @param type - Data type of the texel data.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    reformat(internalFormat: GLenum, format?: GLenum, type?: GLenum,
        bind: boolean = true, unbind: boolean = true): void {

        if (internalFormat === this._internalFormat
            && (format === undefined || format === this._format)
            && (type === undefined || type === this._type)) {
            return;
        }
        assert(internalFormat !== undefined, `valid internal format expected`);
        this._internalFormat = internalFormat;

        if (format) {
            this._format = format;
        }
        if (type) {
            this._type = type;
        }

        this.data({ clearOnUndefined: true }, 0, bind, unbind);
    }

    /**
     * This should be used to efficiently resize the texture.
     * @param size - Targeted/new size (width/height) of the texture in px.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    resize(size: GLsizei, bind: boolean = true, unbind: boolean = true): void {
        if (size === this._size) {
            return;
        }
        this._size = size;

        this.data({ clearOnUndefined: true }, 0, bind, unbind);
    }

    /**
     * Returns the number of bytes this object approximately allocates on the GPU. The size will be zero when no
     * image data was passed to the texture object.
     */
    get bytes(): GLsizei {
        this.assertInitialized();
        return this.context.allocationRegister.allocated(this._identifier);
    }

    /**
     * Cached internal format of the texture for efficient resize. This can only be changed by re-initialization.
     */
    get internalFormat(): GLenum {
        this.assertInitialized();
        return this._internalFormat as GLenum;
    }

    /**
     * Cached format of the data provided to the texture object for efficient resize. This is set on initialization and
     * might change on data transfers.
     */
    get format(): GLenum {
        this.assertInitialized();
        return this._format as GLenum;
    }

    /**
     * Cached type of the data provided to the texture used for efficient resize. This is set on initialization and
     * might change on data transfers.
     */
    get type(): GLenum {
        this.assertInitialized();
        return this._type as GLenum;
    }

    /**
     * The width/height of the texture object (each cube map face is required to be a square).
     */
    get size(): GLsizei {
        this.assertInitialized();
        return this._size;
    }

}


export namespace TextureCube {

    export interface PerFaceURI {
        positiveX?: string;
        negativeX?: string;
        positiveY?: string;
        negativeY?: string;
        positiveZ?: string;
        negativeZ?: string;
    }

    export interface PerFaceData {
        positiveX?: TexImage2DData;
        negativeX?: TexImage2DData;
        positiveY?: TexImage2DData;
        negativeY?: TexImage2DData;
        positiveZ?: TexImage2DData;
        negativeZ?: TexImage2DData;
        clearOnUndefined: boolean;
    }

}
