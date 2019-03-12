import { vec2 } from 'gl-matrix';

import { assert } from './auxiliaries';
import { Context } from './context';
import { Initializable } from './initializable';
import { NdcFillingRectangle } from './ndcfillingrectangle';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2D } from './texture2d';


export class GaussFilter extends Initializable {
  protected static readonly _maxKernelSizeHalf = 32;

  protected _kernelSize: GLsizei = 7;
  protected _standardDeviation: GLfloat = 1.0;
  protected _redistribute: GLboolean = true;

  protected _weights: [number, ...number[]] & { length: 32 } | undefined;

  protected _uKernelSize: WebGLUniformLocation;
  protected _uTextureSize: WebGLUniformLocation;
  protected _uDirection: WebGLUniformLocation;
  protected _uWeights: WebGLUniformLocation;

  protected _context: Context;
  protected _program: Program;
  protected _ndcQuad: NdcFillingRectangle;


  constructor(context: Context) {
    super();
    this._context = context;
  }

  protected recalculateWeights(): void {
    if (this._weights) {
      return;
    }

    const first = 1.0 / Math.sqrt(2.0 * Math.PI) * this._standardDeviation;
    const second = 2.0 * this._standardDeviation * this._standardDeviation;

    this._weights = [
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ];
    let summedWeight = 0.0;

    for (let i = 0; i <= Math.floor(this._kernelSize / 2); i++) {
      this._weights[i] = first * Math.pow(Math.E, -(Math.pow(i, 2.0) / second));
      summedWeight += i > 0 ? 2.0 * this._weights[i] : this._weights[i];
    }

    if (this._redistribute) {
      const remainder = 1.0 - summedWeight;
      for (let i = 0; i <= Math.floor(this._kernelSize / 2); i++) {
        this._weights[i] += this._weights[i] / summedWeight * remainder;
      }
    }
  }

  get kernelSize(): GLsizei {
    return this._kernelSize;
  }

  set kernelSize(kernelSize: GLsizei) {
    assert(kernelSize > 0, 'Kernel size has to be positive.');
    assert(kernelSize <= (GaussFilter._maxKernelSizeHalf - 1) * 2 + 1,
      'Kernel size has to be smaller than ' + ((GaussFilter._maxKernelSizeHalf - 1) * 2 + 2) + '.');
    assert(Number.isInteger(kernelSize), 'Kernel size has to be an integer.');
    assert(kernelSize % 2 === 1, 'Kernel size has to be odd.');

    this._kernelSize = kernelSize;
    this._weights = undefined;
  }

  get standardDeviation(): GLfloat {
    return this._standardDeviation;
  }

  set standardDeviation(standardDeviation: GLfloat) {
    assert(standardDeviation > 0.0, 'Standard deviation has to be positive.');

    this._standardDeviation = standardDeviation;
    this._weights = undefined;
  }

  get redistribute(): GLboolean {
    return this._redistribute;
  }

  set redistribute(redistribute: GLboolean) {
    this._redistribute = redistribute;
    this._weights = undefined;
  }

  @Initializable.initialize()
  initialize(): boolean {
    const gl = this._context.gl;

    const vert = new Shader(this._context, gl.VERTEX_SHADER, 'gauss.vert');
    vert.initialize(require('./shaders/gaussfilter.vert'));
    const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'gauss.frag');
    frag.initialize(require('./shaders/gaussfilter.frag'));
    this._program = new Program(this._context);
    this._program.initialize([vert, frag]);

    this._uKernelSize = this._program.uniform('u_kernelSize');
    this._uTextureSize = this._program.uniform('u_textureSize');
    this._uDirection = this._program.uniform('u_direction');
    this._uWeights = this._program.uniform('u_weights');

    const aVertex = this._program.attribute('a_vertex', 0);
    this._ndcQuad = new NdcFillingRectangle(this._context, 'GaussFilterQuad');
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

    this.recalculateWeights();

    this._program.bind();
    texture.bind(gl.TEXTURE0);

    gl.uniform1i(this._uKernelSize, this._kernelSize);
    gl.uniform2iv(this._uTextureSize, texture.size);
    gl.uniform2fv(this._uDirection, directionVectors[direction]);
    gl.uniform1fv(this._uWeights, this._weights);

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
