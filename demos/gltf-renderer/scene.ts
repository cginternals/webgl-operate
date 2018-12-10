import { mat4 } from 'gl-matrix';
import { gltf as GLTF } from 'gltf-loader-ts';
import { Camera, Context } from 'webgl-operate';

import { Aabb3 } from './aabb3';
import { Asset } from './asset';
import { AlphaMode, Material } from './material';
import { Node } from './node';
import { PbrShader } from './pbrshader';
import { Primitive } from './primitive';

interface IRenderBatch {
  node: Node;
  primitive: Primitive;
}

export class Scene {
  public context: Context;
  public name: string;
  /** all nodes */
  public nodes: Node[] = [];
  public rootNodes: Node[];
  public batchesByMaterial: Map<Material, IRenderBatch[]> = new Map();
  /** First opaque materials, then (semi)transparent ones */
  public sortedMaterials: Material[];
  public bounds: Aabb3 = new Aabb3();
  public static async fromGltf(
    gScene: GLTF.Scene,
    asset: Asset,
  ): Promise<Scene> {
    const scene = new Scene();
    scene.context = asset.context;
    scene.name = gScene.name;
    scene.rootNodes = await Promise.all(
      gScene.nodes!.map((i) => {
        const gNode = asset.gAsset.gltf.nodes![i];
        return Node.fromGltf(gNode, asset);
      }),
    );

    // propagate transforms
    const rootTransform = mat4.create(); // identity
    for (const node of scene.rootNodes) {
      node.updateTransform(rootTransform);
      node.updateBounds();
      scene.bounds.union(node.bounds);
    }

    // gather all nodes
    for (const rootNode of scene.rootNodes) {
      scene.nodes.push(rootNode);
      const stack = [rootNode];
      while (stack.length > 0) {
        const node = stack.pop()!;
        scene.nodes.push(node);
        stack.push.apply(stack, node.children);
      }
    }

    // gather primitives by material for batched drawing
    for (const node of scene.nodes) {
      if (node.mesh === undefined) {
        continue;
      }
      for (const primitive of node.mesh.primitives) {
        const mat = primitive.material;
        const batches = scene.batchesByMaterial.get(mat) || [];
        if (batches.length === 0) {
          scene.batchesByMaterial.set(mat, batches);
        }
        batches.push({ node, primitive });
      }
    }

    const materials = Array.from(scene.batchesByMaterial.keys());
    const opaqueMaterials = materials.filter(
      (m) => m.alphaMode === AlphaMode.OPAQUE,
    );
    const transparentMaterials = materials.filter(
      (m) => m.alphaMode !== AlphaMode.OPAQUE,
    );
    scene.sortedMaterials = opaqueMaterials.concat(transparentMaterials);

    return scene;
  }

  public draw(camera: Camera, shader: PbrShader): void {
    const gl = this.context.gl;
    for (const material of this.sortedMaterials) {
      const batches = this.batchesByMaterial.get(material)!;
      material.bind(shader);
      for (const { primitive, node } of batches) {
        gl.uniformMatrix4fv(
          shader.uniforms.u_ModelMatrix,
          gl.FALSE,
          node.finalTransform,
        );
        gl.uniformMatrix3fv(
          shader.uniforms.u_NormalMatrix,
          gl.FALSE,
          node.normalMatrix,
        );
        primitive.draw(shader);
      }
      material.unbind(shader);
    }
  }

  public uninitialize(): void {
    for (const node of this.rootNodes) {
      node.uninitialize();
    }
  }
}
