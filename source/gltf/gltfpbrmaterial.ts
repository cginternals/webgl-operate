
import { Material } from '../scene';
import { Texture2D } from '../texture2d';

export class GLTFPbrMaterial extends Material {

    protected _baseColorTexture: Texture2D;

    set baseColorTexture(texture: Texture2D) {
        this._baseColorTexture = texture;
    }

    get baseColorTexture(): Texture2D {
        return this._baseColorTexture;
    }
}
