
import { mat4, vec3 } from 'gl-matrix';

import { log, LogLevel } from './auxiliaries';
import { FontFace } from './fontface';
import { GlyphVertices } from './glyphvertices';
import { Label } from './label';
import { Text } from './text';
import { Typesetter } from './typesetter';


/**
 * A Label that can be positioned in 3D space. The unit for positions, size and transformations, is the abstract World
 * Unit.
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
        this._position = vec3.fromValues(0.0, 0.0, 0.0);
        this._direction = vec3.fromValues(1.0, 0.0, 0.0);
        this._up = vec3.fromValues(0.0, 1.0, 0.0);

        this._fontSizeUnit = Label.SpaceUnit.World;
    }

    /**
     * Applies its position, direction and up-vector, then prepares the vertex storage so that the Typesetter can
     * typeset this label.
     * @returns The transformed glyph vertices.
     */
    typeset(): GlyphVertices {
        /** @todo assert: this.fontSizeUnit === Label.SpaceUnit.World */

        const transform = mat4.create();
        const normal = vec3.create();

        /* apply user tranformations (position, direction) */

        mat4.translate(transform, mat4.create(),
            vec3.fromValues(this._position[0], this._position[1], this._position[2]));

        vec3.cross(normal, this._direction, this._up);

        const rotation = mat4.fromValues(this.direction[0], this.direction[1], this.direction[2], 0,
            this.up[0], this.up[1], this.up[2], 0,
            normal[0], normal[1], normal[2], 0,
            0.0, 0.0, 0.0, 1.0);

        this.transform = mat4.mul(this.transform, transform, rotation);

        const vertices = this.prepareVertexStorage();
        Typesetter.typeset(this, vertices, 0);

        return vertices;
    }

    /**
     * Sets the 3D position of the label's reference point (i.e. lower left corner for horizontal alignment).
     */
    set position(xyz: vec3) {
        this._position = vec3.clone(xyz);
    }
    get position(): vec3 {
        return this._position;
    }

    /**
     * Sets 3D position parameters as specified in OpenLL. Position is the label's reference point (i.e. lower left
     * corner for horizontal alignment).
     * @param x x coordinate of 3D position
     * @param y y coordinate of 3D position
     * @param z z coordinate of 3D position
     */
    setPosition(x: number, y: number, z: number): void {
        this._position = vec3.fromValues(x, y, z);
    }

    /**
     * Sets the 3D direction of the label, i.e., the direction of the baseline.
     */
    set direction(xyz: vec3) {
        vec3.normalize(this._direction, xyz);
    }
    get direction(): vec3 {
        return this._direction;
    }

    /**
     * Sets the 3D direction parameters as specified in OpenLL. The labels's direction is the direction of its baseline.
     * @param x x coordinate of the 3D direction vector.
     * @param y y coordinate of the 3D direction vector.
     * @param z z coordinate of the 3D direction vector.
     */
    setDirection(x: number, y: number, z: number): void {
        this.direction = vec3.fromValues(x, y, z);
    }

    /**
     * Sets the up-vector of the label. It should be orthogonal to the direction to ensure that the label is not skewed.
     */
    set up(xyz: vec3) {
        this._up = vec3.normalize(this._up, xyz);
    }
    get up(): vec3 {
        return this._up;
    }

    /**
     * Sets the 3D up-vector parameters as specified in OpenLL. It should be orthogonal to the direction to ensure that
     * the label is not skewed.
     * @param x x coordinate of the 3D up vector.
     * @param y y coordinate of the 3D up vector.
     * @param z z coordinate of the 3D up vector.
     */
    setUp(x: number, y: number, z: number): void {
        this.up = vec3.fromValues(x, y, z);
    }

    /**
     * This unit is used for the font size. This method overrides the super.fontSizeUnit, since a position3dlabel only
     * allows World, not Px nor Pt.
     * (@see {@link fontSize})
     * @param newUnit unused, since there is only one allowed unit (World) for this kind of label
     */
    set fontSizeUnit(newUnit: Label.SpaceUnit) {
        log(LogLevel.Warning, `New SpaceUnit ${newUnit} not set; only allowed SpaceUnit is World for this label.`);
    }
}

