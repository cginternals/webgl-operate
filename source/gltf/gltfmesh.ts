
import { GLTFPrimitive } from './gltfprimitive';

export class GLTFMesh {

    protected _primitives: Array<GLTFPrimitive>;

    get primitives(): Array<GLTFPrimitive> {
        return this._primitives;
    }

    addPrimitive(primitive: GLTFPrimitive): void {
        this._primitives.push(primitive);
    }
}
