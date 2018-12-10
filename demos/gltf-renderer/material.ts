import { vec3, vec4 } from 'gl-matrix';
import { gltf as GLTF } from 'gltf-loader-ts';
import { Context, Texture2D } from 'webgl-operate';
import { Asset } from './asset';
import { PbrShader, ShaderFlags } from './pbrshader';

export enum AlphaMode {
  OPAQUE,
  MASK,
  BLEND,
}

export class Material {
  get shaderFlags(): ShaderFlags {
    let flags = 0;
    if (this.baseColorTexture) {
      flags |= ShaderFlags.HAS_BASECOLORMAP;
    }
    if (this.normalTexture) {
      flags |= ShaderFlags.HAS_NORMALMAP;
    }
    if (this.emissiveTexture) {
      flags |= ShaderFlags.HAS_EMISSIVEMAP;
    }
    if (this.metallicRoughnessTexture) {
      flags |= ShaderFlags.HAS_METALROUGHNESSMAP;
    }
    if (this.occlusionTexture) {
      flags |= ShaderFlags.HAS_OCCLUSIONMAP;
    }

    return flags;
  }
  public context: Context;
  /** Material name (if none: GLTF index) */
  public name: string;

  // NOTE: all defaults are from the spec

  // pbr_metallic_roughness properties
  public baseColorFactor: vec4 = vec4.fromValues(1, 1, 1, 1);
  public baseColorTexture: Texture2D;
  public baseColorTexCoord: number;
  public metallicFactor = 1;
  public roughnessFactor = 1;
  public metallicRoughnessTexture: Texture2D;
  public metallicRoughnessTexCoord: number;

  public normalTexture: Texture2D;
  public normalTexCoord: number;
  public normalScale: number;

  public occlusionTexture: Texture2D;
  public occlusionTexCoord: number;
  public occlusionStrength: number;
  public emissiveFactor: vec3 = vec3.fromValues(0, 0, 0);
  public emissiveTexture: Texture2D;
  public emissiveTexCoord: number;

  public alphaCutoff = 0.5;
  public alphaMode: AlphaMode = AlphaMode.OPAQUE;

  public doubleSided = false;

  // This texture is bound to unused units used to avoid annoying warnings in Chrome
  // (e.g. `WARNING: there is no texture bound to the unit 0`)
  public emptyTexture: Texture2D;

  public static async fromGltf(
    materialIndex: GLTF.GlTfId,
    asset: Asset,
  ): Promise<Material> {
    const gMaterial = asset.gAsset.gltf.materials![materialIndex];
    const mat = new Material(asset.context);
    mat.name = gMaterial.name || materialIndex.toString();
    const pbr = gMaterial.pbrMetallicRoughness;
    const texPromises: { [key: string]: Promise<Texture2D> | undefined } = {
      baseColorTexture: undefined,
      metallicRoghnessTexture: undefined,
      normalTexture: undefined,
      occlusionTexture: undefined,
      emissiveTexture: undefined,
    };
    if (pbr) {
      if (pbr.baseColorFactor) {
        mat.baseColorFactor = vec4.fromValues.apply(
          undefined,
          pbr.baseColorFactor,
        );
      }
      if (pbr.baseColorTexture) {
        texPromises.baseColorTexture = this.loadTexture(
          pbr.baseColorTexture,
          asset,
          `mat_${mat.name}_baseColorTexture`,
        );
        mat.baseColorTexCoord = pbr.baseColorTexture.texCoord || 0;
      }
      if (pbr.metallicFactor !== undefined) {
        mat.metallicFactor = pbr.metallicFactor;
      }
      if (pbr.roughnessFactor !== undefined) {
        mat.roughnessFactor = pbr.roughnessFactor;
      }
      if (pbr.metallicRoughnessTexture) {
        texPromises.metallicRoughnessTexture = this.loadTexture(
          pbr.metallicRoughnessTexture,
          asset,
          `mat_${mat.name}_metallicRoughnessTexture`,
        );
        mat.metallicRoughnessTexCoord =
          pbr.metallicRoughnessTexture.texCoord || 0;
      }
    }

    const normalTexInfo = gMaterial.normalTexture;
    if (normalTexInfo) {
      texPromises.normalTexture = this.loadTexture(
        normalTexInfo,
        asset,
        `mat_${mat.name}_normalTexture`,
      );
      mat.normalTexCoord = normalTexInfo.texCoord || 0;
      mat.normalScale = normalTexInfo.scale || 1;
    }

    const occTexInfo = gMaterial.occlusionTexture;
    if (occTexInfo) {
      texPromises.occlusionTexture = this.loadTexture(
        occTexInfo,
        asset,
        `mat_${mat.name}_occlusionTexture`,
      );
      mat.occlusionTexCoord = occTexInfo.texCoord || 0;
      mat.occlusionStrength = occTexInfo.strength || 1;
    }

    if (gMaterial.emissiveTexture) {
      texPromises.emissiveTexture = this.loadTexture(
        gMaterial.emissiveTexture,
        asset,
        `mat_${mat.name}_emissiveTexture`,
      );
      mat.emissiveTexCoord = gMaterial.emissiveTexture.texCoord || 0;
    }
    if (gMaterial.emissiveFactor) {
      mat.emissiveFactor = vec3.fromValues.apply(
        undefined,
        gMaterial.emissiveFactor,
      );
    }

    if (gMaterial.alphaCutoff !== undefined) {
      mat.alphaCutoff = gMaterial.alphaCutoff;
    }
    if (gMaterial.alphaMode) {
      mat.alphaMode = (AlphaMode as any)[gMaterial.alphaMode];
    }

    if (gMaterial.doubleSided !== undefined) {
      mat.doubleSided = gMaterial.doubleSided;
    }

    await Promise.all((Object as any).values(texPromises));
    for (const key in texPromises) {
      if (texPromises.hasOwnProperty(key)) {
        (mat as any)[key] = await texPromises[key]; // actually synchronous due to Promise.all above
      }
    }

    return mat;
  }

  public static async loadTexture(
    texInfo: GLTF.TextureInfo | GLTF.MaterialNormalTextureInfo,
    asset: Asset,
    identifier: string,
  ): Promise<Texture2D> {
    const gl = asset.context.gl;
    const gltf = asset.gAsset.gltf;

    if (asset.textures[texInfo.index]) {
      return asset.textures[texInfo.index];
    }

    const texture = gltf.textures![texInfo.index];

    // NOTE: spec allows texture.source to be undefined, unclear why
    const image = await asset.gAsset.imageData.get(texture.source!);
    // spec: when undefined, a sampler with repeat wrapping and auto filtering should be used.
    const sampler: GLTF.Sampler =
      texture.sampler !== undefined ? gltf.samplers![texture.sampler] : {};

    const tex2 = new Texture2D(asset.context, identifier);
    tex2.initialize(
      image.width,
      image.height,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
    );
    tex2.wrap(
      sampler.wrapS || gl.REPEAT,
      sampler.wrapT || gl.REPEAT,
      true,
      false,
    );

    // **Default Filtering Implementation Note:** When filtering options are defined,
    // runtime must use them. Otherwise, it is free to adapt filtering to performance or quality goals.
    const mag = sampler.magFilter || gl.LINEAR;
    const min = sampler.minFilter || gl.LINEAR_MIPMAP_LINEAR;
    tex2.filter(mag, min, false, false);

    tex2.data(image, false, false);

    // **Mipmapping Implementation Note**: When a sampler's minification filter (`minFilter`)
    // uses mipmapping (`NEAREST_MIPMAP_NEAREST`, `NEAREST_MIPMAP_LINEAR`, `LINEAR_MIPMAP_NEAREST`,
    // or `LINEAR_MIPMAP_LINEAR`), any texture referencing the sampler needs to have mipmaps,
    // e.g., by calling GL's `generateMipmap()` function.
    const mipMaps =
      min === gl.LINEAR_MIPMAP_LINEAR ||
      min === gl.LINEAR_MIPMAP_NEAREST ||
      min === gl.NEAREST_MIPMAP_LINEAR ||
      min === gl.NEAREST_MIPMAP_NEAREST;
    if (mipMaps) {
      // TODO!!: fails on WebGL1 for NPOT textures
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    // TODO!!: NPOT handling (hint: three.js resizes by rendering the into a 2D canvas...)
    // **Non-Power-Of-Two Texture Implementation Note**: glTF does not guarantee that a texture's
    // dimensions are a power-of-two.  At runtime, if a texture's width or height is not a
    // power-of-two, the texture needs to be resized so its dimensions are powers-of-two if the
    // `sampler` the texture references
    // * Has a wrapping mode (either `wrapS` or `wrapT`) equal to `REPEAT` or `MIRRORED_REPEAT`, or
    // * Has a minification filter (`minFilter`) that uses mipmapping (`NEAREST_MIPMAP_NEAREST`, \\
    //   `NEAREST_MIPMAP_LINEAR`, `LINEAR_MIPMAP_NEAREST`, or `LINEAR_MIPMAP_LINEAR`).

    tex2.unbind();

    asset.textures[texInfo.index] = tex2;

    return tex2;
  }

  constructor(context: Context) {
    this.context = context;
    const gl = this.context.gl;

    this.emptyTexture = new Texture2D(this.context, 'emptyTexture');
    this.emptyTexture.initialize(1, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
  }

  public bind(shader: PbrShader): void {
    const gl = this.context.gl;
    const uniforms = shader.uniforms;

    if (this.doubleSided) {
      gl.disable(gl.CULL_FACE);
    } else {
      gl.enable(gl.CULL_FACE);
    }

    if (this.alphaMode !== AlphaMode.OPAQUE) {
      // BLEND + MASK
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(uniforms.u_AlphaBlend, 1.0);

      if (this.alphaMode === AlphaMode.MASK) {
        gl.uniform1f(uniforms.u_AlphaCutoff, this.alphaCutoff);
      }
    }

    // NOTE: for sampler numbers, see also PbrShader constructor
    gl.uniform4fv(uniforms.u_BaseColorFactor!, this.baseColorFactor);
    if (this.baseColorTexture) {
      this.baseColorTexture.bind(gl.TEXTURE0);
      gl.uniform1i(uniforms.u_BaseColorTexCoord, this.baseColorTexCoord);
    } else {
      this.emptyTexture.bind(gl.TEXTURE0);
    }
    if (this.normalTexture) {
      this.normalTexture.bind(gl.TEXTURE1);
      gl.uniform1i(uniforms.u_NormalTexCoord, this.normalTexCoord);
      gl.uniform1f(uniforms.u_NormalScale, this.normalScale);
    } else {
      this.emptyTexture.bind(gl.TEXTURE1);
    }
    if (this.emissiveTexture) {
      this.emissiveTexture.bind(gl.TEXTURE2);
      gl.uniform1i(uniforms.u_EmissiveTexCoord, this.emissiveTexCoord);
      gl.uniform3fv(uniforms.u_EmissiveFactor!, this.emissiveFactor);
    } else {
      this.emptyTexture.bind(gl.TEXTURE2);
    }
    if (this.metallicRoughnessTexture) {
      this.metallicRoughnessTexture.bind(gl.TEXTURE3);
      gl.uniform1i(
        uniforms.u_MetallicRoughnessTexCoord,
        this.metallicRoughnessTexCoord,
      );
    } else {
      this.emptyTexture.bind(gl.TEXTURE3);
    }
    gl.uniform2f(
      uniforms.u_MetallicRoughnessValues,
      this.metallicFactor,
      this.roughnessFactor,
    );
    if (this.occlusionTexture) {
      this.occlusionTexture.bind(gl.TEXTURE4);
      gl.uniform1i(uniforms.u_OcclusionTexCoord, this.occlusionTexCoord);
      gl.uniform1f(uniforms.u_OcclusionStrength, this.occlusionStrength);
    } else {
      this.emptyTexture.bind(gl.TEXTURE4);
    }
  }

  public unbind(shader: PbrShader): void {
    const gl = this.context.gl;
    if (this.alphaMode !== AlphaMode.OPAQUE) {
      gl.disable(gl.BLEND);
      gl.uniform1f(shader.uniforms.u_AlphaBlend, 0.0);
      if (this.alphaMode === AlphaMode.MASK) {
        gl.uniform1f(shader.uniforms.u_AlphaCutoff, 0);
      }
    }
    gl.disable(gl.CULL_FACE);
  }
}
