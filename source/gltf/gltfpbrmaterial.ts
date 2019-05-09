import { Material } from '../scene';
import { Texture2D } from '../texture2d';
import { Program } from '../program';

export class GLTFPbrMaterial extends Material {

    protected _emptyTexture: Texture2D;
    protected _baseColorTexture: Texture2D;

    constructor(name: string, program: Program) {
        super(name, program);

        const gl = this._program.context.gl;

        this._emptyTexture = new Texture2D(this._program.context, 'EmptyTexture');
        this._emptyTexture.initialize(1, 1, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    }

    bind(): void {
        const gl = this._program.context.gl;

        this._program.bind();

        gl.uniform1i(this._program.uniform('u_baseColor'), 0);
        gl.uniform1i(this._program.uniform('u_hasBaseColor'), this._baseColorTexture !== undefined);
        if (this._baseColorTexture !== undefined) {
            this._baseColorTexture.bind(gl.TEXTURE0);
        } else {
            this._emptyTexture.bind(gl.TEXTURE0);
        }
    }

    unbind(): void {
        this._program.unbind();
    }

    set baseColorTexture(texture: Texture2D) {
        this._baseColorTexture = texture;
    }
}
