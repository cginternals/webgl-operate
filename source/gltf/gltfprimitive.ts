
import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';
import { Material } from '../scene';

// tslint:disable:max-classes-per-file

export class IndexBinding {
    buffer: Buffer;
    type: GLenum;
    numIndices: number;
    offset: GLintptr;
}

export class VertexBinding {
    buffer: Buffer;
    attributeIndex: GLint;
    numVertices: GLint;
    size: GLint;
    type: GLenum;
    normalized: boolean;
    stride: GLsizei;
    offset: GLintptr;
}

/**
 * This class includes all information to render a primitive as specified by the glTF standard.
 * The logic for binding the necessary buffers and drawing the primitive are also included.
 * The material for the primitive as specified by glTF is stored, however it is not bound
 * automatically, i.e., material handling needs to be performed outside this class.
 * See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#geometry.
 */
export class GLTFPrimitive extends Geometry {

    protected _drawMode: GLenum;
    protected _indexBinding: IndexBinding | undefined;
    protected _bindings: Array<VertexBinding>;
    protected _material: Material;
    protected _geometryFlags: number;

    constructor(context: Context,
        bindings: Array<VertexBinding>,
        indexBinding: IndexBinding | undefined,
        drawMode: GLenum,
        material: Material,
        flags: number,
        identifier?: string) {

        super(context, identifier);

        this._bindings = bindings;
        this._indexBinding = indexBinding;
        this._material = material;
        this._geometryFlags = flags;
        this._drawMode = drawMode;
    }

    protected bindBuffers(): void {
        if (this._indexBinding) {
            this._indexBinding.buffer.bind();
        }

        for (const vertexBinding of this._bindings) {
            vertexBinding.buffer.attribEnable(
                vertexBinding.attributeIndex,
                vertexBinding.size,
                vertexBinding.type,
                vertexBinding.normalized,
                vertexBinding.stride,
                vertexBinding.offset,
                true, true);
        }
    }

    protected unbindBuffers(): void {
        if (this._indexBinding) {
            this._indexBinding.buffer.unbind();
        }

        for (const vertexBinding of this._bindings) {
            vertexBinding.buffer.attribDisable(vertexBinding.attributeIndex, true, true);
        }
    }

    draw(): void {
        const gl = this.context.gl;

        if (this._indexBinding) {
            gl.drawElements(
                this._drawMode,
                this._indexBinding.numIndices,
                this._indexBinding.type,
                this._indexBinding.offset);
        } else {
            gl.drawArrays(
                this._drawMode,
                0,
                this._bindings[0].numVertices);
        }
    }

    get drawMode(): GLenum {
        return this._drawMode;
    }

    get material(): Material {
        return this._material;
    }

    get flags(): number {
        return this._geometryFlags;
    }

    get indexBufferInformation(): IndexBinding | undefined {
        return this._indexBinding;
    }

    /**
     * Returns information about the attribute buffer used by this primitive for a specific attribute semantic.
     * If the attribute buffer is not present, undefined is returned.
     *
     * @param attribute - Name of the attribute semantic defined by glTF, e.g., "POSITION" or "TEXCOORD_0",
     * see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#meshes
     */
    getVertexBufferInformationFromAttribute(attribute: string): VertexBinding | undefined {
        const attributeIndex = GLTFHelper.nameToAttributeIndex(attribute);
        for (const bufferInformation of this._bindings) {
            if (bufferInformation.attributeIndex === attributeIndex) {
                return bufferInformation;
            }
        }

        return undefined;
    }
}
