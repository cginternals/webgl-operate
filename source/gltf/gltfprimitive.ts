
import { Geometry } from "../geometry";

export class GLTFPrimitive extends Geometry {

    protected _material: Material;
    protected _drawMode: GLenum;

    protected bindBuffers(indices: number[]): void {
        throw new Error("Method not implemented.");
    }

    protected unbindBuffers(indices: number[]): void {
        throw new Error("Method not implemented.");
    }

    draw(): void {
        throw new Error("Method not implemented.");
    }

    bufferData(data: ArrayBufferView, index: number): void {

    }

    get material(): Material {
        return this._material;
    }

    set material(material: Material) {
        this._material = material;
    }
}
