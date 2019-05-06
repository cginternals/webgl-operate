import { Material } from '../scene';
import { Texture2D } from '../texture2d';

export class GLTFPbrMaterial extends Material {

    protected _baseColorTexture: Texture2D;

    bind(): void {
        const gl = this._program.context.gl;

        this._program.bind();

        if (this._baseColorTexture) {
            this._baseColorTexture.bind(gl.TEXTURE0);
            gl.uniform1i(this._program.uniform('u_baseColor'), 0);
        }
    }

    unbind(): void {
        this._program.unbind();
    }

    set baseColorTexture(texture: Texture2D) {
        this._baseColorTexture = texture;
    }
}
