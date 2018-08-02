
import { Observable, ReplaySubject } from 'rxjs';

import { assert } from './auxiliaries';


export class TouchEventProvider {

    /**
     * HTML canvas element within the HTML5 document to register event listeners to.
     */
    protected _element: HTMLCanvasElement;

    /**
     * Time frame for events to be buffered (windowTime in rxjs per ReplaySubject).
     */
    protected _timeframe: number | undefined;

    protected _startListener: { (event: TouchEvent): void };
    protected _startSubject: ReplaySubject<TouchEvent>;

    protected _endListener: { (event: TouchEvent): void };
    protected _endSubject: ReplaySubject<TouchEvent>;

    protected _moveListener: { (event: TouchEvent): void };
    protected _moveSubject: ReplaySubject<TouchEvent>;

    protected _cancelListener: { (event: TouchEvent): void };
    protected _cancelSubject: ReplaySubject<TouchEvent>;

    /**
     * This mask saves for which types of events, event.preventDefault should be called.
     * This is useful to disallow some kinds of standard events like scrolling or clicking on links.
     */
    protected _preventDefaultMask: TouchEventProvider.Type;

    constructor(element: HTMLCanvasElement, timeframe?: number) {
        assert(element !== undefined, `expected valid canvas element on initialization, given ${element}`);
        this._element = element;
        this._timeframe = timeframe;
    }

    protected handlePreventDefault(option: TouchEventProvider.Type, event: TouchEvent) {
        if (this._preventDefaultMask & option) {
            event.preventDefault();
        }
    }

    /**
     * Add one option to the mask of events for which preventDefault should be called.
     * @param option Option to be added
     */
    addPreventDefaultOption(option: TouchEventProvider.Type): void {
        this._preventDefaultMask |= option;
    }

    /**
     * Remove one option to the mask of events for which preventDefault should be called.
     * @param option Option to be removed
     */
    removePreventDefaultOption(option: TouchEventProvider.Type): void {
        this._preventDefaultMask &= ~option;
    }

    /**
     * Set the whole mask, which represents for which preventDefault should be called.
     * Overrides all previously set options.
     * @param mask Mask of options for which preventDefault should be called
     */
    set preventDefaultMask(mask: TouchEventProvider.Type) {
        this._preventDefaultMask = mask;
    }

    observable(type: TouchEventProvider.Type): Observable<TouchEvent> {
        /* tslint:disable-next-line:switch-default */
        switch (type) {
            case TouchEventProvider.Type.Start:
                return this.startObservable;
            case TouchEventProvider.Type.End:
                return this.endObservable;
            case TouchEventProvider.Type.Move:
                return this.moveObservable;
            case TouchEventProvider.Type.Cancel:
                return this.cancelObservable;
        }

        assert(false, 'Encountered unknown touch event.');
        return new Observable<TouchEvent>();
    }

    get startObservable(): Observable<TouchEvent> {
        if (this._startSubject === undefined) {
            this._startSubject = new ReplaySubject<TouchEvent>(undefined, this._timeframe);
            this._startListener = (event: TouchEvent) => {
                this.handlePreventDefault(TouchEventProvider.Type.Start, event);
                this._startSubject.next(event);
            };
            this._element.addEventListener('touchstart', this._startListener);
        }
        return this._startSubject.asObservable();
    }

    get endObservable(): Observable<TouchEvent> {
        if (this._endSubject === undefined) {
            this._endSubject = new ReplaySubject<TouchEvent>(undefined, this._timeframe);
            this._endListener = (event: TouchEvent) => {
                this.handlePreventDefault(TouchEventProvider.Type.End, event);
                this._endSubject.next(event);
            };
            this._element.addEventListener('touchend', this._endListener);
        }
        return this._endSubject.asObservable();
    }

    get moveObservable(): Observable<TouchEvent> {
        if (this._moveSubject === undefined) {
            this._moveSubject = new ReplaySubject<TouchEvent>(undefined, this._timeframe);
            this._moveListener = (event: TouchEvent) => {
                this.handlePreventDefault(TouchEventProvider.Type.Move, event);
                this._moveSubject.next(event);
            };
            this._element.addEventListener('touchmove', this._moveListener);
        }
        return this._moveSubject.asObservable();
    }

    get cancelObservable(): Observable<TouchEvent> {
        if (this._cancelSubject === undefined) {
            this._cancelSubject = new ReplaySubject<TouchEvent>(undefined, this._timeframe);
            this._cancelListener = (event: TouchEvent) => {
                this.handlePreventDefault(TouchEventProvider.Type.Cancel, event);
                this._cancelSubject.next(event);
            };
            this._element.addEventListener('touchcancel', this._cancelListener);
        }
        return this._cancelSubject.asObservable();
    }
}


export namespace TouchEventProvider {

    export enum Type {
        None = 0,
        Start = 1 << 0,
        End = 1 << 1,
        Move = 1 << 2,
        Cancel = 1 << 3,
    }
}
