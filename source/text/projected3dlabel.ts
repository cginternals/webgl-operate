
/* spellchecker: disable */

import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

import { auxiliaries } from '../auxiliaries';
import { Camera } from '../camera';
import { gl_matrix_extensions } from '../gl-matrix-extensions';
import { tuples } from '../tuples';

import { FontFace } from './fontface';
import { GlyphVertices } from './glyphvertices';
import { Label } from './label';
import { Text } from './text';
import { Typesetter } from './typesetter';

/* spellchecker: enable */


/**
 * A Label that can be positioned in 3D space, but projected onto a 2D plane (a.k.a. screen).
 * The unit for positioning is world space, the unit for size is pixel (px).
 */
export class Projected3DLabel extends Label {

    private static readonly DEFAULT_FONTSIZE_PX = 20;

    /** @see {@link position} */
    protected _position: vec3;
    /** @see {@link direction} */
    protected _direction: vec2;
    /** @see {@link camera} */
    protected _camera: Camera | undefined;


    /**
     * Constructs a pre-configured projected 3D-label with given text. Depending on the label type, transformations are
     * applied once when typesetting (static) or every frame during rendering (dynamic).
     * @param text - The text that is displayed by this label.
     * @param type - Either static or dynamic. If static is used, all transformations are baked and modifications to
     * on any of the label's transformations are expected to occur less often.
     * @param fontFace - The font face that should be used for that label, or undefined if set later.
     */
    constructor(text: Text, type: Label.Type, fontFace?: FontFace) {
        super(text, type, fontFace);
        this._position = vec3.fromValues(0.0, 0.0, 0.0);
        this._direction = vec2.fromValues(1.0, 0.0);

        this._fontSize = Projected3DLabel.DEFAULT_FONTSIZE_PX;
        this._fontSizeUnit = Label.Unit.Mixed;
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

        if (!this.valid || this._camera === undefined) {
            return new GlyphVertices(0);
        }

        /* Compute position and direction transform. */

        /** @todo meaningful margins from label.margins or config.margins ? */
        const margins: vec4 = vec4.create();
        /** @todo meaningful ppiScale from label.ppiScale or config.ppiScale ? */
        const ppiScale = 1;

        /* compute transform matrix */
        const transform = mat4.create();

        /* translate to lower left in NDC */
        mat4.translate(transform, transform, vec3.fromValues(-1.0, -1.0, 0.0));
        /* scale glyphs to NDC size */
        mat4.scale(transform, transform,
            vec3.fromValues(2.0 / this._camera.viewport[0], 2.0 / this._camera.viewport[1], 1.0));

        /* scale glyphs to pixel size with respect to the displays ppi */
        mat4.scale(transform, transform, vec3.fromValues(ppiScale, ppiScale, ppiScale));

        /* translate to origin in point space - scale origin within margined extend
         * (i.e., viewport with margined areas removed)
         */
        const marginedExtent: vec2 = vec2.create();
        vec2.sub(marginedExtent, vec2.fromValues(
            this._camera.viewport[0] / ppiScale, this._camera.viewport[1] / ppiScale),
            vec2.fromValues(margins[3] + margins[1], margins[2] + margins[0]));

        const v3 = vec3.fromValues(0.5 * marginedExtent[0], 0.5 * marginedExtent[1], 0);
        vec3.add(v3, v3, vec3.fromValues(margins[3], margins[2], 0.0));
        mat4.translate(transform, transform, v3);

        const anchor = vec4.fromValues(this._position[0], this._position[1], this._position[2], 1);

        vec4.transformMat4(anchor, anchor, this._camera.viewProjection);

        const translation = mat4.create();
        const w = anchor[3];
        mat4.translate(translation, translation, vec3.fromValues(anchor[0] / w, anchor[1] / w, anchor[2] / w));
        mat4.mul(transform, translation, transform);

        const n: vec2 = vec2.fromValues(1.0, 0.0);
        let angle = vec2.angle(n, this._direction);

        /* perp dot product for signed angle */
        if (n[0] * this._direction[1] - n[1] * this._direction[0] < 0.0) {
            angle = -angle;
        }

        mat4.rotateZ(transform, transform, angle);

        if (this._camera.viewProjectionInverse) {
            mat4.mul(transform, this._camera.viewProjectionInverse, transform);
        } else {
            auxiliaries.log(auxiliaries.LogLevel.Warning, `camera.viewProjectionInverse is null`);
        }

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
     * The camera is used to retrieve (1) the view projection matrix, and (2) the width and height of targeted frame.
     * (1) is used to project the 3D label as a 2D label, (2) is used to calculate the font size in px units.
     * Setting the camera invalidates the transform.
     */
    set camera(camera: Camera | undefined) {
        this._camera = camera;
        this._altered.alter(this._type);
    }
    get camera(): Camera | undefined {
        return this._camera;
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
     * Sets the 2D direction of the label, i.e., the direction of the baseline.
     */
    set direction(direction: vec2 | tuples.GLfloat2) {
        vec2.normalize(this._direction, direction);
        this._altered.alter(this._type);
    }
    get direction(): vec2 | tuples.GLfloat2 {
        return this._direction;
    }

    /**
     * This unit is used for the font size. This method overrides the super.fontSizeUnit, since `Projected3DLabel` only
     * supports Pixel, for now.
     * (@see {@link fontSize})
     * @param newUnit - Unit to be used, though, this label type only supports pixel units (px).
     */
    set fontSizeUnit(unit: Label.Unit) {
        auxiliaries.logIf(unit !== Label.Unit.Mixed, auxiliaries.LogLevel.Warning,
            `font size unit other than 'px' are not supported in projected-3d-label, given ${unit}`);
    }
    get fontSizeUnit(): Label.Unit {
        return this._fontSizeUnit;
    }
}
