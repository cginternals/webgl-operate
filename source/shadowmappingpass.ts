import { vec2 } from 'gl-matrix';

import { assert } from './auxiliaries';
import { Camera } from './camera';
import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { Initializable } from './initializable';
import { Program } from './program';
import { Renderbuffer } from './renderbuffer';
import { Shader } from './shader';
import { Texture2D } from './texture2d';


export class ShadowMappingPass extends Initializable {
  protected _context: Context;

  protected _light: Camera;
  protected _size: vec2;

  protected _shadowMapFBO: Framebuffer;
  protected _shadowMapTexture: Texture2D;
  protected _shadowMapRenderbuffer: Renderbuffer;
  protected _program: Program;

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
  resize(size: vec2): void {
    assert(size[0] >= 0 && size[1] >= 0, 'Both width and height have to be positive.');

    if (this._size === size) {
      return;
    }

    this._size = size;
    this._shadowMapFBO.resize(this._size[0], this._size[1], true, true);
  }

  @Initializable.initialize()
  initialize(size: vec2, light: Camera, vertexLocation: number): boolean {
    console.log(size[0], size[1]);

    this._size = size;
    this._light = light;

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

    const vert = new Shader(this._context, gl.VERTEX_SHADER, 'shadowMap.vert');
    vert.initialize(require('./shaders/shadowmap.vert'));
    const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'shadowMap.frag');
    frag.initialize(require('./shaders/shadowmap.frag'));
    //frag.replace('VERTEXLOCATION', vertexLocation.toString());
    this._program = new Program(this._context);
    this._program.initialize([vert, frag]);

    this._uLightViewMatrix = this._program.uniform('u_lightViewMatrix');
    this._uLightProjectionMatrix = this._program.uniform('u_lightProjectionMatrix');
    this._uLightFarPlane = this._program.uniform('u_lightFarPlane');

    return true;
  }

  @Initializable.uninitialize()
  uninitialize(): void {
    this._program.uninitialize();

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

    this._shadowMapFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
    this._program.bind();

    gl.uniformMatrix4fv(this._uLightViewMatrix, gl.GL_FALSE, this._light.view);
    gl.uniformMatrix4fv(this._uLightProjectionMatrix, gl.GL_FALSE, this._light.projection);
    gl.uniform1f(this._uLightFarPlane, this._light.far);
  }

  @Initializable.assert_initialized()
  end(): void {
    const gl = this._context.gl;

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    this._program.unbind();
    //this._shadowMapFBO.unbind();
  }
}
