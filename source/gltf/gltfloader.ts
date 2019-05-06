
import { SceneNode } from '../scene/scenenode';

import { vec3, mat4, quat } from 'gl-matrix';
import { GltfLoader, GltfAsset, GLTF_ELEMENTS_PER_TYPE } from 'gltf-loader-ts';
import { GLTFMesh } from './gltfmesh';
import { assert, log, LogLevel } from '../auxiliaries';
import { GLTFPrimitive, VertexBinding, IndexBinding } from './gltfprimitive';
import { MeshPrimitive } from 'gltf-loader-ts/lib/gltf';
import { Context } from '../context';
import { Program } from '../program';
import { GLTFPbrMaterial } from './gltfpbrmaterial';
import { ResourceManager } from '../core';
import { Texture2D } from '../texture2d';
import { Material, TransformComponent, GeometryComponent } from '../scene';
import { Buffer } from '../buffer';

export class GLTFLoader {

    protected _context: Context;
    protected _sceneName: string;
    protected _defaultScene: SceneNode;
    protected _scenes: Array<SceneNode>;
    protected _resourceManager: ResourceManager;
    protected _pbrProgram: Program;
    protected _pbrDefaultMaterial: Material;

    constructor(context: Context) {
        this._context = context;
        this._resourceManager = new ResourceManager(this._context);
        this._scenes = new Array<SceneNode>();
    }

    protected modeToEnum(mode: number): GLenum {
        if (mode > 6) {
            log(LogLevel.Error, `Specified draw mode is ${mode} but is required to be between 0 and 6`);
        }

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

    protected targetToEnum(target: number): GLenum {
        const gl = this._context.gl;

        if (target === 34962) {
            return gl.ARRAY_BUFFER;
        }
        if (target === 34963) {
            return gl.ELEMENT_ARRAY_BUFFER;
        }

        log(LogLevel.Error,
            'BufferView target is neither ARRAY_BUFFER nor ELEMENT_ARRAY_BUFFER and therefore invalid.');
        return gl.ARRAY_BUFFER;
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
        const gl = this._context.gl;

        const bufferViews = asset.gltf.bufferViews;

        if (!bufferViews) {
            return;
        }

        let bufferViewId = 0;
        for (const bufferViewInfo of bufferViews) {
            const identifier = this._sceneName + '_bufferView_' + bufferViewId;
            const data = await asset.bufferViewData(bufferViewId);
            const targetNumber = bufferViewInfo.target;

            /**
             * TODO: handle cases where target is not specified by looking
             * at usages and inferring what the target should be
             */
            if (!targetNumber) {
                log(LogLevel.Warning,
                    'Encountered BufferView without explitict target specification. This is not yet supported.');
                bufferViewId++;
                continue;
            }

            const target = this.targetToEnum(targetNumber);
            const buffer = new Buffer(this._context, identifier);
            buffer.initialize(target);
            buffer.data(data, gl.STATIC_DRAW);

            this._resourceManager.add(buffer, [identifier]);
            bufferViewId++;
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

                if (primitive) {
                    mesh.addPrimitive(primitive);
                }

                primitiveId++;
            }

            result.push(mesh);
        }
        return result;
    }

    protected async loadPrimitive(asset: GltfAsset,
        primitiveInfo: MeshPrimitive, id: number): Promise<GLTFPrimitive | undefined> {
        const accessors = asset.gltf.accessors;

        if (!accessors) {
            log(LogLevel.Error, 'GLTF asset does not have any accessors for the primitive to load.');
            return;
        }

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
            const accessorIndex = primitiveInfo.attributes[semantic];
            const accessorInfo = accessors[accessorIndex];
            const bufferViewIndex = accessorInfo.bufferView;
            if (!bufferViewIndex) {
                log(LogLevel.Error, 'Accessor does not reference a BufferView.');
            }
            // TODO: handle undefined
            const bufferViewInfo = asset.gltf.bufferViews![bufferViewIndex!];
            const bufferViewIdentifier = this._sceneName + '_bufferView_' + bufferViewIndex;
            const buffer = this._resourceManager.get(bufferViewIdentifier) as Buffer;

            const binding = new VertexBinding();
            binding.buffer = buffer;
            binding.normalized = accessorInfo.normalized || false;
            binding.size = GLTF_ELEMENTS_PER_TYPE[accessorInfo.type];
            binding.offset = accessorInfo.byteOffset || 0;
            binding.stride = bufferViewInfo.byteStride || 0;
            binding.type = accessorInfo.componentType;
            bindings.push(binding);
        }

        let indexBinding: IndexBinding | undefined;
        if (primitiveInfo.indices) {
            const accessorInfo = accessors[primitiveInfo.indices];
            const bufferViewIndex = accessorInfo.bufferView;
            if (!bufferViewIndex) {
                log(LogLevel.Error, 'Accessor does not reference a BufferView.');
            }
            const bufferViewIdentifier = this._sceneName + '_bufferView_' + bufferViewIndex;
            const buffer = this._resourceManager.get(bufferViewIdentifier) as Buffer;

            indexBinding = new IndexBinding();
            indexBinding.buffer = buffer;
            indexBinding.numIndices = accessorInfo.count;
            indexBinding.offset = accessorInfo.byteOffset || 0;
            indexBinding.type = accessorInfo.componentType;
        }

        const primitive = new GLTFPrimitive(this._context, bindings, indexBinding, material, drawMode);
        this._resourceManager.add(primitive, [identifier]);
        return primitive;
    }

    protected async generateGraph(asset: GltfAsset, meshes: Array<GLTFMesh>): Promise<void> {
        const nodes = asset.gltf.nodes;
        const scenes = asset.gltf.scenes;

        if (!nodes || !scenes) {
            return;
        }

        const idToNode = new Map<number, SceneNode>();

        let nodeId = 0;
        for (const node of nodes) {
            const name = node.name || 'node_' + nodeId;
            const sceneNode = new SceneNode(name);
            idToNode.set(nodeId, sceneNode);

            if (node.matrix) {
                const matrix = mat4.fromValues.apply(undefined, node.matrix);
                const transformComponent = new TransformComponent(matrix);
                sceneNode.addComponent(transformComponent);
            } else if (node.translation || node.rotation || node.scale) {
                let rotation = quat.create();
                if (node.rotation) {
                    rotation = quat.fromValues.apply(undefined, node.rotation);
                }

                let translation = vec3.create();
                if (node.translation) {
                    translation = vec3.fromValues.apply(undefined, node.translation);
                }

                let scale = vec3.create();
                if (node.scale) {
                    scale = vec3.fromValues.apply(undefined, node.scale);
                }

                const matrix = mat4.fromRotationTranslationScale(
                    mat4.create(),
                    rotation,
                    translation,
                    scale,
                );

                const transformComponent = new TransformComponent(matrix);
                sceneNode.addComponent(transformComponent);
            }

            if (node.mesh !== undefined) {
                const mesh = meshes[node.mesh];
                for (const primitive of mesh.primitives) {
                    const geometryComponent = new GeometryComponent();
                    geometryComponent.material = primitive.material;
                    geometryComponent.geometry = primitive;
                    sceneNode.addComponent(geometryComponent);
                }
            }

            /**
             * TODO: skinning support
             */
            if (node.skin || node.weights) {
                log(LogLevel.Info, 'Imported GLTF assets uses skins, which are not supported yet.');
            }

            nodeId++;
        }

        nodeId = 0;
        for (const node of nodes) {
            const sceneNode = idToNode.get(nodeId);

            assert(sceneNode !== undefined, 'Scene node could not be found.');

            if (node.children) {
                for (const childId of node.children) {
                    const childNode = idToNode.get(childId);

                    if (!childNode) {
                        log(LogLevel.Error, 'Model references a node that does not exist.');
                    }

                    sceneNode!.addNode(childNode!);
                }
            }

            nodeId++;
        }

        const sceneId = 0;
        for (const scene of scenes) {
            const name = scene.name || 'scene_' + sceneId;
            const sceneNode = new SceneNode(name);

            if (scene.nodes) {
                for (const nodeId of scene.nodes) {
                    const node = idToNode.get(nodeId);

                    if (!node) {
                        log(LogLevel.Error, 'Scene references a node that does not exist.');
                    }

                    sceneNode.addNode(node!);
                }
            } else {
                log(LogLevel.Warning, ` Scene ${name} does not contain any nodes.`);
            }

            this._scenes.push(sceneNode);
        }

        const defaultSceneId = asset.gltf.scene;
        if (defaultSceneId !== undefined) {
            this._defaultScene = this._scenes[defaultSceneId];
        }
    }

    async loadAsset(uri: string): Promise<void> {
        const loader = new GltfLoader();
        const asset = await loader.load(uri);
        const gltf = asset.gltf;

        this._sceneName = 'scene';
        if (gltf.scenes && gltf.scenes[gltf.scene!].name) {
            this._sceneName = gltf.scenes[gltf.scene!].name;
        }

        this.loadTextures(asset)
            .then(() => this.loadMaterials(asset))
            .then(() => this.loadBuffers(asset))
            .then(() => this.loadMeshes(asset))
            .then((meshes) => this.generateGraph(asset, meshes));
    }

    get scenes(): Array<SceneNode> {
        return this._scenes;
    }

    get defaultScene(): SceneNode {
        if (this._defaultScene !== undefined) {
            return this._defaultScene;
        } else if (this._scenes && this._scenes.length > 0) {
            return this._scenes[0];
        } else {
            log(LogLevel.Warning, 'Default scene was requested, but none is available.');
            return new SceneNode('EmptyScene');
        }
    }
}
