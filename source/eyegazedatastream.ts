import { assert } from './auxiliaries';
import { EyeGazeData, EyeGazeEvent } from './eyegazeevent';

// tslint:disable:max-classes-per-file

export class EyeGazeDataStream extends EventTarget {

    public static readonly EYE_GAZE_DATA = 'eyegazedata';
    public static readonly NEW_SERVER_MESSAGE = 'newservermessage';
    public static readonly CONNECTION_STATUS = 'connectionstatus';
    public static readonly BINARY_MESSAGE_PARSING_ERROR = 'binarymessageparsingerror';

    protected _webSocket: WebSocket;
    protected readonly websocketAddress = 'ws://localhost:1234';

    protected _eyeGazeDataStreams: EyeGazeDataStreams;

    constructor(eyeGazeDataStreams: EyeGazeDataStreams) {
        super();
        assert(eyeGazeDataStreams !== undefined, `expected a valid eye gaze data streams object on initialization, given ${eyeGazeDataStreams}.`);
        this._eyeGazeDataStreams = eyeGazeDataStreams;
        this.connect();
    }

    private generateStreamConfigByte(): Uint8Array {
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

    private performHandshake(): void {
        this._eyeGazeDataStreams.recalculateNumberOfFloats();
        const configByte = this.generateStreamConfigByte();
        this._webSocket.send(configByte);
    }

    private parseEyeTrackingData(data: Float32Array): EyeGazeEvent {
        if (data.length === this._eyeGazeDataStreams.expectedNumberOfFloats) {
            return new EyeGazeEvent(EyeGazeDataStream.BINARY_MESSAGE_PARSING_ERROR);
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
        return new EyeGazeEvent(EyeGazeDataStream.EYE_GAZE_DATA, eyeGazeData);
    }

    private connect(): void {
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

    // TODO add proper sub event types
    protected onOpen(event: Event): void {
        this.dispatchEvent(new EyeGazeEvent(EyeGazeDataStream.CONNECTION_STATUS, undefined, 'connected to server'));
        this.performHandshake();
    }

    protected onClose(event: Event): void {
        this.dispatchEvent(new EyeGazeEvent(EyeGazeDataStream.CONNECTION_STATUS, undefined, 'disconnected to server'));
    }

    protected onError(event: Event): void {
    }

    protected async onMessage(event: MessageEvent): Promise<void> {
        // handle stream data
        if (typeof event.data !== 'string') {
            const arrayBuffer = await event.data.arrayBuffer();
            const floatData = new Float32Array(arrayBuffer);
            this.dispatchEvent(this.parseEyeTrackingData(floatData));
        // handle status message data
        } else {
            this.dispatchEvent(new EyeGazeEvent(EyeGazeDataStream.NEW_SERVER_MESSAGE, undefined, event.data));
        }
    }

    get connectionState(): number {
        return this._webSocket.readyState;
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
