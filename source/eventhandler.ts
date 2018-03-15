
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { assert } from './auxiliaries';

// import { Camera } from './camera';

import { MouseEventProvider } from './mouseeventprovider';
import { Invalidate } from './renderer';


export interface MouseEventHandler { (latests: Array<MouseEvent>, previous: Array<MouseEvent>): void; }


export class EventHandler {

    /**
     * The event handler's invalidation callback. This should usually be setup by the owning renderer and invoke the
     * same callback the renderer has been given by the canvas. This invalidation is required, when continuous
     * rendering is not present, events might cause need for new rendering requests.
     */
    protected _invalidate: Invalidate | undefined;

    protected _subscriptions = new Array<Subscription>();


    protected _mouseEventProvider: MouseEventProvider | undefined;

    protected _latestMouseEventsByType =
        new Map<MouseEventProvider.Type, Array<MouseEvent>>();
    protected _previousMouseEventsByType =
        new Map<MouseEventProvider.Type, Array<MouseEvent>>();
    protected _mouseEventHandlerByType =
        new Map<MouseEventProvider.Type, Array<MouseEventHandler>>();


    constructor(invalidate: Invalidate | undefined, mouseEventProvider: MouseEventProvider | undefined,
        /* keyEventProvider: KeyEventProvider | undefined, touchEventProvider: TouchEventProvider | undefined */) {
        this._invalidate = invalidate;
        this._mouseEventProvider = mouseEventProvider;
    }


    /** @callback Invalidate
     * A callback intended to be invoked whenever the specialized event handler itself is invalid.
     */
    protected invalidate() {
        if (this._invalidate) {
            this._invalidate();
        }
    }


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


    dispose() {

        this._latestMouseEventsByType.forEach((value) => value.length = 0);
        this._previousMouseEventsByType.forEach((value) => value.length = 0);

        for (const subscription of this._subscriptions) {
            subscription.unsubscribe();
        }
    }


    update() {
        this.invokeMouseEventHandler(MouseEventProvider.Type.Enter);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Leave);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Down);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Up);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Move);
        this.invokeMouseEventHandler(MouseEventProvider.Type.Wheel);
    }


    /**
     * Register an mouse enter event handler that is to be called on update if and only if at least a single
     * mouse enter event has occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseEnterHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Enter, handler);
    }

    /**
     * Register an mouse leave event handler that is to be called on update if and only if at least a single
     * mouse leave event has occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseLeaveHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Leave, handler);
    }

    /**
     * Register an mouse down event handler that is to be called on update if and only if at least a single
     * mouse down event has occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseDownHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Down, handler);
    }

    /**
     * Register an mouse up event handler that is to be called on update if and only if at least a single
     * mouse up event has occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseUpHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Up, handler);
    }

    /**
     * Register an mouse move event handler that is to be called on update if and only if at least a single
     * mouse move event has occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseMoveHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Move, handler);
    }

    /**
     * Register an mouse wheel event handler that is to be called on update if and only if at least a single
     * mouse wheel event has occurred since last update.
     * @param handler - Handler to be called on update.
     */
    pushMouseWheelHandler(handler: MouseEventHandler) {
        this.pushMouseEventHandler(MouseEventProvider.Type.Wheel, handler);
    }

}
