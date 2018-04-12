
import { vec2, vec3 } from 'gl-matrix';

import { assert } from './auxiliaries';
import { FontFace } from './fontface';
import { Glyph } from './glyph';
import { GlyphVertex, GlyphVertices } from './glyphvertices';
import { Label } from './label';


/**
 * The typesetter is responsible for layouting text on the screen or in a virtual space. It takes a glyph sequence,
 * which defines where it wants to appear (@see {@link GlyphSequence}), and a font face that is used to display the
 * text, and computes the actual position for each glyph. Its output is a vertex array, which describes the glyphs
 * position and appearance on the screen/in the scene and which can be rendered using a GlyphRenderer.
 */
export class Typesetter {

    protected static readonly DELIMITERS: string = '\x0A ,.-/()[]<>';

    /**
     * This function internally performs the typesetting of a Label, but only returns its extent, disregarding the
     * resulting vertex array.
     */
    // extent(label: Label): vec2 {
    //     //return typeset(label, null, 0, true);
    // }


    // rectangle(label: Label, origin: vec3): [vec2, vec2] {
    //     let extent = Typesetter.extent(sequence);
    //     let offset = sequence.fontFace.lineHeight - sequence.fontFace.base;

    //     switch (sequence.lineAnchor) {
    //         case LineAnchor.Ascent:
    //             offset += sequence.fontFace.ascent;
    //             break;
    //         case LineAnchor.Center:
    //             offset += sequence.fontFace.size * 0.5 + sequence.fontFace.descent;
    //             break;
    //         case LineAnchor.Descent:
    //             offset += sequence.fontFace.descent;
    //             break;
    //         case LineAnchor.Top:
    //             offset += sequence.fontFace.base;
    //             break;
    //         case LineAnchor.Bottom:
    //             offset += sequence.fontFace.base - sequence.fontFace.lineHeight;
    //             break;
    //         case LineAnchor.Baseline:
    //         default:
    //             break;
    //     }
    //     origin[1] -= offset;

    //     let transformedOrigin = vec4.create();
    //     vec4.transformMat4(transformedOrigin, vec4.fromValues(origin[0], origin[1], origin[2], 1.0), sequence.transform);


    //     switch (sequence.alignment) {
    //         case Alignment.LeftAligned:
    //             offset = 0.0;
    //             break;
    //         case Alignment.Centered:
    //             offset = 0.5 * extent[0];
    //             break;
    //         case Alignment.RightAligned:
    //             offset = extent[0];
    //             break;
    //         default:
    //             break;
    //     }

    //     transformedOrigin[0] -= offset;
    //     return [vec2.fromValues(transformedOrigin[0], transformedOrigin[1]), extent];
    // }

    protected static wordWrap(label: Label, pen: vec2, glyph: Glyph, index: number, safeForwardIndex: number): boolean {
        assert(label.wordWrap, `expected wordWrap to be enabled for label, given ${label}`);
        const lineWidth = label.lineWidth;

        const penForward = pen[0] + glyph.advance + (index > 0 ? label.kerningBefore(index) : 0.0);
        if (glyph.depictable() && penForward > lineWidth && (glyph.advance <= lineWidth || pen[0] > 0.0)) {
            return true;
        }
        if (index < safeForwardIndex) {
            return false;
        }
        // tslint:disable-next-line:prefer-const
        let forwardWidth = 0.0;
        safeForwardIndex = Typesetter.forward(label, index, forwardWidth);
        return forwardWidth <= lineWidth && (pen[0] + forwardWidth) > lineWidth;
    }

    /**
     * Accumulate glyph advances (including kerning) up to the next delimiter or line feed occurrence starting at
     * the given index for the given label.
     * @param label - Label to compute accumulated advances for.
     * @param begin - Index to start glyph advance accumulation at.
     * @param width - Out parameter: the accumulated width up to the next delimiter (reset to 0).
     * @returns - The index of the last character that was included in the forward accumulation.
     * @todo Perhaps switch to another approach, i.e., calculate the all advances between delimiters once and create
     * an index based lookup...
     */
    protected static forward(label: Label, begin: number, width: number): number {
        let index: number = begin;
        const iEnd: number = label.length;

        width = 0.0;
        while (index < iEnd && Typesetter.DELIMITERS.indexOf(label.charAt(index)) === -1) {
            if (index > 0) {
                width += label.kerningBefore(index);
            }
            width += label.advance(index);
            ++index;
        }
        return index;
    }

    /**
     * Revert advance of preceding, not depictable glyphs. Intended to be used, e.g., on line feed.
     * The given vertical extent is increased by the label's line height and the horizontal extent is set to either
     * 0 or the extent of the non-depictable characters.
     * @param label - Label to compute accumulated advances for.
     * @param index - In/out parameter: index to backtrack the advance of non-depictable glyphs.
     * @param begin - Index to start glyph advance accumulation at.
     * @param pen - In/out parameter: pen (typesetting position) to be used and adjusted.
     * @param extent - In/out parameter: extent to be adjusted.
     */
    protected static backward(label: Label, index: number, begin: number, pen: vec2, extent: vec2): void {
        while (index > begin) {
            const precedingGlyph = label.fontFace.glyph(label.charCodeAt(index));
            if (precedingGlyph.depictable()) {
                break;
            }
            pen[0] -= precedingGlyph.advance;
            --index;
        }
        extent[0] = Math.max(pen[0], extent[1]);
        extent[1] += label.fontFace.lineHeight;
    }

    /**
     * Adjusts the vertices for a line after typesetting (done due to line feed, word wrap, or end of line) w.r.t.
     * the targeted line alignment.
     * @param pen - Current typesetting position (probably the end of the line in typesetting space).
     * @param alignment - Targeted alignment, e.g., left, center, or right.
     * @param vertices - Glyph vertices for rendering to align the origins of (expected to be not yet transformed).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    protected static align(pen: vec2, alignment: Label.Alignment,
        vertices: GlyphVertices | undefined, begin: number, end: number): void {
        if (vertices === undefined || alignment === Label.Alignment.Left) {
            return;
        }

        let penOffset = -pen[0];
        if (alignment === Label.Alignment.Center) {
            penOffset *= 0.5;
        }

        /* Origin is expected to be in typesetting space (not transformed yet). */
        for (let i = begin; i < end; ++i) {
            vertices[i].origin[0] += penOffset;
        }
    }

    /**
     * Configuring the vertex for a given glyph to be renderer. If no vertex is given or the glyph is not depictable,
     * this method immediately exits at the beginning.
     * @param fontFace - Font face to be applied for setting up the vertex.
     * @param pen - Typesetting position which is the not-yet-transformed position the glyph will be rendered at.
     * @param glyph - Glyph that is to be rendered/configured.
     * @param vertex - Associated vertex to store data required for rendering.
     */
    protected static glyph(fontFace: FontFace, pen: vec2, glyph: Glyph, vertex: GlyphVertex | undefined): void {
        if (vertex === undefined || glyph.depictable() === false) {
            return;
        }

        const padding = fontFace.glyphTexturePadding;
        vertex.origin = vec3.fromValues(pen[0], pen[1], 0.0);
        vertex.origin[0] += glyph.bearing[0] - padding[3];
        vertex.origin[1] += glyph.bearing[1] - glyph.extent[1] + padding[0];

        vertex.tangent = vec3.fromValues(glyph.extent[0], 0.0, 0.0);
        vertex.up = vec3.fromValues(0.0, glyph.extent[1], 0.0);

        vertex.uvRect[0] = glyph.subTextureOrigin[0];
        vertex.uvRect[1] = glyph.subTextureOrigin[1];

        const upperRight = vec2.create();
        vec2.add(upperRight, glyph.subTextureOrigin, glyph.subTextureExtent);

        vertex.uvRect[2] = upperRight[0];
        vertex.uvRect[3] = upperRight[1];
    }


    static typeset(label: Label, vertices?: GlyphVertices, begin?: number): vec2 {
        /* Horizontal and vertical position at which typesetting takes place/arrived. */
        const pen = vec2.create();

        let vertexIndex = begin !== undefined ? begin : 0;
        const extent = vec2.create();

        const iBegin = 0;
        const iEnd: number = label.length;

        /* Index used to reduce the number of wordwrap forward passes. */
        // tslint:disable-next-line:prefer-const
        let safeForwardIndex = iBegin;
        let feedVertexIndex: number = vertexIndex;

        for (let index = iBegin; index !== iEnd; ++index) {
            const glyph = label.fontFace.glyph(label.charCodeAt(index));

            /* Handle line feeds as well as word wrap for next word (or next glyph if word exceeds the line width). */
            const feedLine = label.lineFeedAt(index) || (label.wordWrap &&
                Typesetter.wordWrap(label, pen, glyph, index, safeForwardIndex));

            if (feedLine) {
                /* Handle pen and extent w.r.t. non-depictable glyphs. */
                Typesetter.backward(label, index - 1, iBegin, pen, extent);
                /* Handle alignment (does nothing if vertices are not required/undefined). */
                Typesetter.align(pen, label.alignment, vertices, feedVertexIndex, vertexIndex);

                pen[0] = 0.0;
                pen[1] -= label.fontFace.lineHeight;

                feedVertexIndex = vertexIndex;

            } else if (index > iBegin) {
                pen[0] += label.kerningBefore(index);
            }

            /* Add and configure data for rendering the current character/glyph of the label. */
            Typesetter.glyph(label.fontFace, pen, glyph, vertices ? vertices[vertexIndex++] : undefined);

            /* ... todo */

            //     pen[0] += glyph.advance;

            //     if (i + 1 == iEnd) // handle alignment (when last line of sequence is processed)
            //     {
            //         Typesetter.extent(fontFace, sequence, i, iBegin, pen, extent);

            //         if (!dryrun) {
            //             typeset_align(pen, sequence.alignment, vertices, feedVertexIndex, vertexIndex);
            //         }
            //     }
            // }

            // if (!dryRun) {
            //     anchor_transform(sequence, vertices, begin, vertexIndex);
            //     vertex_transform(sequence.transform, sequence.fontColor, sequence.superSampling, vertices, begin, vertexIndex);
            // }
            // return extent_transform(sequence, extent);
        }




// function anchor_transform(sequence: GlyphSequence, vertices: Vertices, begin: number, end: number): void {

//     let offset: number = 0.0;

//     switch (sequence.lineAnchor) {
//         case LineAnchor.Ascent:
//             offset = sequence.fontFace.ascent;
//             break;
//         case LineAnchor.Center:
//             offset = sequence.fontFace.size * 0.5 + sequence.fontFace.descent;
//             break;
//         case LineAnchor.Descent:
//             offset = sequence.fontFace.descent;
//             break;
//         case LineAnchor.Top:
//             offset = sequence.fontFace.base;
//             break;
//         case LineAnchor.Bottom:
//             offset = sequence.fontFace.base - sequence.fontFace.lineHeight;
//             break;
//         case LineAnchor.Baseline:
//         default:
//             return;
//     }

//     for (let i: number = begin; i < end; ++i) {
//         let v = vertices[i];
//         v.origin[1] -= offset;
//     }
// }

// function vertex_transform(transform: mat4, fontColor: vec4, superSampling: SuperSampling | GLuint, vertices: Vertices, begin: number, end: number): void {
//     for (let i: number = begin; i < end; ++i) {
//         let v = vertices[i];

//         let ll: vec4 = vec4.create();
//         vec4.transformMat4(ll, vec4.fromValues(v.origin[0], v.origin[1], v.origin[2], 1.0), transform);

//         let lr: vec4 = vec4.create();
//         vec4.transformMat4(lr, vec4.fromValues(v.origin[0] + v.vtan[0], v.origin[1] + v.vtan[1], v.origin[2] + v.vtan[2], 1.0), transform);

//         let ul: vec4 = vec4.create();
//         vec4.transformMat4(ul, vec4.fromValues(v.origin[0] + v.vbitan[0], v.origin[1] + v.vbitan[1], v.origin[2] + v.vbitan[2], 1.0), transform);


//         v.origin = vec3.fromValues(ll[0], ll[1], ll[2])

//         let vtan: vec4 = vec4.create();
//         vec4.sub(vtan, lr, ll);
//         v.vtan = vec3.fromValues(vtan[0], vtan[1], vtan[2])

//         let vbitan: vec4 = vec4.create();
//         vec4.sub(vbitan, ul, ll);
//         v.vbitan = vec3.fromValues(vbitan[0], vbitan[1], vbitan[2])

//         v.fontColor = fontColor;
//         v.superSampling = superSampling;
//     }
// }

// function extent_transform(sequence: GlyphSequence, extent: vec2): vec2 {
//     let ll = vec4.create();
//     vec4.transformMat4(ll, vec4.fromValues(0.0, 0.0, 0.0, 1.0), sequence.transform);

//     let lr = vec4.create();
//     vec4.transformMat4(lr, vec4.fromValues(extent[0], 0.0, 0.0, 1.0), sequence.transform);

//     let ul = vec4.create();
//     vec4.transformMat4(ul, vec4.fromValues(0.0, extent[1], 0.0, 1.0), sequence.transform);

//     return vec2.fromValues(vec4.distance(lr, ll), vec4.distance(ul, ll));
// }
//     }
