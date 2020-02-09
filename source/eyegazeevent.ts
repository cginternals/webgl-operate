

// tslint:disable:max-classes-per-file

// FORMAT:
// eyeGazeEvent.detail.message? = type string
// eyeGazeEvent.detail.eyeGazeData? = type EyeGazeData
// eyeGazeEvent.detail.event? = type Event
export type EyeGazeEvent = CustomEvent;

export class EyeGazeData {
    // TRACK BOX:
    // TODO: tobii_get_track_box Retrieves 3d coordinates of the track box frustum,
    // given in millimeters from the device center.

    // gaze position x and y
    // the gaze position on the screen. The value is between 0 and 1. The Top Left edge is the origin.
    public gazePositionXY: [number, number] = [0, 0];

    // gaze origin
    // x, y and z coordinates as floats of the gaze origin point on the left and right
    // eye of the user, as measured in millimeters from the center of the display.
    public gazeOriginRightXYZ: [number, number, number] = [0, 0, 0];
    public gazeOriginLeftXYZ: [number, number, number] = [0, 0, 0];

    // eye position normalized
    // An array of three floats, for the x, y and z coordinate of the eye position on the left eye of the user,
    // as a normalized value within the track box.
    // right analogue.
    public eyePositionRightNormalizedXYZ: [number, number, number] = [0, 0, 0];
    public eyePositionLeftNormalizedXYZ: [number, number, number] = [0, 0, 0];

    // head position and rotation
    // An array of three floats, for the x, y and z coordinate of the head of the user, as measured in
    // millimeters from the center of the display.
    public headPositionXYZ: [number, number, number] = [0, 0, 0];
    // An array of three floats, for the x, y and z rotation of the head of the user. The rotation is
    // expressed in Euler angles using right-handed rotations around each axis. The z rotation describes
    // the rotation around the vector pointing towards the user.
    public headRotationXYZ: [number, number, number] = [0, 0, 0];

    // user presence, a bool represented as a public number so that everything fits in a char array
    public userPresence = false;

    // TODO: forgot tobii_notifications_subscribe, this is not so useful I guess(tobii_user_position_guide_subscribe)


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

