
/* spellchecker: disable */

import { mat4, vec3 } from 'gl-matrix';

import { auxiliaries } from '../auxiliaries';
import { gl_matrix_extensions } from '../gl-matrix-extensions';
import { tuples } from '../tuples';

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

    private static readonly DEFAULT_FONTSIZE_WORLD = 0.05;

    /** @see {@link position} */
    protected _position: vec3;
    /** @see {@link direction} */
    protected _direction: vec3;
    /** @see {@link up} */
    protected _up: vec3;


    /**
     * Constructs a pre-configured 3D-label with given text. Depending on the label type, transformations are applied
     * once when typesetting (static) or every frame during rendering (dynamic).
     * @param text - The text that is displayed by this label.
     * @param type - Either static or dynamic. If static is used, all transformations are baked and modifications to
     * on any of the label's transformations are expected to occur less often.
     * @param fontFace - The font face that should be used for that label, or undefined if set later.
     */
    constructor(text: Text, type: Label.Type, fontFace?: FontFace) {
        super(text, type, fontFace);
        this._position = vec3.fromValues(0.0, 0.0, 0.0);
        this._direction = vec3.fromValues(1.0, 0.0, 0.0);
        this._up = vec3.fromValues(0.0, 1.0, 0.0);

        this._fontSize = Position3DLabel.DEFAULT_FONTSIZE_WORLD;
        this._fontSizeUnit = Label.Unit.World;
    }

    /**
     * If altered, creates a position, direction, and up-vector, then prepares the vertex storage and invokes
     * typesetting. Depending on the label's type (static or dynamic) the transform is stored and applied either during
     * typesetting (static) or passed as single transform to the vertex shader during rendering (dynamic).
     */
    typeset(force = false): GlyphVertices | undefined {
        const typeset = force || this._altered.typesetting || this._altered.static || this._altered.text
            || this.text.altered;
        if (!typeset && !this._altered.dynamic && !force) {
            return undefined;
        }

        if (!this.valid) {
            return new GlyphVertices(0);
        }

        const transform = mat4.create();

        /* Compute position and direction transform. */

        mat4.translate(transform, gl_matrix_extensions.m4(), this._position);
        const normal = vec3.cross(gl_matrix_extensions.v3(), this._direction, this._up);

        const rotation = mat4.fromValues(
            this._direction[0], this._direction[1], this._direction[2], 0.0,
            this._up[0], this._up[1], this._up[2], 0.0,
            normal[0], normal[1], normal[2], 0.0,
            0.0, 0.0, 0.0, 1.0);

        mat4.mul(transform, transform, rotation);

        switch (this._type) {
            case Label.Type.Static:
                this.staticTransform = mat4.clone(transform);
                this.dynamicTransform = gl_matrix_extensions.m4();
                break;
            case Label.Type.Dynamic:
                this.staticTransform = gl_matrix_extensions.m4();
                this.dynamicTransform = mat4.clone(transform);
                break;
            default:
        }

        /* Check whether or not to (re)typeset and reset alterations. */


        this._altered.reset();
        this._text.altered = false;
        this._color.altered = false;

        if (!typeset) {
            return undefined;
        }
        const vertices = this.vertices();
        Typesetter.typeset(this, vertices);
        return vertices;
    }

    /**
     * Sets the 3D position of the label's reference point.
     */
    set position(position: vec3 | tuples.GLfloat3) {
        this._position = vec3.clone(position);
        this._altered.alter(this._type);
    }
    get position(): vec3 | tuples.GLfloat3 {
        return this._position;
    }

    /**
     * Sets the 3D direction of the label, i.e., the direction of the baseline.
     */
    set direction(direction: vec3 | tuples.GLfloat3) {
        vec3.normalize(this._direction, direction);
        this._altered.alter(this._type);
    }
    get direction(): vec3 | tuples.GLfloat3 {
        return this._direction;
    }

    /**
     * Sets the up-vector of the label. It should be orthogonal to the direction to ensure that the label is not skewed.
     */
    set up(up: vec3 | tuples.GLfloat3) {
        this._up = vec3.normalize(this._up, up);
        this._altered.alter(this._type);
    }
    get up(): vec3 | tuples.GLfloat3 {
        return this._up;
    }

    /**
     * This unit is used for the font size. This method overrides the super.fontSizeUnit, since `Position3DLabel` only
     * supports world unit for now. Neither pixel (px) nor point (pt) are supported.
     * (@see {@link fontSize})
     * @param unit - Unit to be used, though, this label type only supports world units.
     */
    set fontSizeUnit(unit: Label.Unit) {
        auxiliaries.logIf(unit !== Label.Unit.World, auxiliaries.LogLevel.Warning,
            `font size unit other than 'world' are not supported in position-3d-label, given ${unit}`);
    }
    get fontSizeUnit(): Label.Unit {
        return this._fontSizeUnit;
    }

}
