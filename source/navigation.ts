
import { Camera } from './camera';
import { EventHandler } from './eventhandler';
import { MouseEventProvider } from './mouseeventprovider';
import { Invalidate } from './renderer';

import { TrackballModifier } from './trackballmodifier';


export class Navigation {


    /** @see {@link camera} */
    protected _camera: Camera;

    /**
     * Trackball camera modifier.
     */
    protected _trackball: TrackballModifier;


    /**
     * Even handler used to forward/map events to specific camera modifiers.
     */
    protected _eventHandler: EventHandler;

    /**
     * Identifies the active camera modifier.
     */
    protected _mode: Navigation.Modes | undefined;


    constructor(invalidate: Invalidate, mouseEventProvider: MouseEventProvider) {

        /* Create event handler that listens to mouse events. */
        this._eventHandler = new EventHandler(invalidate, mouseEventProvider);

        /* Listen to mouse events. */
        this._eventHandler.pushMouseDownHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseDown(latests, previous));
        this._eventHandler.pushMouseUpHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseUp(latests, previous));
        this._eventHandler.pushMouseMoveHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseMove(latests, previous));
        // this._eventHandler.pushMouseWheelHandler((latests: Array<WheelEvent>, previous: Array<WheelEvent>) =>
        //     this.onWheel(latests, previous));


        this._trackball = new TrackballModifier();
        this._trackball.camera = this._camera;
    }


    /**
     * Resolves the event to camera modifier mapping by returning the responsible camera modifier.
     * @param event - Event to retrieve navigation mode for.
     */
    protected mode(event: MouseEvent | TouchEvent | KeyboardEvent): Navigation.Modes | undefined {

        if ((event.type === 'mousedown' || event.type === 'mousemove') && ((event as MouseEvent).buttons & 1)) {
            // Mouse button 1: rotate
            return Navigation.Modes.Trackball;

        } else if ((event.type === 'mousedown' || event.type === 'mousemove')
            // Mouse button 2: zoom
            && ((event as MouseEvent).buttons & 2)) {
            return Navigation.Modes.Zoom;

        } else if (event.type === 'wheel') {
            // Mouse wheel: zoom
            return Navigation.Modes.ZoomStep;
        }

        // Unknown interaction
        return undefined;
    }


    protected onMouseDown(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        for (const event of latests) {
            this._mode = this.mode(event);

            const point = this._eventHandler.offsets(event)[0];
            switch (this._mode) {
                case Navigation.Modes.Zoom:
                    // this.startZoom(event);
                    break;

                case Navigation.Modes.Trackball:
                    /* Stop default action for the event. */
                    event.preventDefault();
                    this._trackball.startRotate(point);
                    break;

                default:
                    break;
            }
        }
    }

    protected onMouseUp(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        for (const event of latests) {
            if (undefined === this._mode) {
                return;
            }

            event.preventDefault();
        }
    }

    protected onMouseMove(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        for (const event of latests) {
            const modeWasUndefined = (this._mode === undefined);
            this._mode = this.mode(event);

            const point = this._eventHandler.offsets(event)[0];
            switch (this._mode) {
                // case Navigation.Modes.Zoom:
                //     // modeWasUndefined ? this.startZoom(event) : this.updateZoom(event);
                //     break;

                case Navigation.Modes.Trackball:
                    modeWasUndefined ? this._trackball.startRotate(point) : this._trackball.updateRotate(point);
                    break;

                default:
                    break;
            }
        }
    }


    /**
     * Update should invoke navigation specific event processing. When using, e.g., an event handler, the event handlers
     * update method should be called in order to have navigation specific event processing invoked.
     */
    update(): void {
        this._eventHandler.update();
    }

    /**
     * The camera that is to be modified in response to various events.
     */
    set camera(camera: Camera) {
        this._camera = camera;
        this._trackball.camera = camera;
    }

}


export namespace Navigation {

    /**
     * Navigation modes used for identification and handling of multiple camera modifiers simultaneously.
     */
    export enum Modes {
        FirstPerson,
        Flight,
        Pan,
        Orbit,
        Trackball,
        Zoom,
        ZoomStep,
    }
}
