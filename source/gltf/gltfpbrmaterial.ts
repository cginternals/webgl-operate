import { Material } from '../scene';
import { Texture2D } from '../texture2d';

export class GLTFPbrMaterial extends Material {

    protected _baseColorTexture: Texture2D;

    bind(): void {
        throw new Error('Not implemented.');
    }

    unbind(): void {
        throw new Error('Not implemented.');
    }

    set baseColorTexture(texture: Texture2D) {
        this._baseColorTexture = texture;
    }
}
