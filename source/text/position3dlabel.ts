
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import { logIf, LogLevel } from '../auxiliaries';
import { m4, v3 } from '../gl-matrix-extensions';

import { GLfloat3 } from '../tuples';
import { FontFace } from './fontface';
import { GlyphVertices } from './glyphvertices';
import { Label } from './label';
import { Text } from './text';
import { Typesetter } from './typesetter';

/* spellchecker: enable */


/**
 * A Label that can be positioned in 3D space. The unit for positions, size and transformations, is the abstract World
 * Unit.
 */
export class Position3DLabel extends Label {

    /** @see {@link position} */
    protected _position: vec3;
    /** @see {@link direction} */
    protected _direction: vec3;
    /** @see {@link up} */
    protected _up: vec3;


    /**
     * Constructs a pre-configured 3D-label with given text.
     * @param text - The text that is displayed by this label.
     * @param fontFace - The font face that should be used for that label, or undefined if set later.
     */
    constructor(text: Text, fontFace?: FontFace) {
        super(text, Label.Type.Static, fontFace);
        this._position = vec3.fromValues(0.0, 0.0, 0.0);
        this._direction = vec3.fromValues(1.0, 0.0, 0.0);
        this._up = vec3.fromValues(0.0, 1.0, 0.0);

        this._fontSize = 0.05;
        this._fontSizeUnit = Label.Unit.World;
    }

    /**
     * If altered, creates a position, direction, and up-vector, then prepares the vertex storage and invokes
     * typesetting. Depending on the label's type (static or dynamic) the transform is stored and applied either during
     * typesetting (static) or passed as single transform to the vertex shader during rendering (dynamic).
     */
    typeset(): GlyphVertices | undefined {
        if (!this._altered.transform && !this._altered.dynamicTransform && !this._altered.staticTransform) {
            return undefined;
        }

        if (this._fontFace === undefined || this._text.length === 0) {
            return new GlyphVertices(0);
        }

        const transform = mat4.create();

        /* Compute position and direction transform. */

        mat4.translate(transform, m4(), this._position);
        const normal = vec3.cross(v3(), this._direction, this._up);

        const rotation = mat4.fromValues(
            this._direction[0], this._direction[1], this._direction[2], 0,
            this._up[0], this._up[1], this._up[2], 0,
            normal[0], normal[1], normal[2], 0,
            0.0, 0.0, 0.0, 1.0);

        mat4.mul(transform, transform, rotation);

        switch (this._type) {
            case Label.Type.Static:
                this.staticTransform = mat4.clone(transform);
                this.dynamicTransform = m4();
                break;
            case Label.Type.Dynamic:
                this.staticTransform = m4();
                this.dynamicTransform = mat4.clone(transform);
                break;
            default:
        }

        const vertices = this.vertices();
        Typesetter.typeset(this, vertices);

        this._altered.reset();
        return vertices;
    }

    /**
     * Sets the 3D position of the label's reference point.
     */
    set position(position: vec3 | GLfloat3) {
        this._position = vec3.clone(position);
        this._altered.alter('transform');
    }
    get position(): vec3 | GLfloat3 {
        return this._position;
    }

    /**
     * Sets the 3D direction of the label, i.e., the direction of the baseline.
     */
    set direction(direction: vec3) {
        vec3.normalize(this._direction, direction);
        this._altered.alter('transform');
    }
    get direction(): vec3 {
        return this._direction;
    }

    /**
     * Sets the up-vector of the label. It should be orthogonal to the direction to ensure that the label is not skewed.
     */
    set up(up: vec3) {
        this._up = vec3.normalize(this._up, up);
        this._altered.alter('transform');
    }
    get up(): vec3 {
        return this._up;
    }

    /**
     * This unit is used for the font size. This method overrides the super.fontSizeUnit, since `Position3DLabel` only
     * supports world unit for now. Neither pixel (px) nor point (pt) are supported.
     * (@see {@link fontSize})
     * @param unit - Unit to be used, though, this label type only supports world units.
     */
    set fontSizeUnit(unit: Label.Unit) {
        logIf(unit !== Label.Unit.World, LogLevel.Warning,
            `font size unit other than 'world' are not supported in position-3d-label, given ${unit}`);
    }

}
