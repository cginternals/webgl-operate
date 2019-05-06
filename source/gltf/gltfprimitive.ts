
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
    size: GLint;
    type: GLenum;
    normalized: boolean;
    stride: GLsizei;
    offset: GLintptr;
};

export class GLTFPrimitive extends Geometry {

    protected _material: Material;
    protected _drawMode: GLenum;
    protected _indexBinding: IndexBinding | undefined;
    protected _bindings: Array<VertexBinding>;

    constructor(context: Context,
        bindings: Array<VertexBinding>,
        indexBinding: IndexBinding | undefined,
        material: Material, drawMode: GLenum) {

        super(context);

        this._bindings = bindings;
        this._indexBinding = indexBinding;
        this._material = material;
        this._drawMode = drawMode;
    }

    protected bindBuffers(indices: number[]): void {
        throw new Error("Method not implemented.");
    }

    protected unbindBuffers(indices: number[]): void {
        throw new Error("Method not implemented.");
    }

    draw(): void {
        throw new Error("Method not implemented.");
    }

    get material(): Material {
        return this._material;
    }

    set material(material: Material) {
        this._material = material;
    }
}
