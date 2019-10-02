
import {
    Camera,
} from 'webgl-operate';

import { DiskLight, SphereLight } from './arealight';

export class Scene {
    protected _uri: string;
    protected _camera: Camera;
    protected _farPlane: number;

    protected _sphereLights: Array<SphereLight>;
    protected _diskLights: Array<DiskLight>;

    constructor(uri: string, camera: Camera, nearPlane: number, farPlane: number) {
        this._uri = uri;
        this._camera = camera;
        this._camera.near = nearPlane;
        this._camera.far = farPlane;

        this._sphereLights = new Array();
        this._diskLights = new Array();
    }

    addSphereLight(light: SphereLight): void {
        this._sphereLights.push(light);
    }

    addDiskLight(light: DiskLight): void {
        this._diskLights.push(light);
    }

    get uri(): string {
        return this._uri;
    }

    get camera(): Camera {
        return this._camera;
    }

    get sphereLights(): Array<SphereLight> {
        return this._sphereLights;
    }

    get diskLights(): Array<DiskLight> {
        return this._diskLights;
    }
}
