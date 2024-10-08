
/* spellchecker: disable */

import { Observable, ReplaySubject } from 'rxjs';

import { auxiliaries } from './auxiliaries';
import { IS_EDGE, IS_IE11 } from './msagent';

import { PointerLock } from './pointerlock';

/* spellchecker: enable */


export class PointerEventProvider {

    /**
     * HTML canvas element within the HTML5 document to register event listeners to.
     */
    protected _element: HTMLCanvasElement;

    /**
     * Time frame for events to be buffered (windowTime in rxjs per ReplaySubject).
     */
    protected _timeframe: number | undefined;

    protected _enterListener: { (event: PointerEvent): void };
    protected _enterSubject: ReplaySubject<PointerEvent>;
    protected _leaveListener: { (event: PointerEvent): void };
    protected _leaveSubject: ReplaySubject<PointerEvent>;

    protected _cancelListener: { (event: PointerEvent): void };
    protected _cancelSubject: ReplaySubject<PointerEvent>;

    protected _downListener: { (event: PointerEvent): void };
    protected _downSubject: ReplaySubject<PointerEvent>;
    protected _upListener: { (event: PointerEvent): void };
    protected _upSubject: ReplaySubject<PointerEvent>;

    protected _moveListener: { (event: PointerEvent): void };
    protected _moveSubject: ReplaySubject<PointerEvent>;


    /** @see {@link pointerLock} */
    protected _pointerLockRequestPending = false;

    /**
     * This mask saves for which types of events, event.preventDefault should be called. This is useful to disallow
     * some kinds of standard events like scrolling or clicking on links.
     */
    protected _preventDefaultMask: PointerEventProvider.Type;

    constructor(element: HTMLCanvasElement, timeframe?: number) {
        auxiliaries.assert(element !== undefined, `expected valid canvas element on initialization, given ${element}`);
        this._element = element;
        this._timeframe = timeframe;

        this._element.addEventListener('click', () => this.processPointerLockRequests());

        /* Prevent unintentional drag content detection by Microsoft Edge/IE11, e.g., when processing mouse move events
        during mouse down and up. */
        if (IS_EDGE || IS_IE11) {
            this._element.addEventListener('dragstart', (event: DragEvent) => event.preventDefault());
        }
    }

    /**
     * The pointer lock API requires a little workaround in order to avoid something like '... not called from inside a
     * short running user-generated event handler'. A click event listener is registered and whenever a pointer lock is
     * requested, e.g., from an event handler (which in turn exposes this interface to, e.g., a navigation), the next
     * click will result in a probably more successful pointer lock.
     */
    protected processPointerLockRequests(): void {
        if (!this._pointerLockRequestPending) {
            return;
        }
        PointerLock.request(this._element);
    }

    /**
     * Checks whether or not to prevent the default handling of the given event. This depends on the internal
     * `preventDefaultMask` which can be modified using `preventDefault` function @see{@link preventDefault}.
     * @param type - Internal event type of the incoming event.
     * @param event - Actual event to prevent default handling on (if masked).
     */
    protected preventDefaultOnEvent(type: PointerEventProvider.Type, event: PointerEvent): void {
        if (auxiliaries.bitInBitfield(this._preventDefaultMask, type)) {
            event.preventDefault();
        }
    }

    /**
     * Prevent default event handling on specific event types (using preventDefault on the event).
     * @param types - Event types to prevent default handling on.
     */
    preventDefault(...types: PointerEventProvider.Type[]): void {
        for (const type of types) {
            if (!auxiliaries.bitInBitfield(this._preventDefaultMask, type)) {
                this._preventDefaultMask |= type;
            }
        }
    }

    /**
     * Allow default event handling on specific event types (not calling preventDefault on the event).
     * @param types - Event types to allow default handling on.
     */
    allowDefault(...types: PointerEventProvider.Type[]): void {
        for (const type of types) {
            if (auxiliaries.bitInBitfield(this._preventDefaultMask, type)) {
                this._preventDefaultMask &= ~type;
            }
        }
    }

    observable(type: PointerEventProvider.Type): Observable<PointerEvent> | undefined {
        switch (type) {
            case PointerEventProvider.Type.Enter:
                return this.enter$;
            case PointerEventProvider.Type.Leave:
                return this.leave$;
            case PointerEventProvider.Type.Down:
                return this.down$;
            case PointerEventProvider.Type.Up:
                return this.up$;
            case PointerEventProvider.Type.Move:
                return this.move$;
            case PointerEventProvider.Type.Cancel:
                return this.cancel$;

            default:
                return undefined;
        }
    }

    /**
     * Enable/disable pointer lock on click. If true, the next click on this event provider's canvas will invoke a
     * pointer lock request on the canvas element.
     */
    set pointerLock(lock: boolean) {
        this._pointerLockRequestPending = lock;
        if (lock === false) {
            this._pointerLockRequestPending = false;
            PointerLock.exit();
        }
    }
    get pointerLock(): boolean {
        return PointerLock.active(this._element);
    }

    get enter$(): Observable<PointerEvent> {
        if (this._enterSubject === undefined) {
            this._enterSubject = new ReplaySubject<PointerEvent>(undefined, this._timeframe);
            this._enterListener = (event: PointerEvent) => {
                this.preventDefaultOnEvent(PointerEventProvider.Type.Enter, event);
                this._enterSubject.next(event);
            };
            this._element.addEventListener('pointerenter', this._enterListener);
        }
        return this._enterSubject.asObservable();
    }

    get leave$(): Observable<PointerEvent> {
        if (this._leaveSubject === undefined) {
            this._leaveSubject = new ReplaySubject<PointerEvent>(undefined, this._timeframe);
            this._leaveListener = (event: PointerEvent) => {
                this.preventDefaultOnEvent(PointerEventProvider.Type.Leave, event);
                this._leaveSubject.next(event);
            };
            this._element.addEventListener('pointerleave', this._leaveListener);
        }
        return this._leaveSubject.asObservable();
    }

    get down$(): Observable<PointerEvent> {
        if (this._downSubject === undefined) {
            this._downSubject = new ReplaySubject<PointerEvent>(undefined, this._timeframe);
            this._downListener = (event: PointerEvent) => {
                this.preventDefaultOnEvent(PointerEventProvider.Type.Down, event);
                this._downSubject.next(event);
            };
            this._element.addEventListener('pointerdown', this._downListener);
        }
        return this._downSubject.asObservable();
    }

    get up$(): Observable<PointerEvent> {
        if (this._upSubject === undefined) {
            this._upSubject = new ReplaySubject<PointerEvent>(undefined, this._timeframe);
            this._upListener = (event: PointerEvent) => {
                this.preventDefaultOnEvent(PointerEventProvider.Type.Up, event);
                this._upSubject.next(event);
            };
            this._element.addEventListener('pointerup', this._upListener);
        }
        return this._upSubject.asObservable();
    }

    get move$(): Observable<PointerEvent> {
        if (this._moveSubject === undefined) {
            this._moveSubject = new ReplaySubject<PointerEvent>(undefined, this._timeframe);
            this._moveListener = (event: PointerEvent) => {
                this.preventDefaultOnEvent(PointerEventProvider.Type.Move, event);
                this._moveSubject.next(event);
            };
            this._element.addEventListener('pointermove', this._moveListener);
        }
        return this._moveSubject.asObservable();
    }

    get cancel$(): Observable<PointerEvent> {
        if (this._cancelSubject === undefined) {
            this._cancelSubject = new ReplaySubject<PointerEvent>(undefined, this._timeframe);
            this._cancelListener = (event: PointerEvent) => {
                this.preventDefaultOnEvent(PointerEventProvider.Type.Cancel, event);
                this._cancelSubject.next(event);
            };
            this._element.addEventListener('pointercancel', this._cancelListener);
        }
        return this._cancelSubject.asObservable();
    }

}


export namespace PointerEventProvider {

    export enum Type {
        Enter = 1 << 0,
        Leave = 1 << 1,
        Move = 1 << 2,
        Down = 1 << 3,
        Up = 1 << 4,
        Cancel = 1 << 5,
    }

}
