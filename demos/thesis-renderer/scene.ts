
import {
    Camera,
} from 'webgl-operate';

export class Scene {
    protected _uri: string;
    protected _camera: Camera;
    protected _farPlane: number;

    constructor(uri: string, camera: Camera, nearPlane: number, farPlane: number) {
        this._uri = uri;
        this._camera = camera;
        this._camera.near = nearPlane;
        this._camera.far = farPlane;
    }

    get uri(): string {
        return this._uri;
    }

    get camera(): Camera {
        return this._camera;
    }
}
