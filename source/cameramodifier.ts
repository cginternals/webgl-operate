
import { vec2 } from 'gl-matrix';

import { Camera } from './camera';


export abstract class CameraModifier {

    /** @see {@link camera} */
    protected _camera: Camera | undefined = undefined;

    /**
     * Copy of a camera for ongoing camera modifications based on previous/initial camera settings.
     */
    protected _reference = new Camera();

    /**
     * Reference to the initial point starting the camera modification.
     */
    protected _initialPoint: vec2;

    /**
     * Reference to the current point updating the camera modification.
     */
    protected _currentPoint: vec2;


    /**
     * Should apply all previously calculated transformations to the camera set. Note that this does not invalidate the
     * rendering. Invalidation of rendering is done by the event handler (triggering a rendering update which in turn
     * checks if the camera was altered, and if so, redraws).
     */
    abstract update(): void;


    /**
     * The camera that is to be modified in response to various events.
     */
    set camera(camera: Camera | undefined) {
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
        if (camera === undefined) {
            return;
        }
        Object.assign(this._reference, camera);
        this.update();
    }

}
