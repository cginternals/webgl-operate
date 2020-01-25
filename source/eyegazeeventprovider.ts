
import { Observable, ReplaySubject } from 'rxjs';
import { assert, bitInBitfield } from './auxiliaries';
import { EyeGazeDataStream, EyeGazeDataStreams } from './eyegazedatastream';
import { EyeGazeEvent } from './eyegazeevent';


// tslint:disable:max-classes-per-file

// mache zu: Gaze event provider, siehe: mouseenevtprovider, eventhandler, rxjs
// semantic: Look up what the data mean and document it
export class EyeGazeEventProvider {

    /**
     * Time frame for events to be buffered (windowTime in rxjs per ReplaySubject).
     */
    protected _timeframe: number | undefined;

    /**
     * This mask saves for which types of events, event.preventDefault should be called. This is useful to disallow
     * some kinds of standard events like successful connected and handshake success.
     */
    protected _preventDefaultMask: EyeGazeEventProvider.Type;

    protected _eyeGazeDataListener: { (event: EyeGazeEvent): void };
    protected _eyeGazeDataSubject: ReplaySubject<EyeGazeEvent>;

    protected _newServerMessageListener: { (event: EyeGazeEvent): void };
    protected _newServerMessageSubject: ReplaySubject<EyeGazeEvent>;

    protected _connectionStatusListener: { (event: EyeGazeEvent): void };
    protected _connectionStatusSubject: ReplaySubject<EyeGazeEvent>;

    protected _binaryMessageParsingErrorListener: { (event: EyeGazeEvent): void };
    protected _binaryMessageParsingErrorSubject: ReplaySubject<EyeGazeEvent>;

    protected _eyeGazeDataStream: EyeGazeDataStream;

    constructor(eyeGazeDataStreams: EyeGazeDataStreams, timeframe?: number) {
        assert(eyeGazeDataStreams !== undefined, `expected a valid eye gaze data streams object on initialization, given ${eyeGazeDataStreams}.`);
        this._eyeGazeDataStream = new EyeGazeDataStream(eyeGazeDataStreams);
    }

    /**
     * Checks whether or not to prevent the default handling of the given event. This depends on the internal
     * `preventDefaultMask` which can be modified using `preventDefault` function @see{@link preventDefault}.
     * @param type - Internal event type of the incoming event.
     * @param event - Actual event to prevent default handling on (if masked).
     */
    protected preventDefaultOnEvent(type: EyeGazeEventProvider.Type, event: EyeGazeEvent): void {
        if (bitInBitfield(this._preventDefaultMask, type)) {
            event.preventDefault();
        }
    }

    /**
     * Allow default event handling on specific event types (not calling preventDefault on the event).
     * @param types - Event types to allow default handling on.
     */
    allowDefault(...types: EyeGazeEventProvider.Type[]): void {
        for (const type of types) {
            if (bitInBitfield(this._preventDefaultMask, type)) {
                this._preventDefaultMask &= ~type;
            }
        }
    }

    /**
     * Prevent default event handling on specific event types (using preventDefault on the event).
     * @param types - Event types to prevent default handling on.
     */
    preventDefault(...types: EyeGazeEventProvider.Type[]): void {
        for (const type of types) {
            if (!bitInBitfield(this._preventDefaultMask, type)) {
                this._preventDefaultMask |= type;
            }
        }
    }

    observable(type: EyeGazeEventProvider.Type): Observable<EyeGazeEvent>
        | Observable<WheelEvent> | Observable<DragEvent> | undefined {
        switch (type) {
            case EyeGazeEventProvider.Type.EyeGazeData:
                return this.EyeGazeData$;
            case EyeGazeEventProvider.Type.NewServerMessage:
                return this.NewServerMessage$;
            case EyeGazeEventProvider.Type.ConnectionStatus:
                return this.ConnectionStatus$;
            case EyeGazeEventProvider.Type.BinaryMessageParsingError:
                return this.BinaryMessageParsingError$;
            default:
                return undefined;
        }
    }

    get EyeGazeData$(): Observable<EyeGazeEvent> {
        if (this._eyeGazeDataSubject === undefined) {
            this._eyeGazeDataSubject = new ReplaySubject<EyeGazeEvent>(undefined, this._timeframe);
            this._eyeGazeDataListener = (event: EyeGazeEvent) => {
                this.preventDefaultOnEvent(EyeGazeEventProvider.Type.EyeGazeData, event);
                this._eyeGazeDataSubject.next(event);
            };
            this._eyeGazeDataStream.addEventListener(EyeGazeDataStream.EYE_GAZE_DATA, this._eyeGazeDataListener);
        }
        return this._eyeGazeDataSubject.asObservable();
    }

    get NewServerMessage$(): Observable<EyeGazeEvent> {
        if (this._newServerMessageSubject === undefined) {
            this._newServerMessageSubject = new ReplaySubject<EyeGazeEvent>(undefined, this._timeframe);
            this._newServerMessageListener = (event: EyeGazeEvent) => {
                this.preventDefaultOnEvent(EyeGazeEventProvider.Type.NewServerMessage, event);
                this._newServerMessageSubject.next(event);
            };
            this._eyeGazeDataStream.addEventListener(EyeGazeDataStream.NEW_SERVER_MESSAGE,
                this._newServerMessageListener);
        }
        return this._newServerMessageSubject.asObservable();
    }

    get ConnectionStatus$(): Observable<EyeGazeEvent> {
        if (this._connectionStatusSubject === undefined) {
            this._connectionStatusSubject = new ReplaySubject<EyeGazeEvent>(undefined, this._timeframe);
            this._connectionStatusListener = (event: EyeGazeEvent) => {
                this.preventDefaultOnEvent(EyeGazeEventProvider.Type.ConnectionStatus, event);
                this._connectionStatusSubject.next(event);
            };
            this._eyeGazeDataStream.addEventListener(EyeGazeDataStream.CONNECTION_STATUS,
                this._connectionStatusListener);
        }
        return this._connectionStatusSubject.asObservable();
    }

    get BinaryMessageParsingError$(): Observable<EyeGazeEvent> {
        if (this._binaryMessageParsingErrorSubject === undefined) {
            this._binaryMessageParsingErrorSubject = new ReplaySubject<EyeGazeEvent>(undefined, this._timeframe);
            this._binaryMessageParsingErrorListener = (event: EyeGazeEvent) => {
                this.preventDefaultOnEvent(EyeGazeEventProvider.Type.BinaryMessageParsingError, event);
                this._binaryMessageParsingErrorSubject.next(event);
            };
            this._eyeGazeDataStream.addEventListener(EyeGazeDataStream.BINARY_MESSAGE_PARSING_ERROR,
                this._binaryMessageParsingErrorListener);
        }
        return this._eyeGazeDataSubject.asObservable();
    }
}

export namespace EyeGazeEventProvider {

    export enum Type {
        EyeGazeData = 1 << 0,
        NewServerMessage = 1 << 1,
        ConnectionStatus = 1 << 2,
        BinaryMessageParsingError = 1 << 3,
    }

}

