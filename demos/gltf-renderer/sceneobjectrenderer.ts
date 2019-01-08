import {
  Context,
} from 'webgl-operate';

import { PbrShader } from './pbrshader';
import { SceneRenderer } from './scenerenderer';

export class SceneObjectRenderer extends SceneRenderer {

  get context(): Context {
    return this._context;
  }
  protected pbrShader: PbrShader;

  protected onInitialize(
    context: Context,
  ): boolean {
    this.pbrShader = new PbrShader(context);
    return true;
  }

  protected onUninitialize(): void {
    this.pbrShader.uninitialize();
  }

  protected onUpdate(): boolean {

    // Reset state
    const altered =
      this._altered.any;
    this._altered.reset();

    // If anything has changed, render a new frame
    return altered;
  }

  protected onPrepare(): void {
    return;
  }

  protected onFrame(frameNumber: number): void {
    const gl = this._context.gl;
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
}
