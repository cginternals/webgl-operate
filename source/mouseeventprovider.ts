
import { Observable, ReplaySubject } from 'rxjs/Rx';

import { assert } from './auxiliaries';

import { PointerLock } from './pointerlock';


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

    /** @see {@link pointerLock} */
    protected _pointerLockRequestPending = false;

    constructor(element: HTMLCanvasElement, timeframe?: number) {
        assert(element !== undefined, `expected valid canvas element on initialization, given ${element}`);
        this._element = element;
        this._timeframe = timeframe;

        this._element.addEventListener('click', () => this.processPointerLockRequests());
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

    observable(type: MouseEventProvider.Type): Observable<MouseEvent> | Observable<WheelEvent> {
        /* tslint:disable-next-line:switch-default */
        switch (type) {
            case MouseEventProvider.Type.Click:
                return this.clickObservable;
            case MouseEventProvider.Type.Enter:
                return this.enterObservable;
            case MouseEventProvider.Type.Leave:
                return this.leaveObservable;
            case MouseEventProvider.Type.Down:
                return this.downObservable;
            case MouseEventProvider.Type.Up:
                return this.upObservable;
            case MouseEventProvider.Type.Move:
                return this.moveObservable;
            case MouseEventProvider.Type.Wheel:
                return this.wheelObservable;
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

    get clickObservable(): Observable<MouseEvent> {
        if (this._clickSubject === undefined) {
            this._clickSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._clickListener = (event: MouseEvent) => this._clickSubject.next(event);
            this._element.onclick = this._clickListener;
        }
        return this._clickSubject.asObservable();
    }

    get enterObservable(): Observable<MouseEvent> {
        if (this._enterSubject === undefined) {
            this._enterSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._enterListener = (event: MouseEvent) => this._enterSubject.next(event);
            this._element.onmouseenter = this._enterListener;
        }
        return this._enterSubject.asObservable();
    }

    get leaveObservable(): Observable<MouseEvent> {
        if (this._leaveSubject === undefined) {
            this._leaveSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._leaveListener = (event: MouseEvent) => this._leaveSubject.next(event);
            this._element.onmouseleave = this._leaveListener;
        }
        return this._leaveSubject.asObservable();
    }

    get downObservable(): Observable<MouseEvent> {
        if (this._downSubject === undefined) {
            this._downSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._downListener = (event: MouseEvent) => this._downSubject.next(event);
            this._element.onmousedown = this._downListener;
        }
        return this._downSubject.asObservable();
    }

    get upObservable(): Observable<MouseEvent> {
        if (this._upSubject === undefined) {
            this._upSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._upListener = (event: MouseEvent) => this._upSubject.next(event);
            this._element.onmouseup = this._upListener;
        }
        return this._upSubject.asObservable();
    }

    get moveObservable(): Observable<MouseEvent> {
        if (this._moveSubject === undefined) {
            this._moveSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._moveListener = (event: MouseEvent) => this._moveSubject.next(event);
            this._element.onmousemove = this._moveListener;
        }
        return this._moveSubject.asObservable();
    }

    get wheelObservable(): Observable<WheelEvent> {
        if (this._wheelSubject === undefined) {
            this._wheelSubject = new ReplaySubject<WheelEvent>(undefined, this._timeframe);
            this._wheelListener = (event: WheelEvent) => this._wheelSubject.next(event);
            this._element.onwheel = this._wheelListener;
        }
        return this._wheelSubject.asObservable();
    }

}


export namespace MouseEventProvider {

    export enum Type { Click, Enter, Leave, Down, Up, Move, Wheel }

}
