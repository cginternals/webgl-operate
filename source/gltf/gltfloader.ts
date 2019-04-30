
import { SceneNode } from '../scene/scenenode';

import { GltfLoader, GltfAsset } from 'gltf-loader-ts';
import { GLTFMesh } from './gltfmesh';
import { assert, log, LogLevel } from '../auxiliaries';
import { GLTFPrimitive, VertexBinding } from './gltfprimitive';
import { MeshPrimitive } from 'gltf-loader-ts/lib/gltf';
import { Context } from '../context';
import { Program } from '../program';
import { GLTFPbrMaterial } from './gltfpbrmaterial';
import { ResourceManager } from '../core';
import { Texture2D } from '../texture2d';

export class GLTFLoader {

    protected _context: Context;
    protected _sceneName: string;
    protected _scenes: Array<SceneNode>;
    protected _resourceManager: ResourceManager;

    constructor(context: Context) {
        this._context = context;
        this._resourceManager = new ResourceManager(this._context);
    }

    protected modeToEnum(mode: number): GLenum {
        assert(mode <= 6, 'Mode can only take values between 0 and 6');

        const gl = this._context.gl;

        if (mode === 0) {
            return gl.POINTS;
        }
        if (mode === 1) {
            return gl.LINES;
        }
        if (mode === 2) {
            return gl.LINE_LOOP;
        }
        if (mode === 3) {
            return gl.LINE_STRIP;
        }
        if (mode === 4) {
            return gl.TRIANGLES;
        }
        if (mode === 5) {
            return gl.TRIANGLE_STRIP;
        }
        if (mode === 6) {
            return gl.TRIANGLE_FAN;
        }

        return gl.TRIANGLES;
    }

    protected nameToAttributeIndex(name: string): number {
        if (name === 'POSITION') {
            return 0;
        }
        if (name === 'NORMAL') {
            return 1;
        }
        if (name === 'TANGENT') {
            return 2;
        }
        if (name === 'TEXCOORD_0') {
            return 3;
        }
        if (name === 'TEXCOORD_1') {
            return 4;
        }
        if (name === 'JOINTS_0') {
            return 5;
        }
        if (name === 'WEIGHTS_0') {
            return 6;
        }

        log(LogLevel.Warning, `Unknown attribute name '${name}' encountered. \
            Possibly this model uses an unsupported extension.`);

        return -1;
    }

    protected async loadTextures(asset: GltfAsset): Promise<void> {
        const gl = this._context.gl;

        const images = asset.gltf.images;
        if (!images) {
            return;
        }

        let imageId = 0;
        for (const _ of images) {
            const name = this._sceneName + '_image_' + imageId;

            const data = await asset.imageData.get(imageId);
            imageId++;

            const texture = new Texture2D(this._context, name);
            texture.initialize(data.width, data.height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
            texture.data(data);

            // TODO: sampler and mipmap handling

            this._resourceManager.add(texture);
        }
    }

    async loadAsset(uri: string): Promise<void> {
        const loader = new GltfLoader();
        const asset = await loader.load(uri);
        const gltf = asset.gltf;

        this._sceneName = 'scene';
        if (gltf.scenes) {
            this._sceneName = gltf.scenes[gltf.scene!].name;

        }
        console.log(gltf);

        this.loadTextures(asset);
        // const meshes = this.loadMeshes(asset);

        // let data = await asset.accessorData(0); // fetches BoxTextured0.bin
        // let image = await asset.imageData.get(0); // fetches CesiumLogoFlat.png

        // const root = new SceneNode('root');
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
        let modeNumber = primitiveInfo.mode;

        // if no mode is specified the default is 4 (gl.TRIANGLES)
        if (!modeNumber) {
            modeNumber = 4;
        }

        const drawMode = this.modeToEnum(modeNumber);
        const bindings = new Array<VertexBinding>();

        const material = new GLTFPbrMaterial('Material', new Program(this._context));

        for (const semantic in primitiveInfo.attributes) {
            // init buffer/attribute binding for attribute
            let accessorIndex = primitiveInfo.attributes[semantic];
            //const accessor = accesors[accessorIndex];
            accessorIndex = 1 + accessorIndex;

            const binding = new VertexBinding();
            // binding.buffer = ...
            // binding.normalized = ...
            // binding.size
            // binding.offset
            // binding.stride
            // binding.type
            bindings.push(binding);
        }

        return new GLTFPrimitive(this._context, bindings, material, drawMode);
    }

    get scenes(): Array<SceneNode> {
        return this._scenes;
    }
}
