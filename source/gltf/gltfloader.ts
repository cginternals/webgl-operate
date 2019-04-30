
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
import { Material } from '../scene';
import { Buffer } from '../buffer';

export class GLTFLoader {

    protected _context: Context;
    protected _sceneName: string;
    protected _scenes: Array<SceneNode>;
    protected _resourceManager: ResourceManager;
    protected _pbrProgram: Program;
    protected _pbrDefaultMaterial: Material;

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
        for (const image of images) {
            const identifier = this._sceneName + '_image_' + imageId;
            const name = image.name === undefined ? image.uri : image.name;

            const data = await asset.imageData.get(imageId);
            imageId++;

            const texture = new Texture2D(this._context, name);
            texture.initialize(data.width, data.height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
            texture.data(data);

            // TODO: sampler and mipmap handling

            this._resourceManager.add(texture, [name, identifier]);
        }
    }

    protected async loadMaterials(asset: GltfAsset): Promise<void> {
        const materials = asset.gltf.materials;
        if (!materials) {
            return;
        }

        // Init default material
        this._pbrDefaultMaterial = new GLTFPbrMaterial('DefaultMaterial', this._pbrProgram);
        this._resourceManager.add(this._pbrDefaultMaterial, [this._pbrDefaultMaterial.name]);

        // Init materials specified by GLTF
        let materialId = 0;

        for (const materialInfo of materials) {
            const identifier = this._sceneName + '_material_' + materialId;
            const material = new GLTFPbrMaterial(materialInfo.name, this._pbrProgram);
            const pbrInfo = materialInfo.pbrMetallicRoughness;

            // TODO: full support of material properties
            if (!pbrInfo) {
                log(LogLevel.Warning, 'Model contains a material without PBR information');
                continue;
            }

            const baseColorTexture = pbrInfo!.baseColorTexture;
            if (baseColorTexture) {
                const index = baseColorTexture.index;
                const identifier = this._sceneName + '_image_' + index;
                const texture = this._resourceManager.get(identifier);

                if (texture) {
                    material.baseColorTexture = texture as Texture2D;
                } else {
                    log(LogLevel.Warning, `Base color texture could not be located for ${material}.`);
                }
            }

            this._resourceManager.add(material, [materialInfo.name, identifier]);
            materialId++;
        }
    }

    protected async loadBuffers(asset: GltfAsset): Promise<void> {
        const buffers = asset.gltf.buffers;

        if (!buffers) {
            return;
        }

        let bufferId = 0;
        for (const bufferInfo of buffers) {
            const identifier = this._sceneName + '_buffer_' + bufferId;
            const data = asset.bufferData.get(bufferId);

            /**
             * TODO: probably need to create one buffer per bufferview instead
             * since we need to know usage when calling gl.bufferData
             */

            // const buffer = new Buffer(this._context, identifier);
            // buffer.initialize()

            this._resourceManager.add(buffer, [identifier]);
            bufferId++;
        }
    }

    protected async loadMeshes(asset: GltfAsset): Promise<Array<GLTFMesh>> {
        const result = new Array<GLTFMesh>();
        const meshes = asset.gltf.meshes;

        if (!meshes) {
            return result;
        }

        let primitiveId = 0;
        for (const meshInfo of meshes) {
            const mesh = new GLTFMesh();
            for (const primitiveInfo of meshInfo.primitives) {
                const primitive = await this.loadPrimitive(asset, primitiveInfo, primitiveId);
                mesh.addPrimitive(primitive);
                primitiveId++;
            }
        }
        return result;
    }

    protected async loadPrimitive(asset: GltfAsset, primitiveInfo: MeshPrimitive, id: number): Promise<GLTFPrimitive> {
        let modeNumber = primitiveInfo.mode;
        const identifier = this._sceneName + '_primitive_' + id;

        // if no mode is specified the default is 4 (gl.TRIANGLES)
        if (!modeNumber) {
            modeNumber = 4;
        }

        const drawMode = this.modeToEnum(modeNumber);
        const bindings = new Array<VertexBinding>();

        let material = this._pbrDefaultMaterial;
        if (primitiveInfo.material) {
            const materialIdentifier = this._sceneName + '_material_' + primitiveInfo.material!
            const fetchedMaterial = this._resourceManager.get(materialIdentifier);

            if (fetchedMaterial) {
                material = fetchedMaterial as Material;
            } else {
                log(LogLevel.Warning, `Material ${materialIdentifier} could not be found.`);
            }
        }

        for (const semantic in primitiveInfo.attributes) {
            // init buffer/attribute binding for attribute
            let accessorIndex = primitiveInfo.attributes[semantic];
            //const accessor = accesors[accessorIndex];

            const binding = new VertexBinding();
            // binding.buffer = ...
            // binding.normalized = ...
            // binding.size
            // binding.offset
            // binding.stride
            // binding.type
            bindings.push(binding);
        }

        const primitive = new GLTFPrimitive(this._context, bindings, material, drawMode);
        this._resourceManager.add(primitive, [identifier]);
        return primitive;
    }

    protected async generateGraph(meshes: Array<GLTFMesh>): Promise<void> {

    }

    async loadAsset(uri: string): Promise<void> {
        const loader = new GltfLoader();
        const asset = await loader.load(uri);
        const gltf = asset.gltf;

        this._sceneName = 'scene';
        if (gltf.scenes && gltf.scenes[gltf.scene!].name) {
            this._sceneName = gltf.scenes[gltf.scene!].name;
        }

        console.log(gltf);

        this.loadTextures(asset)
            .then(() => this.loadMaterials(asset))
            .then(() => this.loadBuffers(asset))
            .then(() => this.loadMeshes(asset))
            .then((meshes) => this.generateGraph(meshes));

        // let data = await asset.accessorData(0); // fetches BoxTextured0.bin
        // let image = await asset.imageData.get(0); // fetches CesiumLogoFlat.png

        // const root = new SceneNode('root');
    }

    get scenes(): Array<SceneNode> {
        return this._scenes;
    }
}
