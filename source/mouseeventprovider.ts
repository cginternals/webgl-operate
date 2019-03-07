
/* spellchecker: disable */

import { Observable, ReplaySubject } from 'rxjs';

import { assert, bitInBitfield } from './auxiliaries';
import { IS_EDGE, IS_IE11 } from './msagent';

import { PointerLock } from './pointerlock';

/* spellchecker: enable */


export class MouseEventProvider {

    /**
     * HTML canvas element within the HTML5 document to register event listeners to.
     */
    protected _element: HTMLCanvasElement;

    /**
     * Time frame for events to be buffered (windowTime in rxjs per ReplaySubject).
     */
    protected _timeframe: number | undefined;

    protected _clickListener: { (event: MouseEvent): void };
    protected _clickSubject: ReplaySubject<MouseEvent>;

    protected _enterListener: { (event: MouseEvent): void };
    protected _enterSubject: ReplaySubject<MouseEvent>;

    protected _leaveListener: { (event: MouseEvent): void };
    protected _leaveSubject: ReplaySubject<MouseEvent>;

    protected _downListener: { (event: MouseEvent): void };
    protected _downSubject: ReplaySubject<MouseEvent>;
    protected _upListener: { (event: MouseEvent): void };
    protected _upSubject: ReplaySubject<MouseEvent>;

    protected _moveListener: { (event: MouseEvent): void };
    protected _moveSubject: ReplaySubject<MouseEvent>;

    protected _wheelListener: { (event: WheelEvent): void };
    protected _wheelSubject: ReplaySubject<WheelEvent>;

    protected _dragListener: { (event: DragEvent): void };
    protected _dragSubject: ReplaySubject<DragEvent>;


    /** @see {@link pointerLock} */
    protected _pointerLockRequestPending = false;

    /**
     * This mask saves for which types of events, event.preventDefault should be called. This is useful to disallow
     * some kinds of standard events like scrolling or clicking on links.
     */
    protected _preventDefaultMask: MouseEventProvider.Type;

    constructor(element: HTMLCanvasElement, timeframe?: number) {
        assert(element !== undefined, `expected valid canvas element on initialization, given ${element}`);
        this._element = element;
        this._timeframe = timeframe;

        this._element.addEventListener('click', () => this.processPointerLockRequests());

        console.log(IS_IE11);
        /* Prevent unintentional drag content detection by Microsoft Edge, e.g., when processing mouse move events
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
    protected preventDefaultOnEvent(type: MouseEventProvider.Type, event: MouseEvent): void {
        if (bitInBitfield(this._preventDefaultMask, type)) {
            event.preventDefault();
        }
    }

    /**
     * Prevent default event handling on specific event types (using preventDefault on the event).
     * @param types - Event types to prevent default handling on.
     */
    preventDefault(...types: MouseEventProvider.Type[]): void {
        for (const type of types) {
            if (!bitInBitfield(this._preventDefaultMask, type)) {
                this._preventDefaultMask |= type;
            }
        }
    }

    /**
     * Allow default event handling on specific event types (not calling preventDefault on the event).
     * @param types - Event types to allow default handling on.
     */
    allowDefault(...types: MouseEventProvider.Type[]): void {
        for (const type of types) {
            if (bitInBitfield(this._preventDefaultMask, type)) {
                this._preventDefaultMask &= ~type;
            }
        }
    }

    observable(type: MouseEventProvider.Type): Observable<MouseEvent>
        | Observable<WheelEvent> | Observable<DragEvent> | undefined {
        switch (type) {
            case MouseEventProvider.Type.Click:
                return this.click$;
            case MouseEventProvider.Type.Enter:
                return this.enter$;
            case MouseEventProvider.Type.Leave:
                return this.leave$;
            case MouseEventProvider.Type.Down:
                return this.down$;
            case MouseEventProvider.Type.Up:
                return this.up$;
            case MouseEventProvider.Type.Move:
                return this.move$;
            case MouseEventProvider.Type.Wheel:
                return this.wheel$;
            case MouseEventProvider.Type.Drag:
                return this.drag$;
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

    get click$(): Observable<MouseEvent> {
        if (this._clickSubject === undefined) {
            this._clickSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._clickListener = (event: MouseEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Click, event);
                this._clickSubject.next(event);
            };
            this._element.addEventListener('click', this._clickListener);
        }
        return this._clickSubject.asObservable();
    }

    get enter$(): Observable<MouseEvent> {
        if (this._enterSubject === undefined) {
            this._enterSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._enterListener = (event: MouseEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Enter, event);
                this._enterSubject.next(event);
            };
            this._element.addEventListener('mouseenter', this._enterListener);
        }
        return this._enterSubject.asObservable();
    }

    get leave$(): Observable<MouseEvent> {
        if (this._leaveSubject === undefined) {
            this._leaveSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._leaveListener = (event: MouseEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Leave, event);
                this._leaveSubject.next(event);
            };
            this._element.addEventListener('mouseleave', this._leaveListener);
        }
        return this._leaveSubject.asObservable();
    }

    get down$(): Observable<MouseEvent> {
        if (this._downSubject === undefined) {
            this._downSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._downListener = (event: MouseEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Down, event);
                this._downSubject.next(event);
            };
            this._element.addEventListener('mousedown', this._downListener);
        }
        return this._downSubject.asObservable();
    }

    get up$(): Observable<MouseEvent> {
        if (this._upSubject === undefined) {
            this._upSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._upListener = (event: MouseEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Up, event);
                this._upSubject.next(event);
            };
            this._element.addEventListener('mouseup', this._upListener);
        }
        return this._upSubject.asObservable();
    }

    get move$(): Observable<MouseEvent> {
        if (this._moveSubject === undefined) {
            this._moveSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._moveListener = (event: MouseEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Move, event);
                this._moveSubject.next(event);
            };
            this._element.addEventListener('mousemove', this._moveListener);
        }
        return this._moveSubject.asObservable();
    }

    get wheel$(): Observable<WheelEvent> {
        if (this._wheelSubject === undefined) {
            this._wheelSubject = new ReplaySubject<WheelEvent>(undefined, this._timeframe);
            this._wheelListener = (event: WheelEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Wheel, event);
                this._wheelSubject.next(event);
            };
            this._element.addEventListener('wheel', this._wheelListener);
        }
        return this._wheelSubject.asObservable();
    }

    get drag$(): Observable<DragEvent> {
        if (this._dragSubject === undefined) {
            this._dragSubject = new ReplaySubject<DragEvent>(undefined, this._timeframe);
            this._dragListener = (event: DragEvent) => {
                this.preventDefaultOnEvent(MouseEventProvider.Type.Drag, event);
                this._dragSubject.next(event);
            };
            this._element.addEventListener('drag', this._dragListener);
        }
        return this._dragSubject.asObservable();
    }

}


export namespace MouseEventProvider {

    export enum Type {
        Click = 1 << 0,
        Wheel = 1 << 1,
        Enter = 1 << 2,
        Leave = 1 << 3,
        Move = 1 << 4,
        Down = 1 << 5,
        Up = 1 << 6,
        Drag = 1 << 7,
    }

}
