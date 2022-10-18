
/* spellchecker: disable */

import { vec2 } from 'gl-matrix';

import { Camera } from './camera';
import { EventHandler } from './eventhandler';
import { PointerLock } from './pointerlock';
import { Invalidate } from './renderer';

import { log, LogLevel } from './auxiliaries';
import { FirstPersonModifier } from './firstpersonmodifier';
import { PanModifier } from './panmodifier';
import { PinchZoomModifier } from './pinchzoommodifier';
import { TrackballModifier } from './trackballmodifier';
import { TurntableModifier } from './turntablemodifier';
import { EventProvider } from './eventhandler'
import { WheelZoomModifier } from './wheelzoommodifier';

/* spellchecker: enable */


/**
 * This navigation is merely a design template/recipe for more refined, specialized navigation and provides some basic,
 * commonly used camera modifier such as turntable, first-person, as well as trackball. This implementation is also
 * unfinished and will be continued as soon as possible (e.g., first-person navigation is not usable for now).
 * @todo - Refine and comment this class to be usable at least as common/most-basic navigation auxiliary.
 */
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
    protected _rotationMetaphor: RotationMetaphorState;

    /**
     * Identifies the active camera modifier.
     */
    protected _mode: Navigation.Modes | undefined;

    /**
     * Specifies, whether or not rotation mode should be invoked on any move event, regardless of buttons.
     */
    protected _alwaysRotateOnMove = false;

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
     * Pan camera modifier.
     */
    protected _pan: PanModifier;

    /**
     * Pinch camera modifier.
     */
    protected _pinch: PinchZoomModifier;

    /**
     * Wheel zoom modifier.
     */
    protected _wheelZoom: WheelZoomModifier;

    /**
     * Even handler used to forward/map events to specific camera modifiers.
     */
    protected _eventHandler: EventHandler;

    /**
     * This keeps track of all events that are currently interacting with the canvas.
     * It maps from pointer id to the currecnt position.
     */
    protected _activeEvents: Map<number, PointerEvent>;

    /**
     * Keep track of the latest interaction in order to allow a cooldown before the next
     * interaction is allowed.
     */
    protected _lastInteractionTime: number;

    constructor(
        invalidate: Invalidate,
        eventProvider: EventProvider) {

        this._invalidate = invalidate;

        /* Create event handler that listens to mouse events. */
        this._eventHandler = new EventHandler(invalidate, eventProvider);

        /* Listen to pointer events. */
        this._eventHandler.pushPointerDownHandler((latests: Array<PointerEvent>, previous: Array<PointerEvent>) =>
            this.onPointerDown(latests, previous));
        this._eventHandler.pushPointerUpHandler((latests: Array<PointerEvent>, previous: Array<PointerEvent>) =>
            this.onPointerUp(latests, previous));
        this._eventHandler.pushPointerEnterHandler((latests: Array<PointerEvent>, previous: Array<PointerEvent>) =>
            this.onPointerEnter(latests, previous));
        this._eventHandler.pushPointerLeaveHandler((latests: Array<PointerEvent>, previous: Array<PointerEvent>) =>
            this.onPointerLeave(latests, previous));
        this._eventHandler.pushPointerMoveHandler((latests: Array<PointerEvent>, previous: Array<PointerEvent>) =>
            this.onPointerMove(latests, previous));
        this._eventHandler.pushPointerCancelHandler((latests: Array<PointerEvent>, previous: Array<PointerEvent>) =>
            this.onPointerCancel(latests, previous));

        this._eventHandler.pushMouseWheelHandler((latests: Array<WheelEvent>, previous: Array<WheelEvent>) =>
            this.onWheel(latests, previous));

        /* Explicitly use the setter here to create the appropriate modifier. */
        this.rotationMetaphor = Navigation.RotationMetaphor.Turntable;

        this._pan = new PanModifier();
        this._pinch = new PinchZoomModifier();
        this._wheelZoom = new WheelZoomModifier();

        this._activeEvents = new Map();
    }


    /**
     * Resolves the event to camera modifier mapping by returning the responsible camera modifier.
     * @param event - Event to retrieve navigation mode for.
     */
    protected mode(): Navigation.Modes | undefined {

        const events = Array.from(this._activeEvents.values());
        const primaryEvent = this.getPrimaryEvent(events);

        if (primaryEvent === undefined) {
            log(LogLevel.Warning, 'No primary pointer event detected in Navigation::mode.');
            return;
        }

        const isMouseEvent = primaryEvent.pointerType === 'mouse';
        const isTouchEvent = primaryEvent.pointerType === 'touch' || primaryEvent.pointerType === 'pen';

        const isPrimaryButtonDown = primaryEvent.buttons & 1;
        const isShiftKeyDown = primaryEvent.shiftKey;

        // const touchEvent = event as TouchEvent;
        // let isTouchEvent = false;
        // if (touchEvent !== undefined) {
        //     isTouchEvent = touchEvent.touches !== undefined && touchEvent.touches.length > 0;
        // }

        const isPointerLockedRotate = PointerLock.active() && this._alwaysRotateOnMove;
        const numPointers = this._activeEvents.size;

        const isMouseRotate = isMouseEvent && isPrimaryButtonDown && numPointers === 1;
        const isTouchRotate = isTouchEvent && numPointers === 1;

        const isMousePan = isMouseEvent && isPrimaryButtonDown && isShiftKeyDown && numPointers === 1;
        const isMultiTouch = isTouchEvent && numPointers === 2;

        if (isPointerLockedRotate) {
            return Navigation.Modes.Rotate;
        }

        if (isMousePan) {
            return Navigation.Modes.Pan;
        } else if (isMultiTouch) {
            return Navigation.Modes.MultiTouch;
        } else if (isMouseRotate || isTouchRotate) {
            return Navigation.Modes.Rotate;
        }
        return undefined;
    }

    protected resolveMultiTouch(): Navigation.Modes | undefined {
        if (this._activeEvents.size < 2) {
            log(LogLevel.Warning,
                'MultiTouch resolution was canceled because less than two touches were detected.');
            return undefined;
        }

        const events = Array.from(this._activeEvents.values());
        const direction1 = vec2.fromValues(events[0].movementX, events[0].movementY);
        const direction2 = vec2.fromValues(events[1].movementX, events[1].movementY);

        if (vec2.length(direction1) === 0 || vec2.length(direction2) === 0) {
            return Navigation.Modes.Zoom;
        }

        vec2.normalize(direction1, direction1);
        vec2.normalize(direction2, direction2);
        const cosAngle = vec2.dot(direction1, direction2);

        const panThreshold = 0.2;
        if (cosAngle > panThreshold) {
            return Navigation.Modes.Pan;
        }
        return Navigation.Modes.Zoom;
    }

    protected rotate(start: boolean): void {
        if (this._activeEvents.size !== 1) {
            log(LogLevel.Info,
                'Rotate event was canceled because less or more than two pointers were detected.');
            return;
        }
        const events = Array.from(this._activeEvents.values());
        const point = this._eventHandler.offsets(events[0])[0];

        this._rotationMetaphor.rotate(events[0], start, point);
    }

    protected pan(start: boolean): void {
        const events = Array.from(this._activeEvents.values());
        const event = this.getPrimaryEvent(events);

        if (event === undefined) {
            log(LogLevel.Warning,
                'Pan event was canceled because no primary event was detected.');
            return;
        }

        const point = this._eventHandler.offsets(event)[0];

        const pan = this._pan as PanModifier;
        start ? pan.initiate(point) : pan.process(point);
    }

    protected pinch(start: boolean): void {
        if (this._activeEvents.size !== 2) {
            log(LogLevel.Info,
                'Pinch event was canceled because less or more than two pointers were detected.');
            return;
        }
        const events = Array.from(this._activeEvents.values());
        const point1 = this._eventHandler.offsets(events[0])[0];
        const point2 = this._eventHandler.offsets(events[1])[0];

        const pinch = this._pinch as PinchZoomModifier;
        start ? pinch.initiate(point1, point2) : pinch.process(point1, point2);
    }

    protected getPrimaryEvent(events: Array<PointerEvent>): PointerEvent | undefined {
        for (const event of events) {
            if (event.isPrimary) {
                return event;
            }
        }

        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onPointerDown(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        for (const event of latests) {
            this._activeEvents.set(event.pointerId, event);
        }

        this._mode = this.mode();
        switch (this._mode) {
            case Navigation.Modes.Rotate:
                this.rotate(true);
                break;

            case Navigation.Modes.Pan:
                this.pan(true);
                break;

            case Navigation.Modes.Zoom:
                this.pinch(true);
                break;

            default:
                break;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onPointerUp(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        for (const pointer of latests) {
            this._activeEvents.delete(pointer.pointerId);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    protected onPointerEnter(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void { }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onPointerLeave(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        for (const pointer of latests) {
            this._activeEvents.delete(pointer.pointerId);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onPointerCancel(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        for (const pointer of latests) {
            this._activeEvents.delete(pointer.pointerId);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onPointerMove(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {

        for (const event of latests) {
            this._activeEvents.set(event.pointerId, event);
        }

        if (this._mode === undefined) {
            return;
        }

        const events = Array.from(this._activeEvents.values());
        const primaryEvent = this.getPrimaryEvent(events);

        /**
         * Update the mode for every movement when using a mouse. This is necessary since mouse events do not trigger
         * 'pointerup' events, so we need to figure out when the primary button is released manually
         */
        if (primaryEvent && primaryEvent.pointerType === 'mouse') {
            this._mode = this.mode();
        }

        /**
         * Handle the case where this is the first movement of a multi-touch gesture. We need to find out which
         * kind of gesture is executed.
         */
        let modeUpdated = false;
        if (this._mode === Navigation.Modes.MultiTouch) {
            this._mode = this.resolveMultiTouch();
            modeUpdated = true;
        }

        switch (this._mode) {
            case Navigation.Modes.Rotate:
                this.rotate(modeUpdated);
                break;

            case Navigation.Modes.Pan:
                this.pan(modeUpdated);
                break;

            case Navigation.Modes.Zoom:
                this.pinch(modeUpdated);
                break;

            default:
                break;
        }

        this._lastInteractionTime = performance.now();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onWheel(latests: Array<WheelEvent>, previous: Array<WheelEvent>): void {
        const event = latests[0];
        this._wheelZoom.process(event.deltaY);
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

        this._rotationMetaphor.camera = camera;

        if (this._pan) {
            this._pan.camera = camera;
        }
        if (this._pinch) {
            this._pinch.camera = camera;
        }
        if (this._wheelZoom) {
            this._wheelZoom.camera = camera;
        }
    }

    /**
     * Configure this navigation's metaphor.
     */
    set rotationMetaphor(metaphor: Navigation.RotationMetaphor) {
        if (this._rotationMetaphor.rotationMetaphor! === metaphor) {
            return;
        }

        this._firstPerson = undefined;
        this._trackball = undefined;
        this._turntable = undefined;

        this._eventHandler.exitPointerLock(); /* Might be requested (and active) from FirstPerson or Flight. */
        this._alwaysRotateOnMove = false;

        switch (metaphor) {
            case Navigation.RotationMetaphor.FirstPerson:
                this._rotationMetaphor = new FirstPersonRotationMetaphor(this);
                break;

            case Navigation.RotationMetaphor.Trackball:
                this._rotationMetaphor = new TrackballRotationMetaphor(this);
                break;

            case Navigation.RotationMetaphor.Turntable:
                this._rotationMetaphor = new TurntableRotationMetaphor(this);
                break;

            default:
                break;
        }

        this._invalidate(true);
    }

    get rotationMetaphor(): Navigation.RotationMetaphor {
        return this._rotationMetaphor.rotationMetaphor;
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
        /**
         * MultiTouch is used when interaction with two fingers was initiated but it is not clear yet what
         * interaction the user intends
         */
        MultiTouch,
        Rotate,
        Zoom,
        ZoomStep,
    }

    /**
     * Navigation metaphors supported by the default navigation implementation.
     */
    export enum RotationMetaphor {
        FirstPerson = 'firstperson',
        Flight = 'flight',
        Trackball = 'trackball',
        Turntable = 'turntable',
    }
}

abstract class RotationMetaphorState {
    get rotationMetaphor(): Navigation.RotationMetaphor | undefined {
        return undefined;
    }
    abstract rotate(event: Event, start: boolean, point: vec2): void;
};

class FirstPersonRotationMetaphor extends RotationMetaphorState {
    protected _camera: Camera;
    protected _modifier: FirstPersonModifier;

    get rotationMetaphor() {
        return Navigation.RotationMetaphor.FirstPerson;
    }

    constructor(navigation: Navigation) {
        super();

        this._modifier = new FirstPersonModifier();

        navigation._eventHandler.requestPointerLock();
        navigation._alwaysRotateOnMove = true;

        this._camera = navigation.camera;
    }

    rotate(event: Event, start: boolean, point: vec2) {
        let movement: vec2 | undefined;
        if (PointerLock.active() && event instanceof MouseEvent) {
            movement = vec2.fromValues((event as MouseEvent).movementX, (event as MouseEvent).movementY);
        }
        start ? this._modifier.initiate(point) : this._modifier.process(point, movement);
    }
};

class TrackballRotationMetaphor extends RotationMetaphorState {
    protected _camera: Camera;
    protected _modifier: TrackballModifier;

    constructor(navigation: Navigation) {
        super();

        this._modifier = new TrackballModifier();
        this._camera = navigation.camera;
    }

    get rotationMetaphor() {
        return Navigation.RotationMetaphor.Trackball;
    }

    rotate(event: Event, start: boolean, point: vec2) {
        start ? this._modifier.initiate(point) : this._modifier.process(point);
    }

};

class TurntableRotationMetaphor extends RotationMetaphorState {
    protected _camera: Camera;
    protected _modifier: TurntableModifier;

    constructor(navigation: Navigation) {
        super();

        this._modifier = new TurntableModifier();
        this._camera = navigation.camera;
    }

    get rotationMetaphor() {
        return Navigation.RotationMetaphor.Turntable;
    }

    rotate(event: Event, start: boolean, point: vec2) {
        start ? this._modifier.initiate(point) : this._modifier.process(point);
    }
};

