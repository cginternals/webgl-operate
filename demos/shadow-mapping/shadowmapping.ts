
import { vec3 } from 'webgl-operate';

import { Cube } from './cube';
import { Plane } from './plane';

//import { ShadowMappingPass } from '../../source/shadowmappingpass';

import {
  Camera,
  Canvas,
  Context,
  DefaultFramebuffer,
  Framebuffer,
  GaussFilter,
  Invalidate,
  MouseEventProvider,
  Navigation,
  Program,
  Renderbuffer,
  Renderer,
  Shader,
  ShadowMapping,
  Texture2D,
  Wizard,
} from 'webgl-operate';

import { Demo } from '../demo';

// tslint:disable:max-classes-per-file


class ShadowMappingRenderer extends Renderer {

  private static readonly SHADOWMAP_SIZE: [number, number] = [1024, 1024];
  private static readonly BLURRED_SHADOWMAP_SIZE: [number, number] = [512, 512];

  protected _cube: Cube;
  protected _plane: Plane;

  protected _defaultFBO: DefaultFramebuffer;
  protected _navigation: Navigation;

  protected _camera: Camera;
  protected _light: Camera;

  protected _intermediateBlurFBO: Framebuffer;
  protected _intermediateBlurTexture: Texture2D;
  protected _intermediateBlurRenderbuffer: Renderbuffer;

  protected _blurFBO: Framebuffer;
  protected _blurTexture: Texture2D;
  protected _blurRenderbuffer: Renderbuffer;

  protected _gaussFilter: GaussFilter;
  protected _shadowMapping: ShadowMapping;

  protected _shadowProgram: Program;
  protected _uShadowViewMatrix: WebGLUniformLocation;
  protected _uShadowProjectionMatrix: WebGLUniformLocation;
  protected _uShadowFarPlane: WebGLUniformLocation;

  protected _shadowMappingProgram: Program;
  protected _uCameraViewProjectionMatrix: WebGLUniformLocation;
  protected _uShadowMappingViewMatrix: WebGLUniformLocation;
  protected _uShadowMappingProjectionMatrix: WebGLUniformLocation;
  protected _uShadowMappingFarPlane: WebGLUniformLocation;


  protected onInitialize(context: Context, callback: Invalidate, mouseEventProvider: MouseEventProvider): boolean {
    const gl = this._context.gl;
    const gl2facade = this._context.gl2facade;

    // ------------------------ Setup Blur (Intermediate) ------------------------
    this._intermediateBlurTexture = new Texture2D(this._context, 'IntermediateBlurTexture');
    this._intermediateBlurTexture.initialize(
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[0],
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[1],
      gl.RG16F, gl.RG, gl.FLOAT);
    this._intermediateBlurTexture.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    this._intermediateBlurTexture.filter(gl.LINEAR, gl.LINEAR);

    this._intermediateBlurRenderbuffer = new Renderbuffer(this._context, 'IntermediateBlurRenderbuffer');
    this._intermediateBlurRenderbuffer.initialize(
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[0],
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[1],
      gl.DEPTH_COMPONENT16);

    this._intermediateBlurFBO = new Framebuffer(this._context, 'IntermediateBlurFramebuffer');
    this._intermediateBlurFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._intermediateBlurTexture]
      , [gl.DEPTH_ATTACHMENT, this._intermediateBlurRenderbuffer]]);
    this._intermediateBlurFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
    this._intermediateBlurFBO.clearDepth(1.0);

    // ------------------------ Setup Blur (Final) ------------------------
    this._blurTexture = new Texture2D(this._context, 'BlurTexture');
    this._blurTexture.initialize(
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[0],
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[1],
      gl.RG16F, gl.RG, gl.FLOAT);
    this._blurTexture.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    this._blurTexture.filter(gl.LINEAR, gl.LINEAR);

    this._blurRenderbuffer = new Renderbuffer(this._context, 'BlurRenderbuffer');
    this._blurRenderbuffer.initialize(
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[0],
      ShadowMappingRenderer.BLURRED_SHADOWMAP_SIZE[1],
      gl.DEPTH_COMPONENT16);

    this._blurFBO = new Framebuffer(this._context, 'BlurFramebuffer');
    this._blurFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._blurTexture]
      , [gl.DEPTH_ATTACHMENT, this._blurRenderbuffer]]);
    this._blurFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
    this._blurFBO.clearDepth(1.0);

    // ------------------------ Setup DefaultFBO ------------------------
    this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
    this._defaultFBO.initialize();

    // ------------------------ Setup Shadow Program ------------------------
    const shadowVert = new Shader(this._context, gl.VERTEX_SHADER, 'shadow.vert');
    shadowVert.initialize(require('./shadow.vert'));
    const shadowFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'shadow.frag');
    shadowFrag.initialize(require('./shadow.frag'));

    this._shadowProgram = new Program(this._context);
    const result = this._shadowProgram.initialize([shadowVert, shadowFrag]);
    console.log(result);

    this._uShadowViewMatrix = this._shadowProgram.uniform('u_LightViewMatrix');
    this._uShadowProjectionMatrix = this._shadowProgram.uniform('u_LightProjectionMatrix');
    this._uShadowFarPlane = this._shadowProgram.uniform('u_LightFarPlane');

    // ------------------------ Setup Shadow Mapping Program ------------------------
    const shadowMappingVert = new Shader(this._context, gl.VERTEX_SHADER, 'shadowMapping.vert');
    shadowMappingVert.initialize(require('./shadowMapping.vert'));
    const shadowMappingFrag = new Shader(this._context, gl.FRAGMENT_SHADER, 'shadowMapping.frag');
    shadowMappingFrag.initialize(require('./shadowMapping.frag'));

    this._shadowMappingProgram = new Program(this._context);
    this._shadowMappingProgram.initialize([shadowMappingVert, shadowMappingFrag]);

    this._uShadowMappingViewMatrix = this._shadowMappingProgram.uniform('u_LightViewMatrix');
    this._uShadowMappingProjectionMatrix = this._shadowMappingProgram.uniform('u_LightProjectionMatrix');
    this._uShadowMappingFarPlane = this._shadowMappingProgram.uniform('u_LightFarPlane');
    this._uCameraViewProjectionMatrix = this._shadowMappingProgram.uniform('u_CameraViewProjectionMatrix');

    // ------------------------ Setup Cameras ------------------------
    this._camera = new Camera();
    this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
    vec3.normalize(this._camera.up, vec3.fromValues(-1.0, 1.0, 0.0));
    this._camera.eye = vec3.fromValues(6.0, 6.0, 0.0);
    this._camera.near = 3.0;
    this._camera.far = 32.0;

    this._light = new Camera();
    this._light.center = vec3.fromValues(0.0, 0.0, 0.0);
    vec3.normalize(this._light.up, vec3.fromValues(0.0, 1.0, -1.0));
    this._light.eye = vec3.fromValues(0.0, 6.0, 6.0);
    this._light.near = 3.0;
    this._light.far = 16.0;
    this._light.viewport = ShadowMappingRenderer.SHADOWMAP_SIZE;
    this._light.aspect = 1;

    // ------------------------ Setup Navigation ------------------------
    this._navigation = new Navigation(callback, mouseEventProvider);
    this._navigation.camera = this._camera;

    // ------------------------ Setup Geometry
    this._cube = new Cube(this._context, 'cube');
    this._cube.initialize(0);

    this._plane = new Plane(this._context, 'plane');
    this._plane.initialize(0);

    // ------------------------ Setup GaussFilter ------------------------
    this._gaussFilter = new GaussFilter(this._context);
    this._gaussFilter.kernelSize = 21;
    this._gaussFilter.standardDeviation = 4;
    this._gaussFilter.initialize();

    // ------------------------ Setup ShadowMappingPass ------------------------
    this._shadowMapping = new ShadowMapping(this._context);
    this._shadowMapping.initialize(this._light);

    return true;
  }

  protected onUninitialize(): void {
    super.uninitialize();

    this._intermediateBlurFBO.uninitialize();
    this._intermediateBlurTexture.uninitialize();
    this._intermediateBlurRenderbuffer.uninitialize();

    this._blurFBO.uninitialize();
    this._intermediateBlurTexture.uninitialize();
    this._intermediateBlurRenderbuffer.uninitialize();

    this._defaultFBO.uninitialize();

    this._cube.uninitialize();
    this._plane.uninitialize();

    this._gaussFilter.uninitialize();
    this._shadowMapping.uninitialize();
  }

  protected onUpdate(): boolean {
    this._navigation.update();

    return true;
  }

  protected onPrepare(): void {
    if (this._altered.frameSize) {
      this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
    }
    if (this._altered.canvasSize) {
      this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
    }

    if (this._altered.clearColor) {
      this._defaultFBO.clearColor(this._clearColor);
    }

    this._altered.reset();
  }

  protected onFrame(frameNumber: number): void {
    const gl = this._context.gl;

    this._shadowMapping.begin();
    this._shadowProgram.bind();

    gl.uniformMatrix4fv(this._uShadowViewMatrix, gl.GL_FALSE, this._light.view);
    gl.uniformMatrix4fv(this._uShadowProjectionMatrix, gl.GL_FALSE, this._light.projection);
    gl.uniform1f(this._uShadowFarPlane, this._light.far);

    this._cube.bind();
    this._cube.draw();
    this._plane.bind();
    this._plane.draw();

    this._shadowProgram.unbind();
    this._shadowMapping.end();

    gl.viewport(0, 0, this._intermediateBlurFBO.width, this._intermediateBlurFBO.height);
    this._intermediateBlurFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
    this._gaussFilter.filter(this._shadowMapping.shadowMapTexture, GaussFilter.Direction.Horizontal);

    gl.viewport(0, 0, this._blurFBO.width, this._blurFBO.height);
    this._blurFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
    this._gaussFilter.filter(this._intermediateBlurTexture, GaussFilter.Direction.Vertical);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
    this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
    this._shadowMappingProgram.bind();

    this._blurTexture.bind(gl.TEXTURE0);
    gl.uniformMatrix4fv(this._uCameraViewProjectionMatrix, gl.GL_FALSE, this._camera.viewProjection);
    gl.uniformMatrix4fv(this._uShadowMappingViewMatrix, gl.GL_FALSE, this._light.view);
    gl.uniformMatrix4fv(this._uShadowMappingProjectionMatrix, gl.GL_FALSE, this._light.projection);
    gl.uniform1f(this._uShadowMappingFarPlane, this._light.far);

    this._cube.bind();
    this._cube.draw();
    this._plane.bind();
    this._plane.draw();

    this._plane.unbind();
    this._blurTexture.unbind(gl.TEXTURE0);
    this._shadowMappingProgram.unbind();

    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
  }

  protected onSwap(): void {

  }
}

export class ShadowMappingDemo extends Demo {

  private _canvas: Canvas;
  private _renderer: ShadowMappingRenderer;

  initialize(element: HTMLCanvasElement | string): boolean {

    this._canvas = new Canvas(element);
    this._canvas.controller.multiFrameNumber = 1;
    this._canvas.framePrecision = Wizard.Precision.float;
    this._canvas.frameScale = [1.0, 1.0];
    this._canvas.clearColor.fromHex('d6d8db');
    this._canvas.controller.multiFrameNumber = 1024;

    this._canvas.element.addEventListener('click', () => { this._canvas.controller.update(); });

    this._renderer = new ShadowMappingRenderer();
    this._canvas.renderer = this._renderer;

    return true;
  }

  uninitialize(): void {
    this._canvas.dispose();
    (this._renderer as Renderer).uninitialize();
  }

  get canvas(): Canvas {
    return this._canvas;
  }

  get renderer(): ShadowMappingRenderer {
    return this._renderer;
  }

}
