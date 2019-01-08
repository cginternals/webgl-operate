import { mat4, vec2, vec3 } from 'gl-matrix';
import { uniq } from 'lodash';
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

import { positionLabels } from './labelalignment';
import { PbrShader } from './pbrshader';
import { Scene } from './scene';

export class GltfRenderer extends Renderer {
  protected pbrShader: PbrShader;
  protected labelPass: LabelRenderPass;
  protected defaultFBO: DefaultFramebuffer;
  // Camera and navigation
  protected camera: Camera;
  protected navigation: Navigation;
  protected fontFace: FontFace | undefined;

  // tslint:disable-next-line:variable-name
  protected _scene: Scene;
  set scene(scene: Scene) {
    if (this._scene) {
      this._scene.uninitialize();
    }
    this._scene = scene;
    this.setCameraFromBounds();
    this.labelPass.labels = [];

    uniq(this._scene.nodes).forEach((node) => {
      if (node.labelText) {
        const label = new Position2DLabel(
          new Text(
            node.labelText,
          ),
          Label.Type.Dynamic,
        );
        label.fontSize = 25;
        label.fontFace = this.fontFace;
        label.alignment = Label.Alignment.Center;
        label.color.fromHex('0f1e4d');
        node.label = label;
        this.labelPass.labels.push(label);
      }
    });
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
    (window as any).labelPass = this.labelPass;

    FontFace.fromFile('./data/opensansr144.fnt', context)
      .then((fontFace) => {
        this.fontFace = fontFace;
        for (const label of this.labelPass.labels) {
          label.fontFace = fontFace;
        }
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
    // TODO: update label positions
    if (this._scene) {
      const positions: Array<{ label: Position2DLabel, viewPos: vec2 }> = [];
      uniq(this._scene.nodes).forEach((node) => {
        if (node.label) {
          const modelViewTransf = mat4.create();
          mat4.mul(modelViewTransf, this.camera.viewProjection, node.finalTransform);
          const center = vec3.create();
          vec3.transformMat4(center, node.bounds.center, modelViewTransf);
          positions.push({ label: node.label, viewPos: vec2.fromValues(center[0], center[1]) });
          // node.label.position = vec2.fromValues(center[0] * this._frameSize[0] * 0.5, center[1]
          //  * this._frameSize[1] * 0.5);
        }
      });
      if (positions.length !== 0) {

        const scenebounds = this._scene.bounds.clone();
        scenebounds.transform(this.camera.viewProjection);
        const border: Array<vec2> = [];
        border.push(vec2.fromValues(scenebounds.min[0], scenebounds.min[1]));
        border.push(vec2.fromValues(scenebounds.max[0], scenebounds.min[1]));
        border.push(vec2.fromValues(scenebounds.max[0], scenebounds.max[1]));
        border.push(vec2.fromValues(scenebounds.min[0], scenebounds.max[1]));
        const labelPositions = positionLabels(border, positions.map((pos) => pos.viewPos));
        labelPositions.forEach((position, index) => {
          if (positions[index].label) {
            positions[index].label.position = vec2.fromValues(position[0] * this._frameSize[0] * 0.5, position[1]
              * this._frameSize[1] * 0.5);
          }
        });
      }
    }

    this.labelPass.update();
    let labelAltered = false;
    this.labelPass.labels.forEach((label) => {
      labelAltered = labelAltered || label.altered;
    });
    // Reset state
    const altered =
      this._altered.any ||
      this.camera.altered ||
      labelAltered;
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
