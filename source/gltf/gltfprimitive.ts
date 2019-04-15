
import { Buffer } from '../buffer';
import { Context } from '../context';
import { Geometry } from '../geometry';
import { Material } from '../scene';

// tslint:disable:max-classes-per-file

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
    protected _bindings: Array<VertexBinding>;

    constructor(context: Context, bindings: Array<VertexBinding>, material: Material, drawMode: GLenum) {
        super(context);

        this._bindings = bindings;
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
