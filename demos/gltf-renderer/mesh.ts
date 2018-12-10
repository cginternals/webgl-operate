import { gltf as GLTF } from 'gltf-loader-ts';
import { Context } from 'webgl-operate';

import { Aabb3 } from './aabb3';
import { Asset } from './asset';
import { Primitive } from './primitive';

export class Mesh {
  public context: Context;
  public primitives: Primitive[];
  // TODO: weights
  public name: string;
  public bounds: Aabb3 = new Aabb3();
  public static async fromGltf(
    meshIndex: GLTF.GlTfId,
    asset: Asset,
  ): Promise<Mesh> {
    const gMesh = asset.gAsset.gltf.meshes![meshIndex];
    const mesh = new Mesh();
    mesh.context = asset.context;
    mesh.name = gMesh.name;
    mesh.primitives = await Promise.all(
      gMesh.primitives.map((gPrim, i) => {
        const identifier = `mesh_${gMesh.name || meshIndex}_prim_${i}`;
        return Primitive.fromGltf(gPrim, asset, identifier);
      }),
    );

    for (const primitive of mesh.primitives) {
      mesh.bounds.union(primitive.bounds);
    }

    return mesh;
  }

  public uninitialize(): void {
    for (const primitive of this.primitives) {
      primitive.uninitialize();
    }
  }
}
