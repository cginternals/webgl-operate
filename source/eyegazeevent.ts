

// tslint:disable:max-classes-per-file

export class EyeGazeEvent extends Event {
    eyeGazeData: EyeGazeData;
    type: string;
    message: string;

    constructor(type: string, eyeGazeData?: EyeGazeData, message?: string) {
        super(type);
        if (eyeGazeData) {
            this.eyeGazeData = eyeGazeData;
        }
        if (message) {
            this.message = message;
        }
    }
}

export class EyeGazeData {
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

