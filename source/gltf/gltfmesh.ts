
import { GLTFPrimitive } from './gltfprimitive';

/**
 * This class represents a mesh as specifed by glTF.
 * It is primarily a container for primitives, which are represented by GLTFPrimitive.
 * See https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#meshes
 */
export class GLTFMesh {

    protected _name: string | undefined;
    protected _primitives: Array<GLTFPrimitive>;

    constructor(name: string | undefined) {
        this._name = name;
        this._primitives = new Array<GLTFPrimitive>();
    }

    get primitives(): Array<GLTFPrimitive> {
        return this._primitives;
    }

    addPrimitive(primitive: GLTFPrimitive): void {
        this._primitives.push(primitive);
    }
}
