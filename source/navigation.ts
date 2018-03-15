
import { Camera } from './camera';


export abstract class Navigation {


    /** @see {@link camera} */
    protected _camera: Camera;

    /**
     * Update should invoke navigation specific event processing. When using, e.g., an event handler, the event handlers
     * update method should be called in order to have navigation specific event processing invoked.
     */
    abstract update(): void;

    /**
     * The camera that is to be modified in response to various events.
     */
    set camera(camera: Camera) {
        this._camera = camera;
    }

}
