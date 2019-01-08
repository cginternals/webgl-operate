import { GltfAsset, GltfLoader } from 'gltf-loader-ts';
import { Canvas } from 'webgl-operate';
import { Wizard } from 'webgl-operate';
import { Renderer } from 'webgl-operate';
import { Demo } from '../demo';
import { Asset } from './asset';
import { GltfRenderer } from './gltfrenderer';

export class CornellBoxDemo extends Demo {
  get canvas(): Canvas {
    return this._canvas;
  }

  get renderer(): GltfRenderer {
    return this._renderer;
  }
  private _canvas: Canvas;
  private _renderer: GltfRenderer;

  private async loadGltf(
    loader: GltfLoader,
    uri: string,
    renderer: GltfRenderer,
  ): Promise<void> {
    try {
      const gAsset = await loader.load(uri);
      await gAsset.preFetchAll();
      this.loadScene(gAsset, renderer);
    } catch (e) {
      if (typeof e === 'string') {
        alert(e);
      } else {
        const detail = e.status
          ? ` (${e.status} ${e.statusText} ${e.url})`
          : '';
        alert(`Error loading glTF` + detail);
      }
    }
  }

  private async loadScene(
    gAsset: GltfAsset,
    renderer: GltfRenderer,
  ): Promise<void> {
    const asset = new Asset(gAsset, renderer.context);
    const scene = await asset.getScene();
    renderer.scene = scene;
  }

  initialize(element: HTMLCanvasElement | string): boolean {
    this._canvas = new Canvas(element);
    // this._canvas.controller.multiFrameNumber = 1;
    this._canvas.framePrecision = Wizard.Precision.float;
    // this._canvas.frameScale = [0.3333, 0.3333];
    this._canvas.clearColor.fromHex('d6d8db');
    // this._canvas.controller.multiFrameNumber = 1024;

    this._canvas.element.addEventListener('click', () => {
      this._canvas.controller.update();
    });

    this._renderer = new GltfRenderer();
    this._canvas.renderer = this._renderer;
    // const modelUri = require('./data/glTF/DamagedHelmet.gltf');
    const loader = new GltfLoader();
    this.loadGltf(loader, require('./data/scene.glb'), this._renderer);

    return true;
  }

  uninitialize(): void {
    this._canvas.dispose();
    (this._renderer as Renderer).uninitialize();
  }
}
