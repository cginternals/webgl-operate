import { vec3 } from 'gl-matrix';
import {
  Camera,
  Context,
  DefaultFramebuffer,
  FontFace,
  Invalidate,
  Label,
  LabelRenderPass,
  MouseEventProvider,
  Navigation,
  Position2DLabel,
  Renderer,
  Text,
} from 'webgl-operate';

import { PbrShader } from './pbrshader';
import { Scene } from './scene';

export class GltfRenderer extends Renderer {
  protected pbrShader: PbrShader;
  protected labelPass: LabelRenderPass;
  protected defaultFBO: DefaultFramebuffer;
  // Camera and navigation
  protected camera: Camera;
  protected navigation: Navigation;

  // tslint:disable-next-line:variable-name
  protected _scene: Scene;
  set scene(scene: Scene) {
    if (this._scene) {
      this._scene.uninitialize();
    }
    this._scene = scene;
    this.setCameraFromBounds();

    this.invalidate(true);
  }

  get context(): Context {
    return this._context;
  }

  protected onInitialize(
    context: Context,
    callback: Invalidate,
    mouseEventProvider: MouseEventProvider,
  ): boolean {
    const gl = this._context.gl;
    this.pbrShader = new PbrShader(context);
    // Initialize camera
    this.camera = new Camera();
    this.camera.center = vec3.fromValues(0.0, 0.0, 0.0);
    this.camera.up = vec3.fromValues(0.0, 1.0, 0.0);
    this.camera.eye = vec3.fromValues(0.0, 0.0, 3.0);
    this.camera.near = 0.1;
    this.camera.far = 20.0;

    this.defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
    this.defaultFBO.initialize();

    /* Create and configure label pass. */

    this.labelPass = new LabelRenderPass(context);
    this.labelPass.initialize();
    this.labelPass.target = this.defaultFBO;
    this.labelPass.camera = this.camera;
    this.labelPass.depthMask = true;
    this.labelPass.ndcOffset = [0, 0];
    const label = new Position2DLabel(
      new Text(
        'This is a label This is a label This is a label This is a label This is a label This is a label',
      ),
      Label.Type.Dynamic,
    );
    label.fontSize = 50;
    label.alignment = Label.Alignment.Center;
    label.color.fromHex('f0ba42');

    this.labelPass.labels = [label];
    FontFace.fromFile('./data/opensansr144.fnt', context)
      .then((fontFace) => {
        this.labelPass.labels[0].fontFace = fontFace;
        (window as any).label = this.labelPass.labels[0];
        this.invalidate();
      })
      .catch((reason) => console.error(reason));

    // Initialize navigation
    this.navigation = new Navigation(callback, mouseEventProvider);
    this.navigation.camera = this.camera;

    gl.enable(gl.DEPTH_TEST);

    return true;
  }

  protected onUninitialize(): void {
    this._scene.uninitialize();
    this.pbrShader.uninitialize();
    this.defaultFBO.uninitialize();
    this.labelPass.uninitialize();
  }

  protected onUpdate(): boolean {
    const gl = this.context.gl;
    // Resize
    if (this._altered.frameSize) {
      this.camera.viewport = [this._frameSize[0], this._frameSize[1]];
      gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
    }
    if (this._altered.canvasSize) {
      this.camera.aspect = this._canvasSize[0] / this._canvasSize[1];
    }

    // Update clear color
    if (this._altered.clearColor) {
      const c = this._clearColor;
      gl.clearColor(c[0], c[1], c[2], c[3]);
    }

    this.navigation.update();
    this.labelPass.update();
    // Reset state
    const altered =
      this._altered.any ||
      this.camera.altered ||
      (this.labelPass.labels && this.labelPass.labels[0].altered);
    this._altered.reset();
    this.camera.altered = false;

    // If anything has changed, render a new frame
    return altered || true;
  }

  protected onPrepare(): void {
    return;
  }

  protected onFrame(frameNumber: number): void {
    const gl = this._context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.labelPass.frame();
    this.labelPass.unbind();
    gl.enable(gl.DEPTH_TEST);
    this.pbrShader.bind();
    gl.uniformMatrix4fv(
      this.pbrShader.uniforms.u_ViewProjection,
      false,
      this.camera.viewProjection,
    );
    gl.uniform3fv(this.pbrShader.uniforms.u_Camera, this.camera.eye);

    if (this._scene) {
      this._scene.draw(this.camera, this.pbrShader);
    }
    this.pbrShader.unbind();
    gl.disable(gl.DEPTH_TEST);
  }
  protected onSwap(): void {
    return;
  }

  protected setCameraFromBounds(): void {
    const bounds = this._scene.bounds;
    const size = vec3.len(bounds.size);
    const center = bounds.center;

    this.camera.eye = vec3.fromValues(
      center[0] + size / 1.5,
      center[1] + size / 5.0,
      center[2] + size / 1.5,
    );
    this.camera.center = center;
    this.camera.far = size * 20;
    this.camera.near = size / 100;
  }
}
