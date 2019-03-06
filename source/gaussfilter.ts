import { vec2 } from 'gl-matrix';

import { assert } from './auxiliaries';
import { Context } from './context';
import { Initializable } from './initializable';
import { NdcFillingRectangle } from './ndcfillingrectangle';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2D } from './texture2d';


export class GaussFilter extends Initializable {
  protected _kernelSize: GLsizei = 7;
  protected _standardDeviation: GLfloat = 1.0;

  protected _uKernelSize: WebGLUniformLocation;
  protected _uTextureSize: WebGLUniformLocation;
  protected _uSigma: WebGLUniformLocation;
  protected _uRedistribute: WebGLUniformLocation;
  protected _uDirection: WebGLUniformLocation;

  protected _context: Context;
  protected _program: Program;
  protected _ndcQuad: NdcFillingRectangle;

  public redistribute: GLboolean = true;


  constructor(context: Context) {
    super();
    this._context = context;
  }

  get kernelSize(): GLsizei {
    return this._kernelSize;
  }

  set kernelSize(kernelSize: GLsizei) {
    assert(kernelSize > 0, 'Kernel size has to be positive.');
    assert(Number.isInteger(kernelSize), 'Kernel size has to be an integer.');
    assert(kernelSize % 2 === 1, 'Kernel size has to be odd.');

    this._kernelSize = kernelSize;
  }

  get standardDeviation(): GLfloat {
    return this._standardDeviation;
  }

  set standardDeviation(standardDeviation: GLfloat) {
    assert(standardDeviation > 0.0, 'Standard deviation has to be positive.');

    this._standardDeviation = standardDeviation;
  }

  @Initializable.initialize()
  initialize(): boolean {
    const gl = this._context.gl;

    const vert = new Shader(this._context, gl.VERTEX_SHADER, 'gauss.vert');
    vert.initialize('');
    const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'gauss.frag');
    frag.initialize('');
    this._program = new Program(this._context);
    this._program.initialize([vert, frag]);

    this._uKernelSize = this._program.uniform('u_kernelSize');
    this._uTextureSize = this._program.uniform('u_textureSize');
    this._uSigma = this._program.uniform('u_sigma');
    this._uRedistribute = this._program.uniform('u_redistribute');
    this._uDirection = this._program.uniform('u_direction');

    const aVertex = this._program.attribute('a_vertex', 0);
    this._ndcQuad.initialize(aVertex);

    return true;
  }

  @Initializable.uninitialize()
  uninitialize(): void {
    this._program.uninitialize();
    this._ndcQuad.uninitialize();
  }

  @Initializable.assert_initialized()
  filter(texture: Texture2D, direction: GaussFilter.Direction): void {
    const gl = this._context.gl;
    const directionVectors: [vec2, vec2] = [vec2.fromValues(1.0, 0.0), vec2.fromValues(0.0, 1.0)];

    this._program.bind();
    texture.bind(gl.TEXTURE0);

    gl.uniform1i(this._uKernelSize, this._kernelSize);
    gl.uniform2iv(this._uTextureSize, texture.size);
    gl.uniform1f(this._uSigma, this._standardDeviation);
    gl.uniform1i(this._uRedistribute, this.redistribute ? 1 : 0);
    gl.uniform2fv(this._uDirection, directionVectors[direction]);

    this._ndcQuad.bind();
    this._ndcQuad.draw();
    this._ndcQuad.unbind();

    texture.unbind(gl.TEXTURE0);
    this._program.unbind();
  }
}

export namespace GaussFilter {

  export enum Direction {
    Horizontal = 0,
    Vertical = 1,
  }

}
