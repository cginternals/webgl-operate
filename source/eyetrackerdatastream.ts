
import { logIf, LogLevel } from './auxiliaries';

// tslint:disable:max-classes-per-file

export class EyeTrackerDataStream {

    protected readonly websocketAddress = 'ws://localhost:1234';

    protected _webSocket: WebSocket;
    protected _onDataUpdateLambda: () => void;
    protected _onStatusUpdateLambda: () => void;

    public dataStreams: EyeTrackingDataStreams;
    public eyeTrackingData: EyeTrackingData;
    public statusMessage: EyeTrackingStatusMessage;
    public _serverMessage: string;

    public logStatus: boolean;

    constructor() {
        this._serverMessage = '';
        this._onDataUpdateLambda = () => { };
        this._onStatusUpdateLambda = () => { };
        this.dataStreams = new EyeTrackingDataStreams();
        this.eyeTrackingData = new EyeTrackingData();
    }

    private generateStreamConfigByte(): Uint8Array {
        const configByte = Uint8Array.from([0]);
        if (this.dataStreams.gazePosition) {
            configByte[0] = configByte[0] | 0b00000001;
        }
        if (this.dataStreams.gazeOrigin) {
            configByte[0] = configByte[0] | 0b00000010;
        }
        if (this.dataStreams.eyePositionNormalized) {
            configByte[0] = configByte[0] | 0b00000100;
        }
        if (this.dataStreams.headPositionAndRotation) {
            configByte[0] = configByte[0] | 0b00001000;
        }
        if (this.dataStreams.userPresence) {
            configByte[0] = configByte[0] | 0b00010000;
        }
        return configByte;
    }

    private performHandshake(): void {
        this.dataStreams.recalculateNumberOfFloats();
        const configByte = this.generateStreamConfigByte();
        this._webSocket.send(configByte);
    }

    private parseEyeTrackingData(data: Float32Array): void {
        let currentIndexPosition = 0;
        if (this.dataStreams.gazePosition) {
            this.eyeTrackingData.gazePositionXY[0] = data[currentIndexPosition++];
            this.eyeTrackingData.gazePositionXY[1] = data[currentIndexPosition++];
        }
        if (this.dataStreams.gazeOrigin) {
            this.eyeTrackingData.gazeOriginRightXYZ[0] = data[currentIndexPosition++];
            this.eyeTrackingData.gazeOriginRightXYZ[1] = data[currentIndexPosition++];
            this.eyeTrackingData.gazeOriginRightXYZ[2] = data[currentIndexPosition++];

            this.eyeTrackingData.gazeOriginLeftXYZ[0] = data[currentIndexPosition++];
            this.eyeTrackingData.gazeOriginLeftXYZ[1] = data[currentIndexPosition++];
            this.eyeTrackingData.gazeOriginLeftXYZ[2] = data[currentIndexPosition++];
        }
        if (this.dataStreams.eyePositionNormalized) {
            this.eyeTrackingData.eyePositionRightNormalizedXYZ[0] = data[currentIndexPosition++];
            this.eyeTrackingData.eyePositionRightNormalizedXYZ[1] = data[currentIndexPosition++];
            this.eyeTrackingData.eyePositionRightNormalizedXYZ[2] = data[currentIndexPosition++];

            this.eyeTrackingData.eyePositionLeftNormalizedXYZ[0] = data[currentIndexPosition++];
            this.eyeTrackingData.eyePositionLeftNormalizedXYZ[1] = data[currentIndexPosition++];
            this.eyeTrackingData.eyePositionLeftNormalizedXYZ[2] = data[currentIndexPosition++];
        }
        if (this.dataStreams.headPositionAndRotation) {
            this.eyeTrackingData.headPositionXYZ[0] = data[currentIndexPosition++];
            this.eyeTrackingData.headPositionXYZ[1] = data[currentIndexPosition++];
            this.eyeTrackingData.headPositionXYZ[2] = data[currentIndexPosition++];

            this.eyeTrackingData.headRotationXYZ[0] = data[currentIndexPosition++];
            this.eyeTrackingData.headRotationXYZ[1] = data[currentIndexPosition++];
            this.eyeTrackingData.headRotationXYZ[2] = data[currentIndexPosition++];
        }
        if (this.dataStreams.userPresence) {
            this.eyeTrackingData.userPresence = data[currentIndexPosition] === 0.0 ? false : true;
        }
        this.eyeTrackingData.dataChanged = true;
    }

    protected onOpen(event: Event): void {
        // perform handshake
        console.log('connected');
        logIf(this.logStatus, LogLevel.Info, 'Connected to eye tracking server.');
        this.performHandshake();
    }

    protected onClose(event: Event): void {
        logIf(this.logStatus, LogLevel.Info, 'Connection to eye tracking server has been closed.');
    }

    protected onError(event: Event): void {
        logIf(this.logStatus, LogLevel.Info, 'Connection returned an error: ');
        logIf(this.logStatus, LogLevel.Info, event.toString());
    }

    protected async onMessage(event: MessageEvent): Promise<void> {
        if (typeof event.data !== 'string') {
            const arrayBuffer = await event.data.arrayBuffer();
            const floatData = new Float32Array(arrayBuffer);
            if (floatData.length < this.dataStreams.expectedNumberOfFloats) {
                this.statusMessage = EyeTrackingStatusMessage.BinaryMessageTooSmall;
                this._onStatusUpdateLambda();
            } else {
                this.parseEyeTrackingData(floatData);
                this._onDataUpdateLambda();
            }
        } else {
            this._serverMessage = event.data;
            this.statusMessage = EyeTrackingStatusMessage.NewServerMessage;
            this._onStatusUpdateLambda();
        }
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

    public onDataUpdate(lambda: () => void): void {
        this._onDataUpdateLambda = lambda;
    }

    public onStatusUpdate(lambda: () => void): void {
        this._onStatusUpdateLambda = lambda;
    }

    get serverMessage(): string {
        return this._serverMessage;
    }

    get connectionState(): number {
        return this._webSocket.readyState;
    }
}

export class EyeTrackingDataStreams {
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

export enum EyeTrackingStatusMessage {

    BinaryMessageTooSmall = 'The last received binary message was smaller than expected',
    NewServerMessage = 'Server sent new message.',
}

export class EyeTrackingData {
    // gaze position x and y
    public gazePositionXY: [number, number] = [0, 0];

    // gaze origin
    public gazeOriginRightXYZ: [number, number, number] = [0, 0, 0];
    public gazeOriginLeftXYZ: [number, number, number] = [0, 0, 0];

    // eye position normalized
    public eyePositionRightNormalizedXYZ: [number, number, number] = [0, 0, 0];
    public eyePositionLeftNormalizedXYZ: [number, number, number] = [0, 0, 0];

    // head position and rotation
    public headPositionXYZ: [number, number, number] = [0, 0, 0];
    public headRotationXYZ: [number, number, number] = [0, 0, 0];

    // user presence, a bool represented as a public number so that everything fits in a char array
    public userPresence = false;

    // Is set to true if new data have been written to the attributes.
    // Always set it to false after you processed the data in order to be able to determine when new data arrived.
    public dataChanged = false;

    public toString(): string {
        let message = '';
        message += `Gaze Position: ${this.gazePositionXY}\n`;
        message += `Gaze Origin Right: ${this.gazeOriginRightXYZ}\n`;
        message += `Gaze Origin Left: ${this.gazeOriginLeftXYZ}\n`;
        message += `Eye Position Normalized Right: ${this.eyePositionRightNormalizedXYZ}\n`;
        message += `Eye Position Normalized Left: ${this.eyePositionLeftNormalizedXYZ}\n`;
        message += `Head Position: ${this.headPositionXYZ}\n`;
        message += `Head Rotation: ${this.headRotationXYZ}\n`;
        message += `User Presence: ${this.userPresence}\n`;
        return message;
    }
}
