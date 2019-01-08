import { Camera, Navigation, Renderer } from 'webgl-operate';
import { Scene } from './scene';

export abstract class SceneRenderer extends Renderer {
    protected _scene: Scene;
    set scene(scene: Scene) {
        this._scene = scene;
        this.invalidate(true);
    }

    // Camera and navigation
    public camera: Camera;
    public navigation: Navigation;
    constructor(camera: Camera, navigation: Navigation) {
        super();
        this.camera = camera;
        this.navigation = navigation;
    }
}
