
/* spellchecker: disable */

import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { fromVec4, v4 } from '../gl-matrix-extensions';

import { assert } from '../auxiliaries';
import { GLfloat2 } from '../tuples';

import { FontFace } from './fontface';
import { Glyph } from './glyph';
import { GlyphVertex, GlyphVertices } from './glyphvertices';
import { Label } from './label';

/* spellchecker: enable */

type Fragment = [number, number, Typesetter2.FragmentType];

/**
 * The typesetter is responsible for layouting text on the screen or in a virtual space. It takes a label,
 * which defines where it wants to appear (@see {@link Label}), and a font face that is used to display the
 * text, and computes the actual position for each glyph. Its output is a vertex array, which describes the glyphs
 * position and appearance on the screen/in the scene and which can be rendered using a LabelRenderPass.
 */
export class Typesetter2 {

    protected static readonly DELIMITERS: string = '\x0A ,.-/()[]<>';

    /**
     * Configuring the vertex for a given glyph to be rendered. If no vertex is given or the glyph is not depictable,
     * this method immediately exits at the beginning.
     * @param fontFace - Font face to be applied for setting up the vertex.
     * @param pen - Typesetting position which is the not-yet-transformed position the glyph will be rendered at.
     * @param glyph - Glyph that is to be rendered/configured.
     * @param vertex - Out param: Associated vertex to store data required for rendering.
     */
    private static writeVertex(fontFace: FontFace, pen: vec2, glyph: Glyph,
        vertex: GlyphVertex | undefined): void {

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

    /**
     * Computes origin, tangent, and up vector for every vertex of in the given range.
     * @param transform - Transformation to apply to every vertex.
     * @param vertices - Glyph vertices to be transformed (expected untransformed, in typesetting space).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    protected static transformVertex(transform: mat4,
        vertices: GlyphVertices | undefined, begin: number, end: number): void {
        if (vertices === undefined || mat4.equals(transform, mat4.create())) {
            return;
        }

        for (let i: number = begin; i < end; ++i) {
            const v = vertices.vertices[i];

            const lowerLeft: vec4 = vec4.transformMat4(v4(), vec4.fromValues(
                v.origin[0], v.origin[1], v.origin[2], 1.0), transform);
            const lowerRight: vec4 = vec4.transformMat4(v4(), vec4.fromValues(
                v.origin[0] + v.tangent[0], v.origin[1] + v.tangent[1], v.origin[2] + v.tangent[2], 1.0), transform);
            const upperLeft: vec4 = vec4.transformMat4(v4(), vec4.fromValues(
                v.origin[0] + v.up[0], v.origin[1] + v.up[1], v.origin[2] + v.up[2], 1.0), transform);

            v.origin = fromVec4(lowerLeft);
            v.tangent = fromVec4(vec4.sub(v4(), lowerRight, lowerLeft));
            v.up = fromVec4(vec4.sub(v4(), upperLeft, lowerLeft));
        }
    }

    /**
     * Adjusts the vertices for a line after typesetting (done due to line feed, word wrap, or end of line) w.r.t.
     * the targeted line alignment.
     * @param width - Width of the line (e.g., typesetting position at the end of the line in typesetting space).
     * @param alignment - Targeted alignment, e.g., left, center, or right.
     * @param vertices - Glyph vertices for rendering to align the origins' x-components of (expected untransformed).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    protected static transformAlignment(width: number, alignment: Label.Alignment,
        vertices: GlyphVertices | undefined, begin: number, end: number): void {
        if (vertices === undefined || alignment === Label.Alignment.Left) {
            return;
        }

        let offset = -width;
        if (alignment === Label.Alignment.Center) {
            offset *= 0.5;
        }

        /* Origin is expected to be in typesetting space (not transformed yet). */
        for (let i = begin; i < end; ++i) {
            vertices.vertices[i].origin[0] += offset;
        }
    }


    /**
     * Typesets the given label, transforming the vertices in-world, ready to be rendered.
     * @param label - The label that is to be typeset.
     * @param vertices - The glyph vertices, a prepared (optionally empty) vertex storage.
     * @param begin - Vertex index to start the typesetting (usually 0).
     */
    static typeset(label: Label, vertices: GlyphVertices, begin?: number): void {
        if (label.length === 0) {
            return;
        }

        assert(label.fontFace !== undefined, `expected a font face for label before typesetting`);
        const fontFace = label.fontFace!;


        /* Retrieve advances, kernings, as well as line feed and delimiter indices. */

        const advances = new Float64Array(label.length);
        const kernings = new Float64Array(label.length);

        const glyphs = new Array<Glyph>(label.length);

        /* Create array of word, delimiter, and line feed fragments. */
        const fragments = new Array<Fragment>();

        let isDelimiter: boolean;
        let currentWordIndex = 0;
        for (let i = 0; i < label.length; ++i) {

            glyphs[i] = fontFace.glyph(label.charCodeAt(i));

            const kerningAfter = label.kerningAfter(i);
            advances[i] = glyphs[i].advance;
            kernings[i] = isNaN(kerningAfter) ? 0.0 : kerningAfter;

            isDelimiter = Typesetter2.DELIMITERS.indexOf(label.charAt(i)) > -1;
            if (!isDelimiter /* includes LineFeed */) {
                continue;
            }

            if (currentWordIndex < i) {
                /* Add previous word fragment (indicated by word index below current index). */
                fragments.push([currentWordIndex, i, Typesetter2.FragmentType.Word]);
            }
            const type = label.lineFeedAt(i) ? Typesetter2.FragmentType.LineFeed : Typesetter2.FragmentType.Delimiter;
            fragments.push([i, i + 1, type]);
            currentWordIndex = i + 1;
        }
        /* Account for last fragment that does not end with delimiter. */
        if (!isDelimiter!) {
            fragments.push([currentWordIndex, label.length, Typesetter2.FragmentType.Word]);
        }



        // /* Compute fragment widths. The widths does comprise kerning after. */

        // const fragmentWidths = new Float32Array(fragments.length);
        // for (let i = 0; i < fragments.length; ++i) {
        //     const fragment = fragments[i];
        //     fragmentWidths[i] = advances.subarray(fragment[0], fragment[1]).reduce((width, advance, index) =>
        //         width + advance + (index < fragment[1] ? kernings[index] : 0.0), 0.0);
        // }


        /* Typeset Lines. A line is a 3-tuple of start-index, end-index, and line width. */

        const lines = new Array<[number, number, number]>();
        let firstIndexOfLine = 0;

        const pen: vec2 = vec2.fromValues(0.0, 0.0);
        let index = 0;

        for (const fragment of fragments) {

            if (/* label.elide === Label.Elide.None && */ fragment[2] === Typesetter2.FragmentType.LineFeed) {
                lines.push([firstIndexOfLine, index, pen[0]]);

                pen[0] = 0.0;
                pen[1] -= fontFace.lineHeight;

                ++index;
                firstIndexOfLine = index;

                continue;
            }

            for (; index < fragment[1]; ++index) {
                Typesetter2.writeVertex(fontFace, pen, glyphs[index], vertices.vertices[index - lines.length]);
                pen[0] += advances[index] + kernings[index];
            }
        }
        if (firstIndexOfLine < index) {
            lines.push([firstIndexOfLine, index, pen[0]]);
        }


        /* Create glyph vertices for rendering. */

        for (let i = 0; i < lines.length; ++i) {
            /* Adjust line feeds that are not accounted for within the vertices (one per line). */
            const i0 = lines[i][0] - i;
            const i1 = lines[i][1] - i;

            Typesetter2.transformAlignment(lines[i][2], label.alignment, vertices, i0, i1);
            Typesetter2.transformVertex(label.transform, vertices, i0, i1);
        }
    }

}


export namespace Typesetter2 {

    export enum FragmentType {
        Word = 0,
        Delimiter = 1,
        LineFeed = 2,
    }

}
