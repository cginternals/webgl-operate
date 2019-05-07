
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
import { Shader } from '../shader';

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
        const gl = this._context.gl;

        this._resourceManager = new ResourceManager(this._context);
        this._scenes = new Array<SceneNode>();

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'glsl_default.vert');
        vert.initialize(require('./shaders/glsl_default.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'glsl_default.frag');
        frag.initialize(require('./shaders/glsl_default.frag'));
        this._pbrProgram = new Program(this._context, 'GLTFPbrProgram');
        this._pbrProgram.initialize([vert, frag]);
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

    protected isPowerOfTwo(x: number): boolean {
        return (x & (x - 1)) === 0;
    }

    protected nextHighestPowerOfTwo(x: number): number {
        --x;
        for (let i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    }

    protected async loadTextures(asset: GltfAsset): Promise<void> {
        const gl = this._context.gl;

        const textures = asset.gltf.textures;
        const images = asset.gltf.images;
        const samplers = asset.gltf.samplers;

        if (!textures || !samplers || !images) {
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
            if (!this.isPowerOfTwo(data.width) || !this.isPowerOfTwo(data.height)) {
                // Scale up the texture to the next highest power of two dimensions.
                const canvas = document.createElement('canvas');
                canvas.width = this.nextHighestPowerOfTwo(data.width);
                canvas.height = this.nextHighestPowerOfTwo(data.height);

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

            if (textureInfo.sampler === undefined) {
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

                    texture.generateMipmap();
                }
            }

            this._resourceManager.add(texture, [name, identifier]);
            textureId++;
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
                const identifier = this._sceneName + '_texture_' + index;
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

    protected inferBufferUsage(asset: GltfAsset, bufferViewId: number): GLenum {
        const gl = this._context.gl;

        const meshes = asset.gltf.meshes;
        const accessors = asset.gltf.accessors;

        if (meshes === undefined || accessors === undefined) {
            log(LogLevel.Error, `Asset does not include any meshes or accessors`);
            return gl.ARRAY_BUFFER;
        }

        // Find out if any primitive uses this buffer view as an index buffer
        // If so, the buffer view can only be used as an index buffer as per specification
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

        if (!bufferViews) {
            return;
        }

        let bufferViewId = 0;
        for (const bufferViewInfo of bufferViews) {
            const identifier = this._sceneName + '_bufferView_' + bufferViewId;
            const data = await asset.bufferViewData(bufferViewId);

            let target = bufferViewInfo.target;
            if (!target) {
                target = this.inferBufferUsage(asset, bufferViewId);
            }

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
        if (primitiveInfo.material !== undefined) {
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
            const attributeIndex = this.nameToAttributeIndex(semantic);

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
            binding.attributeIndex = attributeIndex;
            binding.numVertices = accessorInfo.count;
            binding.normalized = accessorInfo.normalized || false;
            binding.size = GLTF_ELEMENTS_PER_TYPE[accessorInfo.type];
            binding.offset = accessorInfo.byteOffset || 0;
            binding.stride = bufferViewInfo.byteStride || 0;
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

        const primitive = new GLTFPrimitive(this._context, bindings, indexBinding, material, drawMode);
        primitive.initialize();
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
                log(LogLevel.Warning, ` Scene ${name} does not contain any nodes.`);
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
        if (gltf.scenes && gltf.scenes[gltf.scene!].name) {
            this._sceneName = gltf.scenes[gltf.scene!].name;
        }

        await this.loadTextures(asset)
            .then(() => this.loadMaterials(asset))
            .then(() => this.loadBuffers(asset))
            .then(() => this.loadMeshes(asset))
            .then((meshes) => this.generateGraph(asset, meshes));
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
        } else if (this._scenes && this._scenes.length > 0) {
            return this._scenes[0];
        } else {
            log(LogLevel.Warning, 'Default scene was requested, but none is available.');
            return new SceneNode('EmptyScene');
        }
    }
}
