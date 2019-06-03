
import { vec3, vec4 } from 'gl-matrix';

import { Context } from '../context';
import { Material } from '../scene';
import { Texture2D } from '../texture2d';

export enum GLTFShaderFlags {
    // vertex shader + fragment shader
    HAS_NORMALS = 1,
    HAS_TANGENTS = 1 << 1,
    HAS_UV = 1 << 2,
    HAS_COLORS = 1 << 3,

    // fragment shader only
    USE_IBL = 1 << 4,
    HAS_BASECOLORMAP = 1 << 5,
    HAS_NORMALMAP = 1 << 6,
    HAS_EMISSIVEMAP = 1 << 7,
    HAS_METALROUGHNESSMAP = 1 << 8,
    HAS_OCCLUSIONMAP = 1 << 9,
    USE_TEX_LOD = 1 << 10,
}

export class GLTFPbrMaterial extends Material {

    protected _baseColorTexture: Texture2D | undefined;
    protected _metallicRoughnessTexture: Texture2D | undefined;
    protected _normalTexture: Texture2D | undefined;
    protected _occlusionTexture: Texture2D | undefined;
    protected _emissiveTexture: Texture2D | undefined;

    protected _baseColorFactor: vec4;
    protected _metallicFactor: number;
    protected _emissiveFactor: vec3;
    protected _roughnessFactor: number;
    protected _isDoubleSided: boolean;

    public baseColorTexCoord: number;
    public metallicRoughnessTexCoord: number;
    public normalTexCoord: number;
    public occlusionTexCoord: number;
    public emissiveTexCoord: number;

    constructor(context: Context, name: string) {
        super(context, name);

        this.baseColorTexCoord = 0;
        this.metallicRoughnessTexCoord = 0;
        this.normalTexCoord = 0;
        this.occlusionTexCoord = 0;
        this.emissiveTexCoord = 0;

        this._baseColorFactor = vec4.fromValues(1, 1, 1, 1);
        this._metallicFactor = 1;
        this._roughnessFactor = 1;
        this._emissiveFactor = vec3.fromValues(0, 0, 0);
        this._isDoubleSided = false;
    }

    set baseColorTexture(texture: Texture2D | undefined) {
        this._baseColorTexture = texture;
    }

    get baseColorTexture(): Texture2D | undefined {
        return this._baseColorTexture;
    }

    set metallicRoughnessTexture(texture: Texture2D | undefined) {
        this._metallicRoughnessTexture = texture;
    }

    get metallicRoughnessTexture(): Texture2D | undefined {
        return this._metallicRoughnessTexture;
    }

    set normalTexture(texture: Texture2D | undefined) {
        this._normalTexture = texture;
    }

    get normalTexture(): Texture2D | undefined {
        return this._normalTexture;
    }

    set occlusionTexture(texture: Texture2D | undefined) {
        this._occlusionTexture = texture;
    }

    get occlusionTexture(): Texture2D | undefined {
        return this._occlusionTexture;
    }

    set emissiveTexture(texture: Texture2D | undefined) {
        this._emissiveTexture = texture;
    }

    get emissiveTexture(): Texture2D | undefined {
        return this._emissiveTexture;
    }

    set emissiveFactor(factor: vec3) {
        this._emissiveFactor = factor;
    }

    get emissiveFactor(): vec3 {
        return this._emissiveFactor;
    }

    set baseColorFactor(factor: vec4) {
        this._baseColorFactor = factor;
    }

    get baseColorFactor(): vec4 {
        return this._baseColorFactor;
    }

    set metallicFactor(factor: number) {
        this._metallicFactor = factor;
    }

    get metallicFactor(): number {
        return this._metallicFactor;
    }

    set roughnessFactor(factor: number) {
        this._roughnessFactor = factor;
    }

    get roughnessFactor(): number {
        return this._roughnessFactor;
    }

    set isDoubleSided(val: boolean) {
        this._isDoubleSided = val;
    }

    get isDoubleSided(): boolean {
        return this._isDoubleSided;
    }

    get flags(): number {
        let pbrFlags = 0;

        if (this.baseColorTexture !== undefined) {
            pbrFlags |= GLTFShaderFlags.HAS_BASECOLORMAP;
        }

        if (this.metallicRoughnessTexture !== undefined) {
            pbrFlags |= GLTFShaderFlags.HAS_METALROUGHNESSMAP;
        }

        if (this.normalTexture !== undefined) {
            pbrFlags |= GLTFShaderFlags.HAS_NORMALMAP;
        }

        if (this.occlusionTexture !== undefined) {
            pbrFlags |= GLTFShaderFlags.HAS_OCCLUSIONMAP;
        }

        if (this.emissiveTexture !== undefined) {
            pbrFlags |= GLTFShaderFlags.HAS_EMISSIVEMAP;
        }

        return pbrFlags;
    }
}
