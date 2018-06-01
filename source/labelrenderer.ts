

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

/** TODO GlyphSequenceConfig --> LabelConfig */
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
