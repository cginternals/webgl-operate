
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';
import assert = auxiliaries.assert;

import { byteSizeOfFormat } from './formatbytesizes';
import { tuples } from './tuples';

import { Bindable } from './bindable';
import { TexImage3DData } from './gl2facade';
import { Initializable } from './initializable';
import { AbstractObject } from './object';

/* spellchecker: enable */


/**
 * Wrapper for an WebGL 2D texture providing size accessors and requiring for bind, unbind, resize, validity, and
 * initialization implementations. The texture object is created on initialization and deleted on uninitialization.
 * After being initialized, the texture can be resized, reformated, and data can set directly or via load:
 * ```
 * const texture = new Texture3D(context, 'Texture');
 * texture.initialize(1, 1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
 * texture.load('/img/webgl-operate-logo.png', true)
 * ```
 */
export class Texture3D extends AbstractObject<WebGLTexture> implements Bindable {

    /**
     * Default texture, e.g., used for unbind.
     */
    static readonly DEFAULT_TEXTURE = undefined;

    /** @see {@link width} */
    protected _width: GLsizei = 0;

    /** @see {@link height} */
    protected _height: GLsizei = 0;

    /** @see {@link depth} */
    protected _depth: GLsizei = 0;


    /** @see {@link internalFormat} */
    protected _internalFormat: GLenum = 0;

    /** @see {@link format} */
    protected _format: GLenum = 0;

    /** @see {@link type} */
    protected _type: GLenum = 0;


    /**
     * Create a texture object on the GPU.
     * @param width - Initial width of the texture in px.
     * @param height - Initial height of the texture in px.
     * @param depth - Initial depth of the texture in px.
     * @param internalFormat - Internal format of the texture object.
     * @param format - Format of the texture data even though no data is passed.
     * @param type - Data type of the texel data.
     */
    protected create(width: GLsizei, height: GLsizei, depth: GLsizei, internalFormat: GLenum,
        format: GLenum, type: GLenum): WebGLTexture | undefined {
        assert(this._context.supportsTexImage3D, `expected texImage3D to be supported`);

        assert(width > 0 && height > 0 && depth > 0,
            `texture requires valid width, height, and depth of greater than zero`);
        const gl = this._context.gl;
        const gl2facade = this._context.gl2facade;

        this._object = gl.createTexture();

        this._width = width;
        this._height = height;
        this._depth = depth;
        this._internalFormat = internalFormat;
        this._format = format;
        this._type = type;

        gl.bindTexture(gl.TEXTURE_3D, this._object);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

        gl2facade.texImage3D(gl.TEXTURE_3D, 0, this._internalFormat,
            this._width, this._height, this._depth, 0, this._format, this._type);

        gl.bindTexture(gl.TEXTURE_3D, Texture3D.DEFAULT_TEXTURE);
        /* note that gl.isTexture requires the texture to be bound */
        this._valid = gl.isTexture(this._object);

        this.reallocate();
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

        this._width = 0;
        this._height = 0;
        this._depth = 0;
    }

    protected reallocate(): void {
        const gl = this.context.gl;
        const gl2facade = this._context.gl2facade;

        let bytes: GLsizei = this._width * this._height * this._depth
            * byteSizeOfFormat(this.context, this._internalFormat);
        // Fix in case of implicit float and half-float texture generation (e.g., in webgl with half_float support).
        if (this._type === gl2facade.HALF_FLOAT && this._internalFormat !== gl.RGBA16F) {
            bytes *= 2;
        } else if (this._type === gl.FLOAT && this._internalFormat !== gl.RGBA16F) {
            bytes *= 4;
        }
        this.context.allocationRegister.reallocate(this._identifier, bytes);
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
        gl.bindTexture(gl.TEXTURE_3D, this._object);
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
        gl.bindTexture(gl.TEXTURE_3D, Texture3D.DEFAULT_TEXTURE);
    }

    /**
     * Asynchronous load of an image comprising a column/row of slices via URL or data URI. Please note that due to the lack
     * of sub-data access on images, the slices are loaded using a auxiliary canvas and context (temporarily). The sub
     * images (slices) are drawn using the canvas and the image data is then captured.
     * @param uri - Uniform resource locator string referencing image slices that should be loaded (data URI supported).
     * @param slices - Number of slices (resulting in the 3D texture's depth) vertically aligned within the image.
     * @param crossOrigin - Enable cross origin data loading.
     * @param useHorizontalSlicing - Optional: Whether or not to use horizontal (rows) instead of vertical (columns) slice alignment.
     * @returns - Promise for handling image load status.
     */
    @Initializable.assert_initialized()
    load(uri: string, slices: GLsizei, crossOrigin: boolean = false, useHorizontalSlicing: boolean = false): Promise<void> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onerror = () => reject();

            image.onload = () => {
                /* Use an auxiliary canvas to extract slices by drawing and extracting each slice. */
                const auxiliaryCanvas = document.createElement('canvas');
                const auxiliaryContext = auxiliaryCanvas.getContext('2d');

                assert(auxiliaryContext !== undefined, `expected auxiliary 2D context for temporary slicing`);

                let width, height, depth, data;

                if (useHorizontalSlicing === false) {
                    // TODO: Reduce code duplication with horizontal slicing code (else branch) below
                    assert(image.height % slices === 0 && image.height / slices >= 1.0,
                        `expected height to be a multitude of number of slices`);

                    width = image.width;
                    height = Math.floor(image.height / slices);
                    depth = slices;

                    auxiliaryCanvas.width = width;
                    auxiliaryCanvas.height = height;

                    data = new Uint8Array(width * height * depth);
                    const subImageSize = width * height;

                    for (let slice = 0; slice < slices; ++slice) {
                        auxiliaryContext!.drawImage(image, 0, height * slice, width, height, 0, 0, width, height);
                        const subImageData = auxiliaryContext!.getImageData(0, 0, width, height).data;

                        for (let i = 0; i < subImageSize; ++i) {
                            data[subImageSize * slice + i] = subImageData[4 * i];
                        }
                    }
                } else {
                    assert(image.width % slices === 0 && image.width / slices >= 1.0,
                        `expected width to be a multitude of number of slices`);

                    width = Math.floor(image.width / slices);
                    height = image.height;
                    depth = slices;

                    auxiliaryCanvas.width = width;
                    auxiliaryCanvas.height = height;

                    data = new Uint8Array(width * height * depth);
                    const subImageSize = width * height;

                    for (let slice = 0; slice < slices; ++slice) {
                        auxiliaryContext!.drawImage(image, width * slice, 0, width, height, 0, 0, width, height);
                        const subImageData = auxiliaryContext!.getImageData(0, 0, width, height).data;

                        for (let i = 0; i < subImageSize; ++i) {
                            data[subImageSize * slice + i] = subImageData[4 * i];
                        }
                    }
                }

                this.resize(width, height, depth);
                this.data(data);

                resolve();
            };

            if (crossOrigin) {
                image.crossOrigin = 'anonymous';
            }
            image.src = uri;
        });
    }

    /**
     * Asynchronous load of multiple images, each containing a column/row of slices, via URL or data URI.
     * This can be used, e. g., for a dynamically sized array of 3D textures.
     * Note that all the images must have the exact same dimensions.
     * Each image is loaded and drawn into a large, multi-row/-column image. This image is then used as a base64 encoded
     * PNG for subsequent usage in the regular @see {load} function.
     * @param uris - Uniform resource locator strings referencing a set of equally-sized images that should be loaded (data URI supported).
     * @param slices - Number of slices (resulting in the 3D texture's depth) vertically aligned within each image.
     * @param crossOrigin - Enable cross origin data loading.
     * @param useHorizontalSlicing - Optional: Whether or not to use horizontal (rows) instead of vertical (columns) slice alignment.
     * @returns - Promise for handling image load status.
     */
    @Initializable.assert_initialized()
    loadFromSingleImages(uris: string[], slices: GLsizei, crossOrigin: boolean = false, useHorizontalSlicing: boolean = false): Promise<void> {
        return new Promise((resolve, reject) => {
            const auxiliaryCanvas = document.createElement('canvas');
            const auxiliaryContext = auxiliaryCanvas.getContext('2d');

            const drawingPromises = [];

            let mergedImageWidth: number;
            let mergedImageHeight: number;

            for (let imageIndex = 0; imageIndex < uris.length; imageIndex++) {
                const singleImage = new Image();
                singleImage.onerror = () => reject();

                const drawingPromise: Promise<void> = new Promise((resolve, reject) => {
                    try {
                        singleImage.onload = () => {
                            const singleImageWidth = singleImage.width;
                            const singleImageHeight = singleImage.height;

                            if (useHorizontalSlicing === false) {
                                if (mergedImageWidth === undefined) {
                                    mergedImageWidth = singleImageWidth * uris.length;
                                    auxiliaryCanvas.width = mergedImageWidth;
                                } else {
                                    assert(singleImageWidth * uris.length === mergedImageWidth, "The single images do not have the same width");
                                }
                                if (mergedImageHeight === undefined) {
                                    mergedImageHeight = singleImageHeight;
                                    auxiliaryCanvas.height = mergedImageHeight;
                                } else {
                                    assert(singleImageHeight === mergedImageHeight, "The single images do not have the same height");
                                }

                                auxiliaryContext!.drawImage(singleImage, singleImageWidth * imageIndex, 0);
                            } else {
                                if (mergedImageWidth === undefined) {
                                    mergedImageWidth = singleImageWidth;
                                    auxiliaryCanvas.width = mergedImageWidth;
                                } else {
                                    assert(singleImageWidth === mergedImageWidth, "The single images do not have the same width");
                                }
                                if (mergedImageHeight === undefined) {
                                    mergedImageHeight = singleImageHeight * uris.length;
                                    auxiliaryCanvas.height = mergedImageHeight;
                                } else {
                                    assert(singleImageHeight * uris.length === mergedImageHeight, "The single images do not have the same height");
                                }

                                auxiliaryContext!.drawImage(singleImage, 0, singleImageHeight * imageIndex);
                            }

                            resolve();
                        }
                    } catch (error) {
                        reject(error);
                    }
                });

                drawingPromises.push(drawingPromise);

                if (crossOrigin) {
                    singleImage.crossOrigin = 'anonymous';
                }
                singleImage.src = uris[imageIndex];
            }

            Promise.all(drawingPromises).then(() => {
                const mergedImageDataUri = auxiliaryCanvas.toDataURL('image/png', 1.0);
                return this.load(mergedImageDataUri, slices, crossOrigin, useHorizontalSlicing).then(() => {
                    resolve();
                });
            })
        });
    }

    /**
     * Pass image data to the texture object.
     * @param data - Texel data that will be copied into the objects data store.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    data(data: TexImage3DData, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;
        const gl2facade = this._context.gl2facade;

        if (bind) {
            this.bind();
        }

        gl2facade.texImage3D(gl.TEXTURE_3D, 0, this._internalFormat,
            this._width, this._height, this._depth, 0, this._format, this._type, data);

        if (unbind) {
            this.unbind();
        }
        this.reallocate();
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
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, mag);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, min);
        if (unbind) {
            this.unbind();
        }
    }

    /**
     * Sets the texture object's wrapping function for s and t coordinates.
     * @param wrap_s - Value for the TEXTURE_WRAP_S parameter, defaulted to CLAMP_TO_EDGE.
     * @param wrap_t - Value for the TEXTURE_WRAP_T parameter, defaulted to CLAMP_TO_EDGE.
     * @param wrap_r - Value for the TEXTURE_WRAP_R parameter, defaulted to CLAMP_TO_EDGE.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    wrap(wrap_s: GLenum, wrap_t: GLenum, wrap_r: GLenum, bind: boolean = true, unbind: boolean = true): void {
        const gl = this.context.gl;

        if (bind) {
            this.bind();
        }
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, wrap_s);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, wrap_t);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, wrap_r);
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

        this.data(undefined, bind, unbind);
    }

    /**
     * This should be used to implement efficient resize the texture.
     * @param width - Targeted/new width of the texture in px.
     * @param height - Targeted/new height of the texture in px.
     * @param depth - Targeted/new depth of the texture in px.
     * @param bind - Allows to skip binding the texture (e.g., when binding is handled outside).
     * @param unbind - Allows to skip unbinding the texture (e.g., when binding is handled outside).
     */
    @Initializable.assert_initialized()
    resize(width: GLsizei, height: GLsizei, depth: GLsizei, bind: boolean = true, unbind: boolean = true): void {
        if (width === this._width && height === this._height && depth === this._depth) {
            return;
        }
        this._width = width;
        this._height = height;
        this._depth = depth;

        this.data(undefined, bind, unbind);
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
        return this._internalFormat!;
    }

    /**
     * Cached format of the data provided to the texture object for efficient resize. This is set on initialization and
     * might change on data transfers.
     */
    get format(): GLenum {
        this.assertInitialized();
        return this._format!;
    }

    /**
     * Cached type of the data provided to the texture used for efficient resize. This is set on initialization and
     * might change on data transfers.
     */
    get type(): GLenum {
        this.assertInitialized();
        return this._type!;
    }

    /**
     * The width of the texture object in px.
     */
    get width(): GLsizei {
        this.assertInitialized();
        return this._width;
    }

    /**
     * The height of the texture object in px.
     */
    get height(): GLsizei {
        this.assertInitialized();
        return this._height;
    }

    /**
     * The depth of the texture object in px.
     */
    get depth(): GLsizei {
        this.assertInitialized();
        return this._depth;
    }

    /**
     * Convenience getter for the 3-tuple containing width and height.
     * @see {@link width}
     * @see {@link heigth}
     * @see {@link depth}
     */
    get size(): tuples.GLsizei3 {
        this.assertInitialized();
        return [this._width, this._height, this._depth];
    }

}
