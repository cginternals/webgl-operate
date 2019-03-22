import { vec2 } from 'gl-matrix';

import { assert } from './auxiliaries';
import { Context } from './context';
import { Initializable } from './initializable';
import { NdcFillingTriangle } from './ndcfillingtriangle';
import { Program } from './program';
import { Shader } from './shader';
import { Texture2D } from './texture2d';


/**
 * Gaussian Filter implemented using a fragment shader.
 * Renders the filtered result into COLOR_ATTACHMENT0 of the currently bound framebuffer.
 * Does not support integer textures.
 */
export class GaussFilter extends Initializable {
  protected static readonly _MAXKERNELSIZEHALF = 32;

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
  protected _ndcTriangle: NdcFillingTriangle;
  protected _ndcTriangleShared = false;


  constructor(context: Context) {
    super();
    this._context = context;
  }

  /**
   * Recalculates the weights if necessary.
   * @returns - True if the weights were recalculated, false otherwise.
   */
  protected recalculateWeights(): boolean {
    if (this._weights) {
      return false;
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

    return true;
  }

  /**
   * Size of the kernel.
   */
  get kernelSize(): GLsizei {
    return this._kernelSize;
  }

  /**
   * Sets the size of the kernel.
   * The kernel size has to be an odd integer.
   */
  set kernelSize(kernelSize: GLsizei) {
    assert(kernelSize > 0, 'Kernel size has to be positive.');
    assert(kernelSize <= (GaussFilter._MAXKERNELSIZEHALF - 1) * 2 + 1,
      'Kernel size has to be smaller than ' + ((GaussFilter._MAXKERNELSIZEHALF - 1) * 2 + 2) + '.');
    assert(Number.isInteger(kernelSize), 'Kernel size has to be an integer.');
    assert(kernelSize % 2 === 1, 'Kernel size has to be odd.');

    this._kernelSize = kernelSize;
    this._weights = undefined;
  }

  /**
   * Standard deviation used to calculate the weights.
   */
  get standardDeviation(): GLfloat {
    return this._standardDeviation;
  }

  /**
   * Sets the standard deviation.
   */
  set standardDeviation(standardDeviation: GLfloat) {
    assert(standardDeviation > 0.0, 'Standard deviation has to be positive.');

    this._standardDeviation = standardDeviation;
    this._weights = undefined;
  }

  /**
   * Parameter determining whether the weights outside of the kernel get redistributed on the kernel.
   */
  get redistribute(): GLboolean {
    return this._redistribute;
  }

  /**
   * Sets the redistribute parameter.
   * If this is true then the sum of all weights inside the kernel is always 1.
   */
  set redistribute(redistribute: GLboolean) {
    this._redistribute = redistribute;
    this._weights = undefined;
  }

  /**
   * Creates and initializes the gaussian filters resources.
   * @param ndcTriangle - If specified, assumed to be used as shared geometry. If none is specified, a ndc-filling
   * triangle will be created internally.
   */
  @Initializable.initialize()
  initialize(ndcTriangle?: NdcFillingTriangle): boolean {
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
    if (ndcTriangle === undefined) {
      this._ndcTriangle = new NdcFillingTriangle(this._context, 'GaussFilterQuad');
    } else {
      this._ndcTriangle = ndcTriangle;
      this._ndcTriangleShared = true;
    }

    this._ndcTriangle.initialize(aVertex);

    return true;
  }

  /**
   * Uninitializes the program and screen aligned triangle geometry, if it is not shared.
   */
  @Initializable.uninitialize()
  uninitialize(): void {
    this._program.uninitialize();

    if (!this._ndcTriangleShared) {
      this._ndcTriangle.uninitialize();
    }
  }

  /**
   * Filters the given texture in the given direction using the configured weights.
   * The weights will be recalculated if necessary.
   * @param texture - The float texture to filter.
   * @param direction - The direction to filter the texture in.
   */
  @Initializable.assert_initialized()
  filter(texture: Texture2D, direction: GaussFilter.Direction): void {
    const gl = this._context.gl;
    const directionVectors: [vec2, vec2] = [vec2.fromValues(1.0, 0.0), vec2.fromValues(0.0, 1.0)];

    const recalculatedWeights = this.recalculateWeights();

    this._program.bind();
    texture.bind(gl.TEXTURE0);

    gl.uniform2iv(this._uTextureSize, texture.size);
    gl.uniform2fv(this._uDirection, directionVectors[direction]);

    if (recalculatedWeights) {
      gl.uniform1i(this._uKernelSize, this._kernelSize);
      gl.uniform1fv(this._uWeights, this._weights);
    }

    this._ndcTriangle.bind();
    this._ndcTriangle.draw();
    this._ndcTriangle.unbind();

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
