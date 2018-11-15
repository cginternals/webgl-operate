
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

import { assert, log, LogLevel } from '../auxiliaries';

import { FontFace } from './fontface';
import { GlyphVertices } from './glyphvertices';
import { Label } from './label';
import { Text } from './text';

import { Typesetter } from './typesetter';


/**
 * A Label that can be positioned in 2D space. The unit for positions, size and transformations, is pixel (px).
 */
export class Position2DLabel extends Label {

    /** @see {@link position} */
    protected _position: vec2;
    /** @see {@link direction} */
    protected _direction: vec2;

    /**
     * Constructs a pre-configured 2D-label with given text
     * @param text - The text that is displayed by this label.
     * @param fontFace - The font face that should be used for that label, or undefined if set later.
     */
    constructor(text: Text, fontFace?: FontFace) {
        super(text, Label.Type.Static, fontFace);
        this._position = vec2.fromValues(0.0, 0.0);
        this._direction = vec2.fromValues(1.0, 0.0);

        this._fontSize = 20;
        this._fontSizeUnit = Label.SpaceUnit.Px;
    }

    /**
     * Applies its position and direction, then prepares the vertex storage so that the Typesetter can typeset this
     * label.
     * @param frameSize - The width and height of the frame, so that sizes can be calculated to use pixel units.
     * @returns - The transformed glyph vertices.
     */
    typeset(frameSize: [number, number]): GlyphVertices {
        /** @todo assert: this.fontSizeUnit === Label.SpaceUnit.Px or, later, === Label.SpaceUnit.Pt */
        assert(!!this.fontFace, `expected a font face for this label before typesetting`);

        /** @todo meaningful margins from label.margins or config.margins ? */
        const margins: vec4 = vec4.create();
        /** @todo meaningful ppiScale from label.ppiScale or config.ppiScale ? */
        const ppiScale = 1;

        /* compute transform matrix */
        const transform = mat4.create();

        /* translate to lower left in NDC */
        mat4.translate(transform, transform, vec3.fromValues(-1.0, -1.0, 0.0));
        /* scale glyphs to NDC size, this._frameSize should be the viewport size */
        mat4.scale(transform, transform, vec3.fromValues(2.0 / frameSize[0], 2.0 / frameSize[1], 1.0));

        /* scale glyphs to pixel size with respect to the displays ppi */
        mat4.scale(transform, transform, vec3.fromValues(ppiScale, ppiScale, ppiScale));

        /* translate to origin in point space - scale origin within margined extend
         * (i.e., viewport with margined areas removed)
         */
        const marginedExtent: vec2 = vec2.create();
        vec2.sub(marginedExtent, vec2.fromValues(
            frameSize[0] / ppiScale, frameSize[1] / ppiScale),
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

        /** use the setter to trigger label.transform.altered */
        this.staticTransform = mat4.rotateZ(transform, transform, angle);

        const vertices = this.prepareVertexStorage();
        Typesetter.typeset(this, vertices);

        return vertices;
    }

    /**
     * Sets the 2D position of the label's reference point (i.e. lower left corner for horizontal alignment).
     */
    set position(xy: vec2) {
        this._position = vec2.clone(xy);
    }
    get position(): vec2 {
        return this._position;
    }

    /**
     * Sets 2D position parameters as specified in OpenLL. Position is the label's reference point (i.e. lower left
     * corner for horizontal alignment).
     * @param x - x coordinate of the 2D position
     * @param y - y coordinate of the 2D position
     * @param unit - the unit to interpret the coordinates
     */
    setPosition(x: number, y: number, unit?: Label.SpaceUnit): void {
        /** @todo assert that SpaceUnit is px or pt; transform to NDC? */
        this._position = vec2.fromValues(x, y);
    }

    /**
     * Sets the 2D direction of the label, i.e., the direction of the baseline.
     */
    set direction(xy: vec2) {
        vec2.normalize(this._direction, xy);
    }
    get direction(): vec2 {
        return this._direction;
    }

    /**
     * Sets the 2D direction parameters as specified in OpenLL. The labels's direction is the direction of its baseline.
     * @param x - x coordinate of the 2D direction vector.
     * @param y - y coordinate of the 2D direction vector.
     */
    setDirection(x: number, y: number): void {
        this.direction = vec2.fromValues(x, y);
    }

    /**
     * This unit is used for the font size. This method overrides the super.fontSizeUnit, since a position2dlabel only
     * allows px, not World.
     * (@see {@link fontSize})
     * @param newUnit - unused, since there is only one allowed unit (Px) for this kind of label
     */
    set fontSizeUnit(newUnit: Label.SpaceUnit) {
        log(LogLevel.Warning, `New SpaceUnit ${newUnit} not set; only allowed SpaceUnit is Px for this label.`);
    }

}
