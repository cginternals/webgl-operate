
import {
    Camera,
} from 'webgl-operate';

import { SphereLight } from './arealight';

export class Scene {
    protected _uri: string;
    protected _camera: Camera;
    protected _farPlane: number;

    protected _lights: Array<SphereLight>;

    constructor(uri: string, camera: Camera, nearPlane: number, farPlane: number) {
        this._uri = uri;
        this._camera = camera;
        this._camera.near = nearPlane;
        this._camera.far = farPlane;

        this._lights = new Array();
    }

    addLight(light: SphereLight): void {
        this._lights.push(light);
    }

    get uri(): string {
        return this._uri;
    }

    get camera(): Camera {
        return this._camera;
    }

    get lights(): Array<SphereLight> {
        return this._lights;
    }
}
