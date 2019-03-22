
import { assert } from './auxiliaries';
import { Camera } from './camera';
import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { Renderbuffer } from './renderbuffer';
import { Texture2D } from './texture2d';

import { GLsizei2 } from './tuples';


export class ShadowMapping extends Initializable {
  protected _context: Context;

  protected _light: Camera;
  protected _size: GLsizei2;

  protected _shadowMapFBO: Framebuffer;
  protected _shadowMapTexture: Texture2D;
  protected _shadowMapRenderbuffer: Renderbuffer;

  protected _uLightViewMatrix: WebGLUniformLocation;
  protected _uLightProjectionMatrix: WebGLUniformLocation;
  protected _uLightFarPlane: WebGLUniformLocation;

  constructor(context: Context) {
    super();
    this._context = context;
  }

  get shadowMapTexture(): Texture2D {
    return this._shadowMapTexture;
  }

  @Initializable.assert_initialized()
  protected _resize(): void {
    this._size = this._light.viewport;
    this._shadowMapFBO.resize(this._size[0], this._size[1], true, true);
  }

  @Initializable.initialize()
  initialize(light: Camera): boolean {
    assert(light.width > 0 && light.height > 0, 'Width and Height of the lights viewport have to be > 0.');

    this._light = light;
    this._size = this._light.viewport;

    const gl = this._context.gl;
    const gl2facade = this._context.gl2facade;

    this._shadowMapTexture = new Texture2D(this._context);
    this._shadowMapTexture.initialize(this._size[0], this._size[1], gl.RG16F, gl.RG, gl.FLOAT);
    this._shadowMapTexture.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    this._shadowMapTexture.filter(gl.LINEAR, gl.LINEAR);

    this._shadowMapRenderbuffer = new Renderbuffer(this._context);
    this._shadowMapRenderbuffer.initialize(this._size[0], this._size[1], gl.DEPTH_COMPONENT16);

    this._shadowMapFBO = new Framebuffer(this._context);
    this._shadowMapFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._shadowMapTexture]
      , [gl.DEPTH_ATTACHMENT, this._shadowMapRenderbuffer]]);
    this._shadowMapFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
    this._shadowMapFBO.clearDepth(1.0);

    return true;
  }

  @Initializable.uninitialize()
  uninitialize(): void {

    this._shadowMapFBO.uninitialize();
    this._shadowMapRenderbuffer.uninitialize();
    this._shadowMapTexture.uninitialize();
  }

  @Initializable.assert_initialized()
  begin(): void {
    const gl = this._context.gl;

    gl.viewport(0, 0, this._size[0], this._size[1]);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);

    if (this._size !== this._light.viewport) {
      this._resize();
    }

    this._shadowMapFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
  }

  @Initializable.assert_initialized()
  end(): void {
    const gl = this._context.gl;

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    this._shadowMapFBO.unbind();
  }
}
