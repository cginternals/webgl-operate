
import { logIf, LogLevel } from './auxiliaries';

export class EyeTrackerDataStream {

    protected readonly websocketAddress = 'ws://localhost:1234';

    protected _message: string;
    protected _webSocket: WebSocket;
    protected _onUpdateLambda: () => void;

    public logStatus: boolean;

    constructor() {
        this._message = '';
        this._onUpdateLambda = () => { };
    }


    protected onOpen(event: Event): void {
        // perform handshake
        console.log('connected');
        logIf(this.logStatus, LogLevel.Info, 'Connected to eye tracking server.');
        this._webSocket.send('test');
    }

    protected onClose(event: Event): void {
        logIf(this.logStatus, LogLevel.Info, 'Connection to eye tracking server has been closed.');
    }

    protected onError(event: Event): void {
        logIf(this.logStatus, LogLevel.Info, 'Connection returned an error: ');
        logIf(this.logStatus, LogLevel.Info, event.toString());
    }

    protected onMessage(event: MessageEvent): void {
        this._message = event.data.toString();
        this._onUpdateLambda();
    }

    public connect(): void {
        console.log('Trying to connect to server');
        this._webSocket = new WebSocket(this.websocketAddress);

        // Arrow functions needed in order to not loose this-context.
        this._webSocket.onopen = (event: Event) => {
            this.onOpen(event);
        };
        this._webSocket.onclose = (event: Event) => {
            this.onClose(event);
        };
        this._webSocket.onerror = (event: Event) => {
            this.onError(event);
        };
        this._webSocket.onmessage = (event: MessageEvent) => {
            this.onMessage(event);
        };
    }

    public onUpdate(lambda: () => void): void {
        this._onUpdateLambda = lambda;
    }

    get message(): string {
        return this._message;
    }

    get connectionState(): number {
        return this._webSocket.readyState;
    }
}
