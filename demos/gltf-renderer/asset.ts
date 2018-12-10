import { Context, Texture2D } from 'webgl-operate';

import { GltfAsset } from 'gltf-loader-ts';
import { GlTfId } from 'gltf-loader-ts/lib/gltf';
import { Material } from './material';
import { Mesh } from './mesh';
import { Scene } from './scene';

/** Base class holding references to shared entities */
export class Asset {
  public gAsset: GltfAsset;
  public context: Context;

  public scenes: Scene[] = [];
  public meshes: Mesh[] = [];
  public materials: Material[] = [];
  public textures: Texture2D[] = [];

  constructor(gAsset: GltfAsset, context: Context) {
    this.gAsset = gAsset;
    this.context = context;
  }

  /**
   * Get the scene with the given index or the default scene if none given.
   * If there is no default scene, load the first one.
   */
  public async getScene(index?: GlTfId): Promise<Scene> {
    index = index !== undefined ? index : this.gAsset.gltf.scene || 0;
    if (this.scenes[index]) {
      return this.scenes[index];
    }
    const gScene = this.gAsset.gltf.scenes![index];
    this.scenes[index] = await Scene.fromGltf(gScene, this);
    return this.scenes[index];
  }

  /** Get mesh - either from cache or parse from Gltf */
  public async getMesh(index: GlTfId): Promise<Mesh> {
    if (this.meshes[index]) {
      return this.meshes[index];
    }
    this.meshes[index] = await Mesh.fromGltf(index, this);
    return this.meshes[index];
  }

  /** Get material - either from cache or parse from Gltf */
  public async getMaterial(index: GlTfId): Promise<Material> {
    if (this.materials[index]) {
      return this.materials[index];
    }
    this.materials[index] = await Material.fromGltf(index, this);
    return this.materials[index];
  }
}
