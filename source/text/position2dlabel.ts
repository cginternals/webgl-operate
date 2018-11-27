
/* spellchecker: disable */

import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

import { logIf, LogLevel } from '../auxiliaries';
import { m4, v2 } from '../gl-matrix-extensions';
import { GLfloat2 } from '../tuples';

import { FontFace } from './fontface';
import { GlyphVertices } from './glyphvertices';
import { Label } from './label';
import { Text } from './text';

import { Typesetter } from './typesetter';


/* spellchecker: enable */


/**
 * A Label that can be positioned in 2D space. The unit for positions, size and transformations, is pixel (px).
 */
export class Position2DLabel extends Label {

    private static readonly DEFAULT_FONTSIZE_PX = 20;

    /** @see {@link position} */
    protected _position: vec2;
    /** @see {@link direction} */
    protected _direction: vec2;
    /** @see {@link frameSize} */
    protected _frameSize: vec2;


    /**
     * Constructs a pre-configured 2D-label with given text
     * @param text - The text that is displayed by this label.
     * @param fontFace - The font face that should be used for that label, or undefined if set later.
     */
    constructor(text: Text, type: Label.Type, fontFace?: FontFace) {
        super(text, type, fontFace);
        this._position = vec2.fromValues(0.0, 0.0);
        this._direction = vec2.fromValues(1.0, 0.0);

        this._frameSize = vec2.create();

        this._fontSize = Position2DLabel.DEFAULT_FONTSIZE_PX;
        this._fontSizeUnit = Label.Unit.Pixel;
    }

    /**
     * If altered, creates a position and direction-vector, then prepares the vertex storage and invokes
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

        /** @todo meaningful margins from label.margins or config.margins ? */
        const margins: vec4 = vec4.create();
        /** @todo meaningful ppiScale from label.ppiScale or config.ppiScale ? */
        const ppiScale = 1;

        /* compute transform matrix */
        const transform = mat4.create();

        /* translate to lower left in NDC */
        mat4.translate(transform, m4(), vec3.fromValues(-1.0, -1.0, 0.0));
        /* scale glyphs to NDC size, this._frameSize should be the viewport size */
        mat4.scale(transform, transform, vec3.fromValues(2.0 / this._frameSize[0], 2.0 / this._frameSize[1], 1.0));

        /* scale glyphs to pixel size with respect to the displays ppi */
        mat4.scale(transform, transform, vec3.fromValues(ppiScale, ppiScale, ppiScale));

        /* translate to origin in point space - scale origin within margined extend
         * (i.e., viewport with margined areas removed)
         */
        const marginedExtent = vec2.sub(v2(), vec2.fromValues(
            this._frameSize[0] / ppiScale, this._frameSize[1] / ppiScale),
            vec2.fromValues(margins[3] + margins[1], margins[2] + margins[0]));

        const v3 = vec3.fromValues(0.5 * marginedExtent[0], 0.5 * marginedExtent[1], 0);
        vec3.add(v3, v3, vec3.fromValues(margins[3], margins[2], 0.0));
        mat4.translate(transform, transform, v3);


        /* apply user transformations (position, direction) */
        mat4.translate(transform, transform, vec3.fromValues(this._position[0], this._position[1], 0));

        const n: vec2 = vec2.fromValues(1.0, 0.0);
        let angle = vec2.angle(n, this._direction);

        /* perp dot product for signed angle */
        if (n[0] * this._direction[1] - n[1] * this._direction[0] < 0.0) {
            angle = -angle;
        }

        mat4.rotateZ(transform, transform, angle);

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
     * Width and height of targeted frame used to account for font size in px or pt units. Changing the frame size
     * invalidates the transform.
     */
    set frameSize(size: vec2 | GLfloat2) {
        if (vec2.equals(this._frameSize, size)) {
            return;
        }
        vec2.max(this._frameSize, size, [1.0, 1.0]);
        this._altered.alter(this._type);
    }
    get frameSize(): vec2 | GLfloat2 {
        return this._frameSize;
    }

    /**
     * Sets the 2D position of the label's reference point.
     */
    set position(position: vec2 | GLfloat2) {
        this._position = vec2.clone(position);
        this._altered.alter(this._type);
    }
    get position(): vec2 | GLfloat2 {
        return this._position;
    }

    /**
     * Sets the 2D direction of the label, i.e., the direction of the baseline.
     */
    set direction(direction: vec2 | GLfloat2) {
        vec2.normalize(this._direction, direction);
        this._altered.alter(this._type);
    }
    get direction(): vec2 | GLfloat2 {
        return this._direction;
    }

    /**
     * This unit is used for the font size. This method overrides the super.fontSizeUnit, since `Position2DLabel` only
     * supports Pixel, for now.
     * (@see {@link fontSize})
     * @param newUnit - Unit to be used, though, this label type only supports pixel units (px).
     */
    set fontSizeUnit(unit: Label.Unit) {
        logIf(unit !== Label.Unit.Pixel, LogLevel.Warning,
            `font size unit other than 'px' are not supported in position-2d-label, given ${unit}`);
    }
    get fontSizeUnit(): Label.Unit {
        return this._fontSizeUnit;
    }

}
