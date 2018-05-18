
import { vec2 } from 'gl-matrix';

import { Observable, Subscription } from 'rxjs';

import { assert } from './auxiliaries';

import { MouseEventProvider } from './mouseeventprovider';
import { Invalidate } from './renderer';

/**
 * Callback for handling mouse events, given the latest mouse events (since last update) as well as the previous.
 */
export interface MouseEventHandler { (latests: Array<MouseEvent>, previous: Array<MouseEvent>): void; }

/**
 * ... Provider and event handler are explicitly separated in order to reduce the number of observables (reuse of event
 * provider for multiple handler).
 */
export class EventHandler {

    /**
     * The event handler's invalidation callback. This should usually be setup by the owning renderer and invoke the
     * same callback the renderer has been given by the canvas. This invalidation is required, when continuous
     * rendering is not present, events might cause need for new rendering requests.
     */
    protected _invalidate: Invalidate | undefined;

    protected _subscriptions = new Array<Subscription>();


    /**
     * Assigned key event provider. This is usually created and owned by the canvas.
     */
    // protected _keyEventProvider: KeyEventProvider | undefined;

    /**
     * Assigned mouse event provider. This is usually created and owned by the canvas.
     */
    protected _mouseEventProvider: MouseEventProvider | undefined;

    protected _latestMouseEventsByType =
        new Map<MouseEventProvider.Type, Array<MouseEvent>>();
    protected _previousMouseEventsByType =
        new Map<MouseEventProvider.Type, Array<MouseEvent>>();
    protected _mouseEventHandlerByType =
        new Map<MouseEventProvider.Type, Array<MouseEventHandler>>();

    /**
     * Assigned touch event provider. This is usually created and owned by the canvas.
     */
    // protected _touchEventProvider: TouchEventProvider | undefined;


    constructor(invalidate: Invalidate | undefined, mouseEventProvider: MouseEventProvider | undefined,
        /* keyEventProvider: KeyEventProvider | undefined, touchEventProvider: TouchEventProvider | undefined */) {
        this._invalidate = invalidate;
        this._mouseEventProvider = mouseEventProvider;
    }


    /** @callback Invalidate
     * A callback intended to be invoked whenever the specialized event handler itself is invalid. By default only
     * optional updates (renderer decides whether or not to continue redraw) are triggered.
     */
    protected invalidate(force: boolean = false) {
        if (this._invalidate) {
            this._invalidate(force);
        }
    }


    /**
     * Utility for registering an additional mouse event handler for updates on mouse events of the given type. The
     * handler is to be called on update iff at least a single mouse event of the given type has occurred since last
     * update.
     * @param type - Mouse event type the handler is to be associated with.
     * @param handler - Handler to be called on update.
     */
    protected pushMouseEventHandler(type: MouseEventProvider.Type, handler: MouseEventHandler) {

        if (!this._mouseEventHandlerByType.has(type)) {
            this._mouseEventHandlerByType.set(type, new Array<MouseEventHandler>());

            this._previousMouseEventsByType.set(type, new Array<MouseEvent>());
            const latest = new Array<MouseEvent>();
            this._latestMouseEventsByType.set(type, latest);

            assert(this._mouseEventProvider !== undefined, `expected valid mouse event provider`);
            const observable = (this._mouseEventProvider as MouseEventProvider).observable(type);

            switch (type) {
                case MouseEventProvider.Type.Wheel:
                    this._subscriptions.push((observable as Observable<WheelEvent>).subscribe(
                        (event) => { latest.push(event); this.invalidate(); }));
                    break;
                default:
                    this._subscriptions.push((observable as Observable<MouseEvent>).subscribe(
                        (event) => { latest.push(event); this.invalidate(); }));
                    break;
            }
        }
        (this._mouseEventHandlerByType.get(type) as Array<MouseEventHandler>).push(handler);
    }

    protected invokeMouseEventHandler(type: MouseEventProvider.Type) {
        const handlers = this._mouseEventHandlerByType.get(type);
        if (handlers === undefined || handlers.length === 0) {
            return;
        }
        const latest = this._latestMouseEventsByType.get(type) as Array<MouseEvent>;
        if (latest.length === 0) {
            return;
        }
        const previous = this._previousMouseEventsByType.get(type) as Array<MouseEvent>;
        handlers.forEach((handler) => handler(latest, previous));

        Object.assign(previous, latest);
        latest.length = 0;
    }


    /**
     * Disposes all registered handlers of all event types.
     */
    dispose() {
        this._latestMouseEventsByType.forEach((value) => value.length = 0);
        this._previousMouseEventsByType.forEach((value) => value.length = 0);

        for (const subscription of this._subscriptions) {
            subscription.unsubscribe();
        }
    }

    /**
     * Triggers (by means of a helper function) invocation of all registered handler of all event types.
     */
    update() {
        this.invokeMouseEventHandler(MouseEventProvider.Type.Click);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Enter);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Leave);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Down);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Up);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Move);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Wheel);
    }


    /**
     * Normalize mouse and touch event coordinates for various browsers.
     * @param event - Mouse, wheel, or touch event.
     * @param normalize - Whether or not to compute normalized coordinates (offsets).
     * @returns - Array of normalized x and y offsets (in case of multiple touches).
     */
    offsets(event: MouseEvent | WheelEvent | TouchEvent, normalize: boolean = true): Array<vec2> {
        const offsets = new Array<vec2>();

        if (event instanceof MouseEvent) {
            const e = event as MouseEvent;
            offsets.push(vec2.fromValues(e.clientX, e.clientY));

        } else if (event instanceof WheelEvent) {
            const e = event as WheelEvent;
            offsets.push(vec2.fromValues(e.clientX, e.clientY));

        } else if (event instanceof TouchEvent) {
            const e = event as TouchEvent;
            /* tslint:disable-next-line:prefer-for-of */
            for (let i = 0; i < e.touches.length; ++i) {
                const touch = e.touches[i];
                offsets.push(vec2.fromValues(touch.clientX, touch.clientY));
            }
        }

        const target = event.target || event.currentTarget || event.srcElement;
        const rect = (target as HTMLElement).getBoundingClientRect();

        for (const offset of offsets) {
            offset[0] = Math.floor(offset[0] - rect.left);
            offset[1] = Math.floor(offset[1] - rect.top);
            if (normalize) {
                vec2.scale(offset, offset, window.devicePixelRatio);
            }
        }
        return offsets;
    }


    /**
     * Register a click event handler that is to be called on update iff at least a single click event has
     * occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushClickHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Click, handler);
    }

    /**
     * Register an mouse enter event handler that is to be called on update iff at least a single mouse enter event has
     * occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseEnterHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Enter, handler);
    }

    /**
     * Register an mouse leave event handler that is to be called on update iff at least a single mouse leave event has
     * occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseLeaveHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Leave, handler);
    }

    /**
     * Register an mouse down event handler that is to be called on update iff at least a single mouse down event has
     * occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseDownHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Down, handler);
    }

    /**
     * Register an mouse up event handler that is to be called on update iff at least a single mouse up event has
     * occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseUpHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Up, handler);
    }

    /**
     * Register an mouse move event handler that is to be called on update iff at least a single mouse move event has
     * occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseMoveHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Move, handler);
    }

    /**
     * Register an mouse wheel event handler that is to be called on update iff at least a single mouse wheel event has
     * occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseWheelHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Wheel, handler);
    }

    requestPointerLock(): void {
        if (this._mouseEventProvider) {
            this._mouseEventProvider.pointerLock = true;
        }
    }

    exitPointerLock(): void {
        if (this._mouseEventProvider) {
            this._mouseEventProvider.pointerLock = false;
        }
    }

}
