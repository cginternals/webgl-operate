
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

import { ChangeLookup } from './changelookup';
import { Color } from './color';
import { FontFace } from './fontface';
import { GlyphVertices } from './glyphvertices';
import { Label } from './label';
import { Text } from './text';
import { Typesetter } from './typesetter';


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
        this._position = vec2.fromValues(0, 0);
        this._direction = vec2.fromValues(1, 0);
    }

    protected updateTransform(): void {

        const newTransform = mat4.create();

        const angle = vec2.angle(vec2.fromValues(1, 0), this._direction);
        mat4.rotateZ(newTransform, newTransform, angle);
        mat4.translate(newTransform, newTransform, vec3.fromValues(this._position[0], this._position[1], 0));

        this.transform = newTransform;
    }

    typeset(frameSize: [number, number]): GlyphVertices {
        // label.transform is set through .position and .direction

        // TODO assert: this.fontSizeUnit === Label.SpaceUnit.Px

        // TODO meaningful margins from label.margins or config.margins ?
        const margins: vec4 = vec4.create();
        // TODO meaningful ppiScale from label.ppiScale or config.ppiScale ?
        const ppiScale = 1;

        // compute transform matrix
        const transform = mat4.create();

        // translate to lower left in NDC
        // mat4.scale(transform, transform, vec3.fromValues(1.0, frameSize[1] / frameSize[0], 1.0));
        mat4.translate(transform, transform, vec3.fromValues(-1.0, -1.0, 0.0));
        // scale glyphs to NDC size
        // this._frameSize should be the viewport size
        mat4.scale(transform, transform, vec3.fromValues(2.0 / frameSize[0], 2.0 / frameSize[1], 1.0));

        // scale glyphs to pixel size with respect to the displays ppi
        mat4.scale(transform, transform, vec3.fromValues(ppiScale, ppiScale, ppiScale));

        // translate to origin in point space - scale origin within
        // margined extend (i.e., viewport with margined areas removed)
        const marginedExtent: vec2 = vec2.create();
        vec2.sub(marginedExtent, vec2.fromValues(
            frameSize[0] / ppiScale, frameSize[1] / ppiScale),
            vec2.fromValues(margins[3] + margins[1], margins[2] + margins[0]));

        const v3 = vec3.fromValues(0.5 * marginedExtent[0], 0.5 * marginedExtent[1], 0);
        vec3.add(v3, v3, vec3.fromValues(margins[3], margins[2], 0.0));
        mat4.translate(transform, transform, v3);

        this.transform = mat4.mul(this.transform, this.transform, transform);

        const vertices = this.prepareVertexStorage();
        Typesetter.typeset(this, vertices, 0);

        return vertices;
    }

    /**
     * Sets the 2D position of the label's reference point (i.e. lower left corner for horizontal alignment)
     */
    set position(xy: vec2) {
        this._position = vec2.clone(xy);
        this.updateTransform();
    }

    get position(): vec2 {
        return this._position;
    }

    /** position parameters as specified in OpenLL */
    setPosition(x: number, y: number, unit?: Label.SpaceUnit): void {
        // todo: assert that SpaceUnit is px or pt; transform to NDC
        this._position = vec2.fromValues(x, y);
        this.updateTransform();
    }

    set direction(xy: vec2) {
        this._direction = vec2.clone(xy);
        this.updateTransform();
    }

    get direction(): vec2 {
        return this._direction;
    }

    setDirection(x: number, y: number): void {
        this._direction = vec2.fromValues(x, y);
        this.updateTransform();
    }
}

