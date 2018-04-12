
import { vec3, vec4 } from 'gl-matrix';


/**
 * Information required for rendering a single glyph. Technical this could be denoted as a vertex of a vertex cloud.
 */
export interface GlyphVertex {

    /**
     * Position of the glyph in normalized device coordinates.
     */
    origin: vec3;

    /**
     * Tangent vector (usually the label's baseline direction). The length of this vector is expected to be the advance
     * of this glyphs geometry in baseline direction, i.e., it is used to derive the vertices using simple addition.
     */
    tangent: vec3;

    /**
     * Bitangent vector (orthogonal to the label's baseline). The length of this vector is expected to be the height of
     * this glyphs geometry, i.e., it is used to derive the glyph vertices using simple addition.
     */
    up: vec3;

    /**
     * Sub image rect of the glyph in the glyph texture (uv-coordinates).
     */
    uvRect: vec4;
}

/**
 * Vertex cloud that describes each glyph that is to be rendered on the screen.
 */
export class GlyphVertices extends Array<GlyphVertex> {

    optimize() {

    }

}


// protected _superSampling: SuperSampling;


// export enum Sampling {
//     None = 'none',
//     Grid2 = 'grid2',
//     Grid3 = 'grid3',
//     Grid4 = 'grid4',
//     Quincunx = 'quincunx',
//     RGSS = 'rgss',
//     Rooks8 = 'rooks8',
// }


// get superSampling(): SuperSampling {
//     return this._superSampling;
// }

// set superSampling(superSampling: SuperSampling) {
//     this._superSampling = superSampling;
// }




//     // numDepictable
//     // Extent(): number {
//     //     let count = 0;
//     //     for (let c of this._text) {

//     //         /**
//     //          * let number = "h".charCodeAt(0); //(returns number = 104)
//     //          * let char = String.fromCharCode(number); //(returns char = "h")
//     //          */

//     //         if (this._fontFace.depictable(c.charCodeAt(0))) {
//     //             ++count;
//     //         }
//     //     }
//     //     return count;
//     // }



//     protected _additionalTransform: mat4;
//     protected _transformValid: boolean;
//     protected _transform: mat4;




//     // public setFromConfig(config: GlyphSequenceConfig) {
//     //     this.wordWrap = config.wordWrap;
//     //     this.lineWidth = config.lineWidth;
//     //     this.alignment = config.alignment;
//     //     this.lineAnchor = config.anchor;
//     //     this.fontColor = config.fontColor;
//     //     this.fontFace = config.fontFace;
//     //     this.fontSize = config.fontSize;
//     //      }

//     // get additionalTransform(): mat4 {
//     //     return this._additionalTransform;
//     // }

//     // set additionalTransform(additionalTransform: mat4) {
//     //     this._transformValid = false;
//     //     this._additionalTransform = additionalTransform;
//     // }

//     // get transform(): mat4 {
//     //     if (!this._transformValid) {
//     //         this.computeTransform();
//     //         this._transformValid = true;
//     //     }
//     //     return this._transform;
//     // }

//     // public computeTransform(): void {
//     //     //assert(this._fontFace);

//     //     this._transform = mat4.create();
//     //     mat4.multiply(this._transform, this._transform, this._additionalTransform);

//     //     let s = this._fontSize / this._fontFace.size;

//     //     mat4.scale(this._transform, this._transform, vec3.fromValues(s, s, s))
//     // }
