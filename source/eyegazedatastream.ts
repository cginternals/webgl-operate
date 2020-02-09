import { EyeGazeData, EyeGazeEvent } from './eyegazeevent';

// tslint:disable:max-classes-per-file

export class EyeGazeEventTarget extends EventTarget { }

export class EyeGazeDataStream {

    public static readonly EYE_GAZE_DATA = 'eyegazedata';
    public static readonly NEW_SERVER_MESSAGE = 'newservermessage';
    public static readonly CONNECTION_STATUS = 'connectionstatus';
    public static readonly BINARY_MESSAGE_PARSING_ERROR = 'binarymessageparsingerror';

    public static readonly SUCCESSFULLY_CONNECTED_TO_SERVER = 'successfully connected to server';
    public static readonly DISCONNECTED_TO_SERVER = 'disconnected to server';
    public static readonly CONNECTION_ERROR = 'connection error with server';

    protected _webSocket: WebSocket;
    protected readonly websocketAddress = 'ws://localhost:1234';

    protected _eyeGazeDataStreams: EyeGazeDataStreams = new EyeGazeDataStreams();
    protected _eyeGazeEventTarget = new EventTarget();

    protected generateStreamConfigByte(): Uint8Array {
        const configByte = Uint8Array.from([0]);
        if (this._eyeGazeDataStreams.gazePosition) {
            configByte[0] = configByte[0] | 0b00000001;
        }
        if (this._eyeGazeDataStreams.gazeOrigin) {
            configByte[0] = configByte[0] | 0b00000010;
        }
        if (this._eyeGazeDataStreams.eyePositionNormalized) {
            configByte[0] = configByte[0] | 0b00000100;
        }
        if (this._eyeGazeDataStreams.headPositionAndRotation) {
            configByte[0] = configByte[0] | 0b00001000;
        }
        if (this._eyeGazeDataStreams.userPresence) {
            configByte[0] = configByte[0] | 0b00010000;
        }
        return configByte;
    }

    protected performHandshake(): void {
        this._eyeGazeDataStreams.recalculateNumberOfFloats();
        const configByte = this.generateStreamConfigByte();
        console.log('sending config bytes');
        this._webSocket.send(configByte);
    }

    protected parseEyeTrackingData(data: Float32Array): EyeGazeEvent {
        if (data.length < this._eyeGazeDataStreams.expectedNumberOfFloats) {
            return new CustomEvent(EyeGazeDataStream.BINARY_MESSAGE_PARSING_ERROR);
        }
        let currentIndexPosition = 0;
        const eyeGazeData = new EyeGazeData();
        if (this._eyeGazeDataStreams.gazePosition) {
            eyeGazeData.gazePositionXY[0] = data[currentIndexPosition++];
            eyeGazeData.gazePositionXY[1] = data[currentIndexPosition++];
        }
        if (this._eyeGazeDataStreams.gazeOrigin) {
            eyeGazeData.gazeOriginRightXYZ[0] = data[currentIndexPosition++];
            eyeGazeData.gazeOriginRightXYZ[1] = data[currentIndexPosition++];
            eyeGazeData.gazeOriginRightXYZ[2] = data[currentIndexPosition++];

            eyeGazeData.gazeOriginLeftXYZ[0] = data[currentIndexPosition++];
            eyeGazeData.gazeOriginLeftXYZ[1] = data[currentIndexPosition++];
            eyeGazeData.gazeOriginLeftXYZ[2] = data[currentIndexPosition++];
        }
        if (this._eyeGazeDataStreams.eyePositionNormalized) {
            eyeGazeData.eyePositionRightNormalizedXYZ[0] = data[currentIndexPosition++];
            eyeGazeData.eyePositionRightNormalizedXYZ[1] = data[currentIndexPosition++];
            eyeGazeData.eyePositionRightNormalizedXYZ[2] = data[currentIndexPosition++];

            eyeGazeData.eyePositionLeftNormalizedXYZ[0] = data[currentIndexPosition++];
            eyeGazeData.eyePositionLeftNormalizedXYZ[1] = data[currentIndexPosition++];
            eyeGazeData.eyePositionLeftNormalizedXYZ[2] = data[currentIndexPosition++];
        }
        if (this._eyeGazeDataStreams.headPositionAndRotation) {
            eyeGazeData.headPositionXYZ[0] = data[currentIndexPosition++];
            eyeGazeData.headPositionXYZ[1] = data[currentIndexPosition++];
            eyeGazeData.headPositionXYZ[2] = data[currentIndexPosition++];

            eyeGazeData.headRotationXYZ[0] = data[currentIndexPosition++];
            eyeGazeData.headRotationXYZ[1] = data[currentIndexPosition++];
            eyeGazeData.headRotationXYZ[2] = data[currentIndexPosition++];
        }
        if (this._eyeGazeDataStreams.userPresence) {
            eyeGazeData.userPresence = data[currentIndexPosition] === 0.0 ? false : true;
        }
        return new CustomEvent(EyeGazeDataStream.EYE_GAZE_DATA, { detail: { eyeGazeData } });
    }

    protected onOpen(event: Event): void {
        this.dispatchEvent(new CustomEvent(EyeGazeDataStream.CONNECTION_STATUS, {
            detail:
                { message: EyeGazeDataStream.SUCCESSFULLY_CONNECTED_TO_SERVER, event },
        }));
        console.log('Connected to server. Performing handshake now.');
        this.performHandshake();
    }

    protected onClose(event: Event): void {
        this.dispatchEvent(new CustomEvent(EyeGazeDataStream.CONNECTION_STATUS, {
            detail:
                { message: EyeGazeDataStream.DISCONNECTED_TO_SERVER, event },
        }));
    }

    protected onError(event: Event): void {
        this.dispatchEvent(new CustomEvent(EyeGazeDataStream.CONNECTION_STATUS, {
            detail:
                { message: EyeGazeDataStream.CONNECTION_ERROR, event },
        }));
    }

    protected async onMessage(event: MessageEvent): Promise<void> {
        // handle stream data
        if (typeof event.data !== 'string') {
            const arrayBuffer = await event.data.arrayBuffer();
            const floatData = new Float32Array(arrayBuffer);
            this.dispatchEvent(this.parseEyeTrackingData(floatData));
            // handle status message data
        } else {
            this.dispatchEvent(new CustomEvent(EyeGazeDataStream.NEW_SERVER_MESSAGE, {
                detail:
                    { message: event.data },
            }));
        }
    }

    public connect(): void {
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

    // Mediation
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions): void {
        this._eyeGazeEventTarget.addEventListener(type, listener, options);

    }

    dispatchEvent(event: Event): boolean {
        return this._eyeGazeEventTarget.dispatchEvent(event);
    }

    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean): void {
        this._eyeGazeEventTarget.removeEventListener(type, callback, options);
    }

    get connectionState(): number {
        return this._webSocket.readyState;
    }

    get eyeGazeDataStreams(): EyeGazeDataStreams {
        return this._eyeGazeDataStreams;
    }

    set eyeGazeDataStreams(eyeGazeDataStreams: EyeGazeDataStreams) {
        if (this._eyeGazeDataStreams !== eyeGazeDataStreams) {
            this._eyeGazeDataStreams = eyeGazeDataStreams;
        }
    }
}

export class EyeGazeDataStreams {
    public gazePosition = false;
    public gazeOrigin = false;
    public eyePositionNormalized = false;
    public headPositionAndRotation = false;
    public userPresence = false;

    // The sum of floats from all activated data streams
    public expectedNumberOfFloats = 0;

    // Is automatically recalculated if the handshake is invoked
    public recalculateNumberOfFloats(): void {
        let newNumberOfFloats = 0;
        if (this.gazePosition) {
            newNumberOfFloats += 2;
        }
        if (this.gazeOrigin) {
            newNumberOfFloats += 6;
        }
        if (this.eyePositionNormalized) {
            newNumberOfFloats += 6;
        }
        if (this.headPositionAndRotation) {
            newNumberOfFloats += 6;
        }
        if (this.userPresence) {
            newNumberOfFloats += 1;
        }
        this.expectedNumberOfFloats = newNumberOfFloats;
    }
}
