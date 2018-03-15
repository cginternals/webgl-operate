
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';

import { assert } from './auxiliaries';


export class MouseEventProvider {

    /**
     * HTML canvas element within the HTML5 document to register event listeners to.
     */
    protected _element: HTMLCanvasElement;

    /**
     * Time frame for events to be buffered (windowTime in rxjs per ReplaySubject).
     */
    protected _timeframe: number | undefined;


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


    constructor(element: HTMLCanvasElement, timeframe?: number) {
        assert(element !== undefined, `expected valid canvas element on initialization, given ${element}`);
        this._element = element;
        this._timeframe = timeframe;
    }

    observable(type: MouseEventProvider.Type): Observable<MouseEvent> | Observable<WheelEvent> {
        /* tslint:disable-next-line:switch-default */
        switch (type) {
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

    get enterObservable(): Observable<MouseEvent> {
        if (this._enterSubject === undefined) {
            this._enterSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._enterListener = (event: MouseEvent) => this._enterSubject.next(event);
            this._element.addEventListener('mouseenter', this._enterListener);
        }
        return this._enterSubject.asObservable();
    }

    get leaveObservable(): Observable<MouseEvent> {
        if (this._leaveSubject === undefined) {
            this._leaveSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._leaveListener = (event: MouseEvent) => this._leaveSubject.next(event);
            this._element.addEventListener('mouseleave', this._leaveListener);
        }
        return this._leaveSubject.asObservable();
    }

    get downObservable(): Observable<MouseEvent> {
        if (this._downSubject === undefined) {
            this._downSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._downListener = (event: MouseEvent) => this._downSubject.next(event);
            this._element.addEventListener('mousedown', this._downListener);
        }
        return this._downSubject.asObservable();
    }

    get upObservable(): Observable<MouseEvent> {
        if (this._upSubject === undefined) {
            this._upSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._upListener = (event: MouseEvent) => this._upSubject.next(event);
            this._element.addEventListener('mouseup', this._upListener);
        }
        return this._upSubject.asObservable();
    }

    get moveObservable(): Observable<MouseEvent> {
        if (this._moveSubject === undefined) {
            this._moveSubject = new ReplaySubject<MouseEvent>(undefined, this._timeframe);
            this._moveListener = (event: MouseEvent) => this._moveSubject.next(event);
            this._element.addEventListener('mousemove', this._moveListener);
        }
        return this._moveSubject.asObservable();
    }

    get wheelObservable(): Observable<WheelEvent> {
        if (this._wheelSubject === undefined) {
            this._wheelSubject = new ReplaySubject<WheelEvent>(undefined, this._timeframe);
            this._wheelListener = (event: WheelEvent) => this._wheelSubject.next(event);
            this._element.addEventListener('wheel', this._wheelListener);
        }
        return this._wheelSubject.asObservable();
    }

}


export namespace MouseEventProvider {

    export enum Type { Enter, Leave, Down, Up, Move, Wheel }

}
