
import { mat4, quat, vec3, vec4 } from 'gl-matrix';

import { GLTF_ELEMENTS_PER_TYPE, GltfAsset, GltfLoader } from 'gltf-loader-ts';
import { MeshPrimitive } from 'gltf-loader-ts/lib/gltf';

import { GLTFHelper } from './gltfhelper';
import { GLTFMesh } from './gltfmesh';
import { GLTFPbrMaterial, GLTFShaderFlags, GLTFAlphaMode } from './gltfpbrmaterial';
import { GLTFPrimitive, IndexBinding, VertexBinding } from './gltfprimitive';

import { assert, log, LogLevel } from '../auxiliaries';
import { Buffer } from '../buffer';
import { Context } from '../context';
import { ResourceManager } from '../core';
import { Program } from '../program';
import { GeometryComponent, Material, TransformComponent } from '../scene';
import { SceneNode } from '../scene/scenenode';
import { Shader } from '../shader';
import { Texture2D } from '../texture2d';

/**
 * This class can be used to load the glTF file format, which describes scenes and models.
 * It handles all buffer, texture and geometry creation as well as scene generation.
 * Per glTF scene, one SceneNode is generated which represents the hierarchy of the scene.
 * ```
 * const loader = new GLTFLoader(this._context);
 * await loader.loadAsset(GltfRenderer.assetURI);
 * const rootNode = loader.defaultScene;
 * ```
 */
export class GLTFLoader {

    protected _context: Context;
    protected _sceneName: string;
    protected _defaultScene: SceneNode | undefined;
    protected _scenes: Array<SceneNode>;
    protected _resourceManager: ResourceManager;
    protected _pbrProgram: Program;
    protected _pbrDefaultMaterial: Material;

    constructor(context: Context) {
        this._context = context;
        const gl = this._context.gl;

        this._resourceManager = new ResourceManager(this._context);
        this._scenes = new Array<SceneNode>();

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'gltf_default.vert');
        vert.initialize(require('./shaders/gltf_default.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'gltf_default.frag');
        frag.initialize(require('./shaders/gltf_default.frag'));
        this._pbrProgram = new Program(this._context, 'GLTFPbrProgram');
        this._pbrProgram.initialize([vert, frag]);
    }

    protected async loadTextures(asset: GltfAsset): Promise<void> {
        const gl = this._context.gl;

        const textures = asset.gltf.textures;
        const images = asset.gltf.images;
        const samplers = asset.gltf.samplers;

        if (!textures || !images) {
            return;
        }

        let textureId = 0;
        for (const textureInfo of textures) {
            if (textureInfo.source === undefined) {
                log(LogLevel.Warning,
                    `The GLTF model does not specify a texture source. Possibly it uses an unsupported extension.`);
                textureId++;
                continue;
            }

            const imageId = textureInfo.source!;
            const image = images[imageId];
            const identifier = this._sceneName + '_texture_' + textureId;
            const name = image.name === undefined ? image.uri : image.name;

            // TODO: make sure image is only loaded once if it is referenced by multiple textures
            let data: HTMLImageElement | HTMLCanvasElement = await asset.imageData.get(imageId);

            /**
             * If the texture is not power of two, resize it to avoid problems with REPEAT samplers.
             * See: https://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences#Non-Power_of_Two_Texture_Support
             */
            if (!GLTFHelper.isPowerOfTwo(data.width) || !GLTFHelper.isPowerOfTwo(data.height)) {
                // Scale up the texture to the next highest power of two dimensions.
                const canvas = document.createElement('canvas');
                canvas.width = GLTFHelper.nextHighestPowerOfTwo(data.width);
                canvas.height = GLTFHelper.nextHighestPowerOfTwo(data.height);

                const ctx = canvas.getContext('2d');

                if (ctx === undefined) {
                    log(LogLevel.Error, 'Failed to create context while trying to resize non power of two texture');
                }
                ctx!.drawImage(data, 0, 0, canvas.width, canvas.height);
                data = canvas;
            }

            const texture = new Texture2D(this._context, name);
            texture.initialize(data.width, data.height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
            texture.data(data);

            if (samplers === undefined || textureInfo.sampler === undefined) {
                texture.wrap(gl.REPEAT, gl.REPEAT);
                texture.filter(gl.LINEAR, gl.LINEAR);
            } else {
                const sampler = samplers[textureInfo.sampler];
                texture.wrap(sampler.wrapS || gl.REPEAT, sampler.wrapT || gl.REPEAT);
                texture.filter(sampler.magFilter || gl.LINEAR, sampler.minFilter || gl.LINEAR);

                if (sampler.minFilter === gl.NEAREST_MIPMAP_NEAREST ||
                    sampler.minFilter === gl.LINEAR_MIPMAP_NEAREST ||
                    sampler.minFilter === gl.NEAREST_MIPMAP_LINEAR ||
                    sampler.minFilter === gl.LINEAR_MIPMAP_LINEAR) {

                    texture.generateMipMap();
                }
            }

            this._resourceManager.add(texture, [name, identifier]);
            textureId++;
        }
    }

    protected getTexture(index: number): Texture2D | undefined {
        const identifier = this._sceneName + '_texture_' + index;
        const texture = this._resourceManager.get(identifier) as Texture2D;

        if (texture === undefined) {
            log(LogLevel.Warning, `Texture with index ${index} could not be located.`);
            return;
        }

        return texture;
    }

    protected async loadMaterials(asset: GltfAsset): Promise<void> {
        // Init default material
        this._pbrDefaultMaterial = new GLTFPbrMaterial(this._context, 'DefaultMaterial');
        this._resourceManager.add(this._pbrDefaultMaterial, [this._pbrDefaultMaterial.name]);

        const materials = asset.gltf.materials;
        if (!materials) {
            return;
        }

        // Init materials specified by GLTF
        let materialId = 0;

        for (const materialInfo of materials) {
            const identifier = this._sceneName + '_material_' + materialId;
            const material = new GLTFPbrMaterial(this._context, materialInfo.name);

            const normalTexture = materialInfo.normalTexture;
            if (normalTexture !== undefined) {
                material.normalTexture = this.getTexture(normalTexture.index);
                material.normalTexCoord = normalTexture.texCoord || 0;
                material.normalScale = normalTexture.scale || 1;
            }

            const occlusionTexture = materialInfo.occlusionTexture;
            if (occlusionTexture !== undefined) {
                material.occlusionTexture = this.getTexture(occlusionTexture.index);
                material.occlusionTexCoord = occlusionTexture.texCoord || 0;
            }

            const emissiveTexture = materialInfo.emissiveTexture;
            if (emissiveTexture !== undefined) {
                material.emissiveTexture = this.getTexture(emissiveTexture.index);
                material.emissiveTexCoord = emissiveTexture.texCoord || 0;
            }

            material.emissiveFactor = vec3.fromValues(0, 0, 0);
            if (materialInfo.emissiveFactor !== undefined) {
                material.emissiveFactor = vec3.fromValues.apply(undefined, materialInfo.emissiveFactor);
            }

            material.alphaMode = GLTFAlphaMode.OPAQUE;

            if (materialInfo.alphaMode === 'MASK') {
                material.alphaMode = GLTFAlphaMode.MASK;

                if (materialInfo.alphaCutoff === undefined) {
                    log(LogLevel.Warning,
                        `Material ${materialInfo.name} has alphaMode MASK but does not specify an alphaCutoff`);
                }
                material.alphaCutoff = materialInfo.alphaCutoff!;
            } else if (materialInfo.alphaMode === 'BLEND') {
                material.alphaMode = GLTFAlphaMode.BLEND;
            }

            material.isDoubleSided = materialInfo.doubleSided || false;

            const pbrInfo = materialInfo.pbrMetallicRoughness;

            // TODO: full support of material properties
            if (pbrInfo === undefined) {
                log(LogLevel.Warning, 'Model contains a material without PBR information');
            }

            const baseColorTexture = pbrInfo!.baseColorTexture;
            if (baseColorTexture !== undefined) {
                material.baseColorTexture = this.getTexture(baseColorTexture.index);
                material.baseColorTexCoord = baseColorTexture.texCoord || 0;
            }

            const metallicRoughnessTexture = pbrInfo!.metallicRoughnessTexture;
            if (metallicRoughnessTexture !== undefined) {
                material.metallicRoughnessTexture = this.getTexture(metallicRoughnessTexture.index);
                material.metallicRoughnessTexCoord = metallicRoughnessTexture.texCoord || 0;
            }

            material.baseColorFactor = vec4.fromValues(1, 1, 1, 1);
            if (pbrInfo!.baseColorFactor !== undefined) {
                material.baseColorFactor = vec4.fromValues.apply(undefined, pbrInfo!.baseColorFactor);
            }

            material.metallicFactor = 1.0;
            if (pbrInfo!.metallicFactor !== undefined) {
                material.metallicFactor = pbrInfo!.metallicFactor;
            }

            material.roughnessFactor = 1.0;
            if (pbrInfo!.roughnessFactor !== undefined) {
                material.roughnessFactor = pbrInfo!.roughnessFactor;
            }

            this._resourceManager.add(material, [materialInfo.name, identifier]);
            materialId++;
        }
    }

    protected inferBufferUsage(asset: GltfAsset, bufferViewId: number): GLenum {
        const gl = this._context.gl;

        const meshes = asset.gltf.meshes;
        const accessors = asset.gltf.accessors;

        if (meshes === undefined || accessors === undefined) {
            log(LogLevel.Error, `Asset does not include any meshes or accessors`);
            return gl.ARRAY_BUFFER;
        }

        /**
         * Find out if any primitive uses this buffer view as an index buffer.
         * If so, the buffer view can only be used as an index buffer as per specification
         */
        for (const meshInfo of meshes!) {
            for (const primitive of meshInfo.primitives) {
                const indexAccessorId = primitive.indices;

                if (indexAccessorId === undefined) {
                    continue;
                }

                const accessor = accessors![indexAccessorId];
                const indexBufferViewId = accessor.bufferView;

                if (indexBufferViewId === undefined) {
                    continue;
                } else if (indexBufferViewId === bufferViewId) {
                    return gl.ELEMENT_ARRAY_BUFFER;
                }
            }
        }

        return gl.ARRAY_BUFFER;
    }

    protected async loadBuffers(asset: GltfAsset): Promise<void> {
        const gl = this._context.gl;

        const bufferViews = asset.gltf.bufferViews;
        const accessors = asset.gltf.accessors;

        if (!bufferViews) {
            log(LogLevel.Warning, 'The asset does not include any buffer view information.');
            return;
        }

        if (!accessors) {
            log(LogLevel.Warning, 'The asset does not include any accessor information.');
            return;
        }

        /**
         * Create a buffer for each buffer view in the model.
         * If a target (index or array buffer) is specified use it, otherwise infer it from the usage within primitives.
         */
        let bufferViewId = 0;
        for (const bufferViewInfo of bufferViews) {
            const identifier = this._sceneName + '_bufferView_' + bufferViewId;
            const data = await asset.bufferViewData(bufferViewId);

            let target = bufferViewInfo.target;
            if (target === undefined) {
                target = this.inferBufferUsage(asset, bufferViewId);
            }

            const buffer = new Buffer(this._context, identifier);
            buffer.initialize(target);
            buffer.data(data, gl.STATIC_DRAW);

            this._resourceManager.add(buffer, [identifier]);
            bufferViewId++;
        }

        /**
         * Create buffers for sparse accessors
         * See: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#sparse-accessors
         */
        let accessorId = 0;
        for (const accessorInfo of accessors) {
            const bufferViewIndex = accessorInfo.bufferView;
            const sparseInfo = accessorInfo.sparse;

            if (bufferViewIndex === undefined || sparseInfo !== undefined) {
                const identifier = this._sceneName + '_accessor_' + accessorId;
                const buffer = new Buffer(this._context, identifier);
                const data = await asset.accessorData(accessorId);

                // TODO: find out if sparse accessor can be used for index buffers
                buffer.initialize(gl.ARRAY_BUFFER);
                buffer.data(data, gl.STATIC_DRAW);

                this._resourceManager.add(buffer, [identifier]);
            }
            accessorId++;
        }
    }

    protected async loadMeshes(asset: GltfAsset): Promise<Array<GLTFMesh>> {
        const result = new Array<GLTFMesh>();
        const meshes = asset.gltf.meshes;

        if (meshes === undefined) {
            log(LogLevel.Warning, 'The asset does not contain any mesh information');
            return result;
        }

        let primitiveId = 0;
        for (const meshInfo of meshes) {
            const mesh = new GLTFMesh();
            for (const primitiveInfo of meshInfo.primitives) {
                const primitive = await this.loadPrimitive(asset, primitiveInfo, primitiveId);

                if (primitive !== undefined) {
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

        const gl = this._context.gl;
        const accessors = asset.gltf.accessors;
        const bufferViews = asset.gltf.bufferViews;

        if (accessors === undefined) {
            log(LogLevel.Error, 'GLTF asset does not have any accessors.');
            return;
        }

        if (bufferViews === undefined) {
            log(LogLevel.Error, 'GLTF asset does not have any buffer views.');
            return;
        }

        let modeNumber = primitiveInfo.mode;
        const identifier = this._sceneName + '_primitive_' + id;

        // if no mode is specified the default is 4 (gl.TRIANGLES)
        if (!modeNumber) {
            modeNumber = 4;
        }

        const drawMode = GLTFHelper.modeToEnum(gl, modeNumber);
        const bindings = new Array<VertexBinding>();

        let material = this._pbrDefaultMaterial;
        if (primitiveInfo.material !== undefined) {
            const materialIdentifier = this._sceneName + '_material_' + primitiveInfo.material!;
            const fetchedMaterial = this._resourceManager.get(materialIdentifier);

            if (fetchedMaterial !== undefined) {
                material = fetchedMaterial as Material;
            } else {
                log(LogLevel.Warning, `Material ${materialIdentifier} could not be found.`);
            }
        }

        let geometryFlags = 0;

        for (const semantic in primitiveInfo.attributes) {
            // init buffer/attribute binding for attribute
            const attributeIndex = GLTFHelper.nameToAttributeIndex(semantic);

            if (semantic === 'NORMAL') {
                geometryFlags |= GLTFShaderFlags.HAS_NORMALS;
            }
            if (semantic === 'TANGENT') {
                geometryFlags |= GLTFShaderFlags.HAS_TANGENTS;
            }
            if (semantic === 'COLOR_0') {
                geometryFlags |= GLTFShaderFlags.HAS_COLORS;
            }
            if (semantic === 'TEXCOORD_0' || semantic === 'TEXCOORD_1' || semantic === 'TEXCOORD_2') {
                geometryFlags |= GLTFShaderFlags.HAS_UV;
            }

            const accessorIndex = primitiveInfo.attributes[semantic];
            const accessorInfo = accessors[accessorIndex];
            const bufferViewIndex = accessorInfo.bufferView;
            const sparseInfo = accessorInfo.sparse;
            let buffer: Buffer;
            let stride = 0;

            if (bufferViewIndex === undefined || sparseInfo !== undefined) {
                const accessorIdentifier = this._sceneName + '_accessor_' + accessorIndex;
                buffer = this._resourceManager.get(accessorIdentifier) as Buffer;
            } else {
                const bufferViewInfo = bufferViews[bufferViewIndex!];
                const bufferViewIdentifier = this._sceneName + '_bufferView_' + bufferViewIndex;
                buffer = this._resourceManager.get(bufferViewIdentifier) as Buffer;
                stride = bufferViewInfo.byteStride || 0;
            }

            const binding = new VertexBinding();
            binding.buffer = buffer!;
            binding.attributeIndex = attributeIndex;
            binding.numVertices = accessorInfo.count;
            binding.normalized = accessorInfo.normalized || false;
            binding.size = GLTF_ELEMENTS_PER_TYPE[accessorInfo.type];
            binding.offset = accessorInfo.byteOffset || 0;
            binding.stride = stride;
            binding.type = accessorInfo.componentType;
            bindings.push(binding);
        }

        let indexBinding: IndexBinding | undefined;
        if (primitiveInfo.indices !== undefined) {
            const accessorInfo = accessors[primitiveInfo.indices];
            const bufferViewIndex = accessorInfo.bufferView;
            if (!bufferViewIndex === undefined) {
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

        const primitive = new GLTFPrimitive(this._context, bindings, indexBinding, drawMode, material, geometryFlags);
        primitive.initialize();
        this._resourceManager.add(primitive, [identifier]);
        return primitive;
    }

    protected async generateScenes(asset: GltfAsset, meshes: Array<GLTFMesh>): Promise<void> {
        const nodes = asset.gltf.nodes;
        const scenes = asset.gltf.scenes;

        if (!nodes || !scenes) {
            log(LogLevel.Warning, 'The asset does not contain any nodes or scene information.');
            return;
        }

        const idToNode = new Map<number, SceneNode>();

        /**
         * First pass over all nodes to initialize them and save the index to node mapping.
         */
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

                let scale = vec3.fromValues(1, 1, 1);
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

        /**
         * Second pass over all nodes to create the hierarchy.
         */
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

        /**
         * Create a scene node per scene specified by gltf.
         * Gltf scenes can specify multiple root nodes.
         * Therefore, the top level scene nodes are wrappers to contain all root nodes of a scene.
         */
        let sceneId = 0;
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
                log(LogLevel.Warning, `Scene ${name} does not contain any nodes.`);
            }

            this._scenes.push(sceneNode);
            sceneId++;
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
        if (gltf.scenes && gltf.scene && gltf.scenes[gltf.scene!].name) {
            this._sceneName = gltf.scenes[gltf.scene!].name;
        }

        await this.loadTextures(asset)
            .then(() => this.loadMaterials(asset))
            .then(() => this.loadBuffers(asset))
            .then(() => this.loadMeshes(asset))
            .then((meshes) => this.generateScenes(asset, meshes));
    }

    uninitialize(): void {
        this._scenes = [];
        this._defaultScene = undefined;
        this._resourceManager.uninitialize();
    }

    get pbrProgram(): Program {
        return this._pbrProgram;
    }

    get scenes(): Array<SceneNode> {
        return this._scenes;
    }

    get defaultScene(): SceneNode {
        if (this._defaultScene !== undefined) {
            return this._defaultScene;
        } else if (this._scenes !== undefined && this._scenes.length > 0) {
            return this._scenes[0];
        } else {
            log(LogLevel.Warning, 'Default scene was requested, but none is available.');
            return new SceneNode('EmptyScene');
        }
    }
}
