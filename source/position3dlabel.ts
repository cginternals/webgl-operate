
import { mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';

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
export class Position3DLabel extends Label {

    protected _position: vec3;
    protected _direction: vec3;
    protected _up: vec3;

    /**
     * Constructs a pre-configured 3D-label with given text.
     * @param text - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instances VAO and VBOs.
     */
    constructor(text: Text, fontFace: FontFace) {
        super(text, fontFace);
        this._position = vec3.fromValues(0, 0, 0);
        this._direction = vec3.fromValues(1, 0, 0);
        this._up = vec3.fromValues(0, 1, 0);

        this._fontSizeUnit = Label.SpaceUnit.World;
    }

    typeset(): GlyphVertices {
        // TODO assert: this.fontSizeUnit === Label.SpaceUnit.World

        const transform = mat4.create();

        // default values; TODO: store default values in a constant, bc they are also needed for construction
        const direction: vec3 = vec3.fromValues(1, 0, 0);
        const up: vec3 = vec3.fromValues(0, 1, 0);
        const newN = vec3.create();

        // apply user tranformations (position, direction)

        mat4.translate(transform, mat4.create(), vec3.fromValues(this._position[0], this._position[1], 0));

        vec3.cross(newN, this._direction, this._up);

        const rotation = mat4.fromValues(this.direction[0], this.direction[1], this.direction[2], 0,
            this.up[0], this.up[1], this.up[2], 0,
            newN[0], newN[1], newN[2], 0,
            0, 0, 0, 1);

        this.transform = mat4.mul(this.transform, transform, rotation);

        const vertices = this.prepareVertexStorage();
        Typesetter.typeset(this, vertices, 0);

        return vertices;
    }

    /**
     * Sets the 2D position of the label's reference point (i.e. lower left corner for horizontal alignment)
     */
    set position(xyz: vec3) {
        this._position = vec3.clone(xyz);
    }

    get position(): vec3 {
        return this._position;
    }

    /** position parameters as specified in OpenLL */
    setPosition(x: number, y: number, z: number): void {
        this._position = vec3.fromValues(x, y, z);
    }

    set direction(xyz: vec3) {
        this._direction = vec3.normalize(this._direction, xyz);
    }

    get direction(): vec3 {
        return this._direction;
    }

    setDirection(x: number, y: number, z: number): void {
        this.direction = vec3.fromValues(x, y, z);
    }

    set up(xyz: vec3) {
        this._up = vec3.normalize(this._up, xyz);
    }

    get up(): vec3 {
        return this._up;
    }

    setUp(x: number, y: number, z: number): void {
        this.up = vec3.fromValues(x, y, z);
    }

    /**
     * This unit is used for the font size.
     * This method overrides the super.fontSizeUnit, since a position3dlabel only allows World, not px nor pt.
     * (@see {@link fontSize})
     */
    set fontSizeUnit(newUnit: Label.SpaceUnit) {
        console.warn('New SpaceUnit not set; only allowed SpaceUnit is World for this label.');
    }
}

