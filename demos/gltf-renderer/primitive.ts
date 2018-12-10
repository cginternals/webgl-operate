import {
  auxiliaries,
  Buffer,
  Context,
  Initializable,
  VertexArray,
} from 'webgl-operate';
const assert = auxiliaries.assert;

import { vec3 } from 'gl-matrix';
import { gltf as GLTF, GLTF_ELEMENTS_PER_TYPE } from 'gltf-loader-ts';
import { Aabb3 } from './aabb3';
import { Asset } from './asset';
import { Material } from './material';
import { PbrShader, ShaderFlags } from './pbrshader';

// tslint:disable:max-classes-per-file

/** Data needed for `gl.vertexAttribPointer` */
class VertexAttribute {
  public static fromGltf(
    accessor: GLTF.Accessor,
    byteStride: number | undefined,
    buffer: Buffer,
  ): VertexAttribute {
    return new VertexAttribute(
      buffer,
      GLTF_ELEMENTS_PER_TYPE[accessor.type],
      accessor.componentType,
      accessor.normalized || false,
      byteStride || 0,
      accessor.byteOffset || 0,
    );
  }

  constructor(
    public buffer: Buffer,
    private size: GLint,
    private type: GLenum,
    private normalized: boolean,
    private stride: GLsizei,
    private offset: GLintptr,
  ) {}

  public enable(index: GLuint): void {
    this.buffer.attribEnable(
      index,
      this.size,
      this.type,
      this.normalized,
      this.stride,
      this.offset,
      true,
      false,
    );
  }

  public disable(index: GLuint): void {
    this.buffer.attribDisable(index, false, true);
  }
}

export class Primitive extends Initializable {
  get context(): Context {
    return this.vertexArray.context;
  }
  private identifier: string;
  private vertexArray: VertexArray;
  /** Vertex attributes. Keys match the attribute semantic property names from glTF. */
  private attributes: { [semantic: string]: VertexAttribute } = {};
  private numVertices: number;

  private indexBuffer: Buffer;
  private numIndices: number;
  private indexType: GLenum;
  private indexByteOffset: number;

  /** POINTS / LINES / TRIANGLES etc. */
  private mode: GLenum;

  private shaderFlags: ShaderFlags;
  /** Currently active shader */
  private shader: PbrShader | undefined;

  private drawCall: () => void;

  public material: Material;
  public bounds: Aabb3;

  public static async fromGltf(
    gPrimitive: GLTF.MeshPrimitive,
    asset: Asset,
    identifier?: string,
  ): Promise<Primitive> {
    const prim = new Primitive(asset.context, identifier);
    prim.mode = gPrimitive.mode || 4; // TRIANGLES (= default in spec)

    const context = asset.context;
    const gl = prim.context.gl;
    const gAsset = asset.gAsset;
    const gltf = gAsset.gltf;
    assert(
      gPrimitive.attributes.POSITION !== undefined,
      'primitives must have the POSITION attribute',
    );
    if (gltf.bufferViews === undefined) {
      throw new Error('invalid gltf');
    }

    const buffersByView: { [bufferView: number]: Buffer } = {};
    for (const semantic in gPrimitive.attributes) {
      if (gPrimitive.attributes.hasOwnProperty(semantic)) {
        const accessorIndex = gPrimitive.attributes[semantic];
        const accessor = gltf.accessors![accessorIndex];
        prim.numVertices = accessor.count;
        const bufferViewIndex = accessor.bufferView;

        let buffer;
        let byteStride;
        if (bufferViewIndex !== undefined && bufferViewIndex in buffersByView) {
          buffer = buffersByView[bufferViewIndex];
          byteStride = gltf.bufferViews[bufferViewIndex].byteStride;
        } else {
          const bufferViewData = await gAsset.accessorData(accessorIndex);
          buffer = new Buffer(
            prim.context,
            `${prim.identifier}_VBO_${Object.keys(buffersByView).length}`,
          );
          buffer.initialize(gl.ARRAY_BUFFER);
          buffer.data(bufferViewData, gl.STATIC_DRAW);
          if (bufferViewIndex !== undefined) {
            buffersByView[bufferViewIndex] = buffer;
            byteStride = gltf.bufferViews[bufferViewIndex].byteStride;
          }
        }

        prim.attributes[semantic] = VertexAttribute.fromGltf(
          accessor,
          byteStride,
          buffer,
        );
        if (semantic === 'POSITION') {
          prim.bounds = new Aabb3(
            vec3.fromValues.apply(undefined, accessor.min!),
            vec3.fromValues.apply(undefined, accessor.max!),
          );
        }
      }
    }

    let shaderFlags: ShaderFlags = 0;
    if (gPrimitive.attributes.NORMAL !== undefined) {
      shaderFlags |= ShaderFlags.HAS_NORMALS;
    }
    if (gPrimitive.attributes.TANGENT !== undefined) {
      shaderFlags |= ShaderFlags.HAS_TANGENTS;
    }
    if (gPrimitive.attributes.TEXCOORD_0 !== undefined) {
      shaderFlags |= ShaderFlags.HAS_UV;
    }
    if (gPrimitive.attributes.COLOR_0 !== undefined) {
      shaderFlags |= ShaderFlags.HAS_COLORS;
    }

    if (gPrimitive.indices !== undefined) {
      const indexAccessor = gltf.accessors![gPrimitive.indices];
      const indexBufferData = await gAsset.accessorData(gPrimitive.indices);
      prim.indexBuffer = new Buffer(prim.context, `${prim.identifier}_EBO`);
      prim.numIndices = indexAccessor.count;
      prim.indexByteOffset = indexAccessor.byteOffset || 0;
      prim.indexType = indexAccessor.componentType;
      if (prim.indexType === gl.UNSIGNED_INT && context.isWebGL1) {
        if (context.supportsElementIndexUint) {
          // tslint:disable-next-line:no-unused-expression
          context.elementIndexUint; // activate extension
        } else {
          throw new Error(
            `Primitive ${
              prim.identifier
            } needs unsupported extension OES_element_index_uint`,
          );
        }
      }

      prim.indexBuffer.initialize(gl.ELEMENT_ARRAY_BUFFER);
      prim.indexBuffer.data(indexBufferData, gl.STATIC_DRAW);

      auxiliaries.assert(
        prim.indexBuffer !== undefined &&
          prim.indexBuffer.object instanceof WebGLBuffer,
        `expected valid WebGLBuffer`,
      );
    }

    if (gPrimitive.material === undefined) {
      // The default material, used when a mesh does not specify a material,
      // is defined to be a material with no properties specified.
      // All the default values of material apply.
      prim.material = new Material(context);
      prim.material.name = 'DefaultMaterial';
    } else {
      prim.material = await asset.getMaterial(gPrimitive.material);
    }
    prim.shaderFlags = shaderFlags | prim.material.shaderFlags;
    prim.initialize();
    return prim;
  }

  constructor(context: Context, identifier: string | undefined = 'Primitive') {
    super();

    this.identifier = identifier;
    this.vertexArray = new VertexArray(context, identifier + '_VAO');
  }

  protected bindBuffers(): void {
    for (const semantic in this.attributes) {
      if (this.attributes.hasOwnProperty(semantic)) {
        const location = this.shader!.attribLocations[semantic];
        if (location === undefined || location === -1) {
          continue;
        }
        this.attributes[semantic].enable(location);
      }
    }

    if (this.numIndices) {
      this.indexBuffer.bind();
    }
  }

  protected unbindBuffers(): void {
    for (const semantic in this.attributes) {
      if (this.attributes.hasOwnProperty(semantic)) {
        const location = this.shader!.attribLocations[semantic];
        if (location === undefined || location === -1) {
          continue;
        }
        this.attributes[semantic].disable(location);
      }
    }
    if (this.numIndices) {
      this.indexBuffer.unbind();
    }
  }

  public initialize(...args: any[]): boolean {
    const gl = this.context.gl;
    if (this.numIndices) {
      this.drawCall = () => {
        gl.drawElements(
          this.mode,
          this.numIndices,
          this.indexType,
          this.indexByteOffset,
        );
      };
    } else {
      this.drawCall = () => {
        gl.drawArrays(this.mode, 0, this.numVertices);
      };
    }

    this.vertexArray.initialize(
      () => this.bindBuffers(),
      () => this.unbindBuffers(),
    );
    return this.vertexArray.valid;
  }

  public uninitialize(): void {
    this.vertexArray.uninitialize();
    for (const semantic in this.attributes) {
      if (this.attributes.hasOwnProperty(semantic)) {
        const buffer = this.attributes[semantic].buffer;
        if (buffer.initialized) {
          buffer.uninitialize();
        }
      }
    }
    if (this.indexBuffer) {
      this.indexBuffer.uninitialize();
    }
  }

  public draw(shader: PbrShader): void {
    this.shader = shader;
    this.context.gl.uniform1i(shader.uniforms.u_PbrFlags, this.shaderFlags);
    this.vertexArray.bind();
    this.drawCall();
    this.vertexArray.unbind();
    this.shader = undefined;
  }
}
