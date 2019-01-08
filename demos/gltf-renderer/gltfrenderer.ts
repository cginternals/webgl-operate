import { vec3 } from 'gl-matrix';
import {
    Camera,
    Context,
    Invalidate,
    MouseEventProvider,
    Navigation,
    Renderer,
    TouchEventProvider,
} from 'webgl-operate';

import { LabelRenderer } from './labelrenderer';
import { Scene } from './scene';
import { SceneObjectRenderer } from './sceneobjectrenderer';
import { SceneRenderer } from './scenerenderer';

const sceneRenderes = [LabelRenderer, SceneObjectRenderer];

export class GltfRenderer extends Renderer {
    // Camera and navigation
    protected camera: Camera;
    protected navigation: Navigation;
    protected renderers: SceneRenderer[];

    // tslint:disable-next-line:variable-name
    protected _scene: Scene;
    set scene(scene: Scene) {
        if (this._scene) {
            this._scene.uninitialize();
        }
        this._scene = scene;
        this.setCameraFromBounds();
        for (const renderer of this.renderers) {
            renderer.scene = scene;
        }
        this.invalidate(true);
    }

    get context(): Context {
        return this._context;
    }

    protected onInitialize(
        context: Context,
        callback: Invalidate,
        mouseEventProvider: MouseEventProvider,
        touchEventProvider: TouchEventProvider,
    ): boolean {
        const gl = this._context.gl;
        // Initialize camera
        this.camera = new Camera();
        this.camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this.camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this.camera.eye = vec3.fromValues(0.0, 0.0, 3.0);
        this.camera.near = 0.1;
        this.camera.far = 20.0;

        // Initialize navigation
        this.navigation = new Navigation(callback, mouseEventProvider);
        this.navigation.camera = this.camera;

        this.renderers = sceneRenderes.map((renderer) => {
            const newRenderer = new renderer(this.camera, this.navigation);
            newRenderer.initialize(context, callback, mouseEventProvider, touchEventProvider);
            return newRenderer;
        });

        gl.enable(gl.DEPTH_TEST);

        return true;
    }

    protected onUninitialize(): void {
        this._scene.uninitialize();
        this.renderers.forEach((renderer) => renderer.uninitialize());
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

        const rendererAltered = this.renderers.map((renderer) => renderer.update(0)).reduce((prev, cur) => prev || cur);

        // Reset state
        const altered =
            this._altered.any ||
            this.camera.altered || rendererAltered;
        this._altered.reset();
        this.camera.altered = false;

        // If anything has changed, render a new frame
        return altered || true;
    }

    protected onPrepare(): void {
        this.renderers.forEach((renderer) => renderer.prepare());
        return;
    }

    protected onFrame(frameNumber: number): void {
        const gl = this._context.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.renderers.forEach((renderer) => renderer.frame(frameNumber));
    }
    protected onSwap(): void {
        this.renderers.forEach((renderer) => renderer.swap());
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
