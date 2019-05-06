
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

export class GLTFPrimitive extends Geometry {

    protected _material: Material;
    protected _drawMode: GLenum;
    protected _indexBinding: IndexBinding | undefined;
    protected _bindings: Array<VertexBinding>;

    constructor(context: Context,
        bindings: Array<VertexBinding>,
        indexBinding: IndexBinding | undefined,
        material: Material, drawMode: GLenum,
        identifier?: string) {

        super(context, identifier);

        this._bindings = bindings;
        this._indexBinding = indexBinding;
        this._material = material;
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

    get material(): Material {
        return this._material;
    }

    set material(material: Material) {
        this._material = material;
    }
}
