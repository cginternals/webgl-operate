
import { Camera } from './camera';
import { EventHandler } from './eventhandler';
import { MouseEventProvider } from './mouseeventprovider';
import { Invalidate } from './renderer';

import { TrackballModifier } from './trackballmodifier';
import { TurntableModifier } from './turntablemodifier';
import { FirstPersonModifier } from './webgl-operate';


export class Navigation {

    /**
     * The navigation's invalidation callback. This should usually be setup by the owning renderer and invoke the
     * same callback the renderer has been given by the canvas. This invalidation is required, when continuous
     * rendering is not present, events might cause need for new rendering requests.
     */
    protected _invalidate: Invalidate;

    /** @see {@link camera} */
    protected _camera: Camera;

    /**
     * Currently active metaphor.
     */
    protected _metaphor: Navigation.Metaphor;

    /**
     * Identifies the active camera modifier.
     */
    protected _mode: Navigation.Modes | undefined;

    /**
     * First person camera modifier.
     */
    protected _firstPerson: FirstPersonModifier | undefined;

    /**
     * Trackball camera modifier.
     */
    protected _trackball: TrackballModifier | undefined;

    /**
     * Turntable camera modifier.
     */
    protected _turntable: TurntableModifier | undefined;

    /**
     * Even handler used to forward/map events to specific camera modifiers.
     */
    protected _eventHandler: EventHandler;


    constructor(invalidate: Invalidate, mouseEventProvider: MouseEventProvider) {
        this._invalidate = invalidate;

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

        /* Explicitly use the setter here to create the appropriate modifier. */
        this.metaphor = Navigation.Metaphor.Turntable;
    }


    /**
     * Resolves the event to camera modifier mapping by returning the responsible camera modifier.
     * @param event - Event to retrieve navigation mode for.
     */
    protected mode(event: MouseEvent | TouchEvent | KeyboardEvent): Navigation.Modes | undefined {

        if ((event.type === 'mousedown' || event.type === 'mousemove') && ((event as MouseEvent).buttons & 1)) {
            // Mouse button 1: rotate
            return Navigation.Modes.Rotate;

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


    protected rotate(event: MouseEvent | TouchEvent, start: boolean): void {
        const point = this._eventHandler.offsets(event)[0];

        switch (this._metaphor) {
            case Navigation.Metaphor.FirstPerson:
                const firstPerson = this._firstPerson as FirstPersonModifier;
                start ? firstPerson.initiate(point) : firstPerson.process(point);
                event.preventDefault();
                break;

            case Navigation.Metaphor.Trackball:
                const trackball = this._trackball as TrackballModifier;
                start ? trackball.initiate(point) : trackball.process(point);
                event.preventDefault();
                break;

            case Navigation.Metaphor.Turntable:
                const turntable = this._turntable as TurntableModifier;
                start ? turntable.initiate(point) : turntable.process(point);
                event.preventDefault();
                break;

            default:
                break;
        }
    }


    protected onMouseDown(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        for (const event of latests) {
            this._mode = this.mode(event);

            switch (this._mode) {
                case Navigation.Modes.Zoom:
                    // this.startZoom(event);
                    break;

                case Navigation.Modes.Rotate:
                    this.rotate(event, true);
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

            switch (this._mode) {
                // case Navigation.Modes.Zoom:
                //     // modeWasUndefined ? this.startZoom(event) : this.updateZoom(event);
                //     break;

                case Navigation.Modes.Rotate:
                    this.rotate(event, modeWasUndefined);
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
        if (this._trackball) {
            this._trackball.camera = camera;
        }
        if (this._turntable) {
            this._turntable.camera = camera;
        }
    }

    /**
     * Configure this navigation's metaphor.
     */
    set metaphor(metaphor: Navigation.Metaphor) {
        if (this._metaphor === metaphor) {
            return;
        }

        if (this._metaphor === Navigation.Metaphor.FirstPerson) {
            this._eventHandler.requestPointerLock();
        } else {
            this._eventHandler.exitPointerLock();
        }

        this._firstPerson = undefined;
        this._trackball = undefined;
        this._turntable = undefined;

        this._metaphor = metaphor;
        switch (this._metaphor) {
            case Navigation.Metaphor.FirstPerson:
                this._firstPerson = new FirstPersonModifier();
                this._firstPerson.camera = this._camera;
                break;

            case Navigation.Metaphor.Trackball:
                this._trackball = new TrackballModifier();
                this._trackball.camera = this._camera;
                break;

            case Navigation.Metaphor.Turntable:
                this._turntable = new TurntableModifier();
                this._turntable.camera = this._camera;
                break;

            default:
                break;
        }
        this._invalidate(true);
    }

    get metaphor(): Navigation.Metaphor {
        return this._metaphor;
    }

}


export namespace Navigation {

    /**
     * Navigation modes used for identification of the current navigation intend, which is derived based on the event
     * types or gestures, regardless of the active navigation metaphor and its constraints.
     */
    export enum Modes {
        Move,
        Pan,
        Rotate,
        Zoom,
        ZoomStep,
    }

    /**
     * Navigation metaphors supported by the default navigation implementation.
     */
    export enum Metaphor {
        FirstPerson = 'firstperson',
        Flight = 'flight',
        Trackball = 'trackball',
        Turntable = 'turntable',
    }
}
