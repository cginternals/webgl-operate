
import { SceneNode } from '../scene/scenenode';

import { GltfLoader, GltfAsset } from 'gltf-loader-ts';
import { GLTFMesh } from './gltfmesh';
import { assert } from '../auxiliaries';
import { GLTFPrimitive } from './gltfprimitive';
import { MeshPrimitive } from 'gltf-loader-ts/lib/gltf';

export class GLTFLoader {

    protected _scenes: Array<SceneNode>;

    constructor() { }

    async loadAsset(uri: string): Promise<boolean> {
        const loader = new GltfLoader();
        // const uri = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF/BoxTextured.gltf';
        const asset = await loader.load(uri);
        const gltf = asset.gltf;
        console.log(gltf);

        const meshes = this.loadMeshes(asset);

        // let data = await asset.accessorData(0); // fetches BoxTextured0.bin
        // let image = await asset.imageData.get(0); // fetches CesiumLogoFlat.png

        const root = new SceneNode('root');
        return true;
    }

    loadMeshes(asset: GltfAsset): Array<GLTFMesh> {
        const result = new Array<GLTFMesh>();
        const meshes = asset.gltf.meshes;

        if (!meshes) {
            return result;
        }

        for (const meshInfo of meshes) {
            const mesh = new GLTFMesh();
            for (const primitiveInfo of meshInfo.primitives) {
                const primitive = this.loadPrimitive(primitiveInfo);
                mesh.addPrimitive(primitive);
            }
        }

        return result;
    }

    loadPrimitive(primitiveInfo: MeshPrimitive): GLTFPrimitive {
        const primitive = new GLTFPrimitive(this._context);

        // primitive.material = ...
        for (const semantic in primitiveInfo.attributes) {
            // init buffer/attribute binding for attribute
            const accessorIndex = primitiveInfo.attributes[semantic];
        }

        return primitive;
    }

    get scenes(): Array<SceneNode> {
        return this._scenes;
    }
}
