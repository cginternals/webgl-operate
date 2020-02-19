
/* spellchecker: disable */

import { vec2 } from 'gl-matrix';

import { Camera } from './camera';
import { EventHandler } from './eventhandler';
import { MouseEventProvider } from './mouseeventprovider';
import { PointerLock } from './pointerlock';
import { Invalidate } from './renderer';

import { FirstPersonModifier } from './firstpersonmodifier';
import { PointerEventProvider } from './pointereventprovider';
import { TouchEventProvider } from './toucheventprovider';
import { TrackballModifier } from './trackballmodifier';
import { TurntableModifier } from './turntablemodifier';
import { auxiliaries } from './webgl-operate.slim';
import { PanModifier } from './panmodifier';

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
    protected _metaphor: Navigation.Metaphor;

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
    protected _pan: PanModifier | undefined;

    /**
     * Even handler used to forward/map events to specific camera modifiers.
     */
    protected _eventHandler: EventHandler;

    /**
     * This keeps track of all pointers that are currently interacting with the canvas.
     * It maps from pointer id to the currecnt position.
     */
    protected _activePointers: Map<number, vec2>;


    constructor(
        invalidate: Invalidate,
        mouseEventProvider: MouseEventProvider,
        touchEventProvider?: TouchEventProvider,
        pointerEventProvider?: PointerEventProvider) {

        this._invalidate = invalidate;

        /* Create event handler that listens to mouse events. */
        this._eventHandler = new EventHandler(invalidate, mouseEventProvider, touchEventProvider, pointerEventProvider);

        // /* Listen to mouse events. */
        // this._eventHandler.pushMouseDownHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
        //     this.onMouseDown(latests, previous));
        // this._eventHandler.pushMouseUpHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
        //     this.onMouseUp(latests, previous));
        // this._eventHandler.pushMouseMoveHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
        //     this.onMouseMove(latests, previous));

        // this._eventHandler.pushClickHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
        //     this.onClick(latests, previous));

        // /* Listen to touch events. */
        // if (touchEventProvider !== undefined) {
        //     this._eventHandler.pushTouchStartHandler((latests: Array<TouchEvent>, previous: Array<TouchEvent>) =>
        //         this.onTouchStart(latests, previous));
        //     this._eventHandler.pushTouchEndHandler((latests: Array<TouchEvent>, previous: Array<TouchEvent>) =>
        //         this.onTouchEnd(latests, previous));
        //     this._eventHandler.pushTouchMoveHandler((latests: Array<TouchEvent>, previous: Array<TouchEvent>) =>
        //         this.onTouchMove(latests, previous));
        // }

        /* Listen to pointer events. */
        if (pointerEventProvider !== undefined) {
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
        }

        // this._eventHandler.pushMouseWheelHandler((latests: Array<WheelEvent>, previous: Array<WheelEvent>) =>
        //     this.onWheel(latests, previous));

        /* Explicitly use the setter here to create the appropriate modifier. */
        this.metaphor = Navigation.Metaphor.Turntable;

        this._activePointers = new Map();
    }


    /**
     * Resolves the event to camera modifier mapping by returning the responsible camera modifier.
     * @param event - Event to retrieve navigation mode for.
     */
    protected mode(event: /* MouseEvent | TouchEvent | */ PointerEvent | KeyboardEvent): Navigation.Modes | undefined {

        const isMouseEvent = (event as PointerEvent).pointerType === 'mouse';
        const isTouchEvent = (event as PointerEvent).pointerType === 'touch' ||
            (event as PointerEvent).pointerType === 'pen';

        const isPrimaryButtonDown = (event as PointerEvent).buttons & 1;
        const isSecondaryButtonDown = (event as PointerEvent).buttons & 2;
        // const isMouseDown = event.type === 'mousedown';
        // const isMouseMove = event.type === 'mousemove';

        // const touchEvent = event as TouchEvent;
        // let isTouchEvent = false;
        // if (touchEvent !== undefined) {
        //     isTouchEvent = touchEvent.touches !== undefined && touchEvent.touches.length > 0;
        // }

        const isPointerLockedRotate = PointerLock.active() && this._alwaysRotateOnMove;
        const numPointers = this._activePointers.size;

        const isMouseRotate = isMouseEvent && isPrimaryButtonDown && numPointers === 1;
        const isTouchRotate = isTouchEvent && numPointers === 1;

        const isMousePan = isMouseEvent && isSecondaryButtonDown && numPointers === 1;
        const isTouchPan = isTouchEvent && numPointers === 2;

        console.log(numPointers);

        if (isPointerLockedRotate || isMouseRotate || isTouchRotate) {
            return Navigation.Modes.Rotate;
        } else if (isMousePan || isTouchPan) {
            return Navigation.Modes.Pan;
        }
        return undefined;
    }

    protected rotate(event: PointerEvent, start: boolean): void {
        const point = this._eventHandler.offsets(event)[0];

        switch (this._metaphor) {
            case Navigation.Metaphor.FirstPerson:
                const firstPerson = this._firstPerson as FirstPersonModifier;
                let movement: vec2 | undefined;
                if (PointerLock.active() && event instanceof MouseEvent) {
                    movement = vec2.fromValues((event as MouseEvent).movementX, (event as MouseEvent).movementY);
                }
                start ? firstPerson.initiate(point) : firstPerson.process(point, movement);
                if (event.cancelable) {
                    event.preventDefault();
                }
                break;

            case Navigation.Metaphor.Trackball:
                const trackball = this._trackball as TrackballModifier;
                start ? trackball.initiate(point) : trackball.process(point);
                if (event.cancelable) {
                    event.preventDefault();
                }
                break;

            case Navigation.Metaphor.Turntable:
                const turntable = this._turntable as TurntableModifier;
                start ? turntable.initiate(point) : turntable.process(point);
                if (event.cancelable) {
                    event.preventDefault();
                }
                break;

            default:
                break;
        }
    }

    protected pan(event: PointerEvent, start: boolean): void {
        const point = this._eventHandler.offsets(event)[0];

        const pan = this._pan as PanModifier;
        start ? pan.initiate(point) : pan.process(point);

        if (event.cancelable) {
            event.preventDefault();
        }
    }

    // protected onMouseDown(latests: Array<MouseEvent>, previous: Array<MouseEvent>): void {
    //     const event: MouseEvent = latests[latests.length - 1];
    //     // for (const event of latests) {

    //     this._mode = this.mode(event);
    //     switch (this._mode) {
    //         case Navigation.Modes.Zoom:
    //             // this.startZoom(event);
    //             break;

    //         case Navigation.Modes.Rotate:
    //             this.rotate(event, true);
    //             break;

    //         default:
    //             break;
    //         // }
    //     }
    // }

    // protected onTouchStart(latests: Array<TouchEvent>, previous: Array<TouchEvent>): void {
    //     const event: TouchEvent = latests[latests.length - 1];
    //     // for (const event of latests) {

    //     this._mode = this.mode(event);
    //     switch (this._mode) {
    //         case Navigation.Modes.Zoom:
    //             // this.startZoom(event);
    //             break;

    //         case Navigation.Modes.Rotate:
    //             this.rotate(event, true);
    //             break;

    //         default:
    //             break;
    //         // }
    //     }
    // }

    // protected onMouseUp(latests: Array<MouseEvent>, previous: Array<MouseEvent>): void {
    //     const event: MouseEvent = latests[latests.length - 1];

    //     // for (const event of latests) {
    //     if (undefined === this._mode) {
    //         return;
    //     }

    //     if (event.cancelable) {
    //         event.preventDefault();
    //     }

    //     // }
    // }

    // protected onTouchEnd(latests: Array<TouchEvent>, previous: Array<TouchEvent>): void {
    //     const event: TouchEvent = latests[latests.length - 1];

    //     // for (const event of latests) {
    //     if (undefined === this._mode) {
    //         return;
    //     }

    //     if (event.cancelable) {
    //         event.preventDefault();
    //     }

    //     // }
    // }

    // protected onMouseMove(latests: Array<MouseEvent>, previous: Array<MouseEvent>): void {
    //     const event: MouseEvent = latests[latests.length - 1];
    //     // for (const event of latests) {

    //     const modeWasUndefined = (this._mode === undefined);
    //     this._mode = this.mode(event);
    //     switch (this._mode) {
    //         // case Navigation.Modes.Zoom:
    //         //     // modeWasUndefined ? this.startZoom(event) : this.updateZoom(event);
    //         //     break;

    //         case Navigation.Modes.Rotate:
    //             this.rotate(event, modeWasUndefined);
    //             break;

    //         default:
    //             break;
    //         // }
    //     }
    // }

    // protected onTouchMove(latests: Array<TouchEvent>, previous: Array<TouchEvent>): void {
    //     const event: TouchEvent = latests[latests.length - 1];
    //     // for (const event of latests) {

    //     const modeWasUndefined = (this._mode === undefined);
    //     this._mode = this.mode(event);
    //     switch (this._mode) {
    //         // case Navigation.Modes.Zoom:
    //         //     // modeWasUndefined ? this.startZoom(event) : this.updateZoom(event);
    //         //     break;

    //         case Navigation.Modes.Rotate:
    //             this.rotate(event, modeWasUndefined);
    //             break;

    //         default:
    //             break;
    //         // }
    //     }
    // }

    // protected onClick(latests: Array<MouseEvent>, previous: Array<MouseEvent>): void {
    //     // const event: MouseEvent = latests[latests.length - 1];
    // }

    protected onPointerDown(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        let primaryEvent: PointerEvent | undefined;

        for (const pointer of latests) {
            if (pointer.isPrimary) {
                primaryEvent = pointer;
            }
            this._activePointers.set(pointer.pointerId, vec2.fromValues(pointer.clientX, pointer.clientY));

            console.log('down: ' + pointer.pointerId);
        }

        if (primaryEvent === undefined) {
            auxiliaries.log(auxiliaries.LogLevel.Error, `No primary event was detected.`);
            return;
        }

        this._mode = this.mode(primaryEvent);
        switch (this._mode) {
            case Navigation.Modes.Zoom:
                // this.startZoom(event);
                break;

            case Navigation.Modes.Rotate:
                this.rotate(primaryEvent, true);
                break;

            case Navigation.Modes.Pan:
                this.pan(primaryEvent, true);
                break;

            default:
                break;
        }
    }

    protected onPointerUp(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        for (const pointer of latests) {
            this._activePointers.delete(pointer.pointerId);

            console.log('up: ' + pointer.pointerId);
        }
    }

    protected onPointerEnter(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void { }

    protected onPointerLeave(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        for (const pointer of latests) {
            this._activePointers.delete(pointer.pointerId);

            console.log('leave: ' + pointer.pointerId);
        }
    }

    protected onPointerCancel(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        for (const pointer of latests) {
            this._activePointers.delete(pointer.pointerId);

            console.log('cancel: ' + pointer.pointerId);
        }
    }

    protected onPointerMove(latests: Array<PointerEvent>, previous: Array<PointerEvent>): void {
        let primaryEvent: PointerEvent | undefined;

        for (const pointer of latests) {
            if (pointer.isPrimary) {
                primaryEvent = pointer;
            }
            this._activePointers.set(pointer.pointerId, vec2.fromValues(pointer.clientX, pointer.clientY));
        }

        if (primaryEvent === undefined) {
            auxiliaries.log(auxiliaries.LogLevel.Error, `No primary event was detected.`);
            return;
        }

        const modeWasUndefined = (this._mode === undefined);
        this._mode = this.mode(primaryEvent);
        switch (this._mode) {
            case Navigation.Modes.Rotate:
                this.rotate(primaryEvent, modeWasUndefined);
                break;

            case Navigation.Modes.Pan:
                this.pan(primaryEvent, modeWasUndefined);
                break;

            default:
                break;
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
        if (this._firstPerson) {
            this._firstPerson.camera = camera;
        }
        if (this._trackball) {
            this._trackball.camera = camera;
        }
        if (this._turntable) {
            this._turntable.camera = camera;
        }
        if (this._pan) {
            this._pan.camera = camera;
        }
    }

    /**
     * Configure this navigation's metaphor.
     */
    set metaphor(metaphor: Navigation.Metaphor) {
        if (this._metaphor === metaphor) {
            return;
        }

        this._firstPerson = undefined;
        this._trackball = undefined;
        this._turntable = undefined;

        this._eventHandler.exitPointerLock(); /* Might be requested (and active) from FirstPerson or Flight. */
        this._alwaysRotateOnMove = false;

        this._pan = new PanModifier();

        this._metaphor = metaphor;
        switch (this._metaphor) {
            case Navigation.Metaphor.FirstPerson:

                this._eventHandler.requestPointerLock();
                this._alwaysRotateOnMove = true;

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
