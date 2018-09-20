
import { mat4, vec3, vec2 } from 'gl-matrix';

import { ChangeLookup } from './changelookup';
import { Color } from './color';
import { FontFace } from './fontface';
import { Label } from './label';
import { Text } from './text';


/**
 * @todo
 */
export class Position2DLabel extends Label {

    /** @see {@link fontSizeUnit} */
    /** @todo allow only px or pt, not World  */
    // protected _fontSizeUnit: Label.SpaceUnit = Label.SpaceUnit.World;

    protected _position: vec2;
    protected _direction: vec2;

    /**
     * Constructs an unconfigured, empty label.
     * @param text - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instances VAO and VBOs.
     */
    constructor(text: Text, fontFace: FontFace) {
        super(text, fontFace);
    }


    /**
     * Sets the 2D position of the label's reference point (i.e. lower left corner for horizontal alignment)
     */
    set position(xy: vec2) {
        this._position = vec2.clone(xy);
    }

    get position(): vec2 {
        return this._position;
    }

    /** position parameters as specified in OpenLL */
    setPosition(x: number, y: number, unit?: Label.SpaceUnit): void {
        // todo: assert that SpaceUnit is px or pt; transform to NDC
        this._position = vec2.fromValues(x, y);
    }

    set direction(xy: vec2) {
        this._direction = vec2.clone(xy);
    }

    get direction(): vec2 {
        return this._direction;
    }

    setDirection(x: number, y: number): void {
        this._direction = vec2.fromValues(x, y);
    }
}

