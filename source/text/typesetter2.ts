
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
type Line = [number, number, number];


/**
 * The typesetter is responsible for layouting text on the screen or in a virtual space. It takes a label,
 * which defines where it wants to appear (@see {@link Label}), and a font face that is used to display the
 * text, and computes the actual position for each glyph. Its output is a vertex array, which describes the glyphs
 * position and appearance on the screen/in the scene and which can be rendered using a LabelRenderPass.
 */
export class Typesetter2 {

    private static readonly DELIMITERS: string = '\x0A ,.-/()[]<>';

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
     * Compute an initial line anchor w.r.t. the targeted anchoring.
     * @param label - Label to adjust the y-positions for.
     */
    private static lineAnchorOffset(label: Label): number {
        switch (label.lineAnchor) {
            case Label.LineAnchor.Ascent:
                return label.fontFace!.ascent;
            case Label.LineAnchor.Center:
                return label.fontFace!.size * 0.5 + label.fontFace!.descent;
            case Label.LineAnchor.Descent:
                return label.fontFace!.descent;
            case Label.LineAnchor.Top:
                return label.fontFace!.base;
            case Label.LineAnchor.Bottom:
                return label.fontFace!.base - label.fontFace!.lineHeight;
            case Label.LineAnchor.Baseline:
            default:
                return 0.0;
        }
    }


    /**
     * Resolves a typed float array storing the advances of each of the label's characters.
     * @param label - Label to resolve advances for.
     * @returns - A typed float array of all ordered character advances.
     */
    private static advances(label: Label): Float32Array {
        assert(label.fontFace !== undefined, `expected a font face for label in order to resolve advances`);

        const advances = new Float32Array(label.length);
        for (let i = 0; i < label.length; ++i) {
            const charCode = label.charCodeAt(i);
            advances[i] = label.fontFace!.glyph(charCode).advance;
        }
        return advances;
    }

    /**
     * Resolves a typed float array storing the kernings of each of the label's characters.
     * @param label - Label to resolve kernings for.
     * @returns - A typed float array of all ordered character kernings.
     */
    private static kernings(label: Label): Float32Array {
        assert(label.fontFace !== undefined, `expected a font face for label in order to resolve kernings`);

        const kernings = new Float32Array(label.length);
        for (let i = 0; i < label.length; ++i) {
            const kerning = label.kerningAfter(i);
            kernings[i] = isNaN(kerning) ? 0.0 : kerning;
        }
        return kernings;
    }


    /**
     * Create array of word, delimiter, and line feed fragments. A fragment thereby denotes the start and exclusive end
     * index as well as the type. The array is intended to favor maintainability over performance.
     * @param label -
     * @returns -
     */
    private static fragments(label: Label): Array<Fragment> {

        const fragments = new Array<Fragment>();

        let isDelimiter: boolean;
        let currentWordIndex = 0;
        for (let i = 0; i < label.length; ++i) {

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

        return fragments;
    }

    /**
     * Compute fragment widths without kernings w.r.t. preceding and subsequent fragments.
     * @param fragments -
     * @param advances -
     * @param kernings -
     * @returns -
     */
    private static fragmentWidths(fragments: Array<Fragment>,
        advances: Float32Array, kernings: Float32Array): Float32Array {

        const widths = new Float32Array(fragments.length);
        for (let i = 0; i < fragments.length; ++i) {
            const fragment = fragments[i];
            widths[i] = advances.subarray(fragment[0], fragment[1]).reduce((width, advance, index) =>
                width + advance + (index < fragment[1] ? kernings[index] : 0.0), 0.0);
        }
        return widths;
    }

    /**
     * Computes origin, tangent, and up vector for every vertex of in the given range.
     * @param transform - Transformation to apply to every vertex.
     * @param vertices - Glyph vertices to be transformed (expected untransformed, in typesetting space).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    private static transformVertex(transform: mat4,
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
    private static transformAlignment(width: number, alignment: Label.Alignment,
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
     * Create and transform glyph vertices for rendering.
     * @param label -
     * @param vertices -
     * @param lines -
     */
    private static transform(label: Label, vertices: GlyphVertices, lines: Array<Line>): void {
        for (const line of lines) {
            Typesetter2.transformAlignment(line[2], label.alignment, vertices, line[0], line[1]);
            Typesetter2.transformVertex(label.staticTransform, vertices, line[0], line[1]);
        }
    }


    /**
     * Typesets the given label, transforming the vertices in-world, ready to be rendered.
     * @param label - The label that is to be typeset.
     * @param vertices - The glyph vertices, a prepared (optionally empty) vertex storage.
     */
    static typeset(label: Label, vertices: GlyphVertices): void {
        if (label.length === 0) {
            return;
        }

        assert(label.fontFace !== undefined, `expected a font face for label before typesetting`);
        const fontFace = label.fontFace!;

        /* Retrieve advances, kernings, as well as line feed and delimiter indices. */

        const glyphs = (index: number): Glyph => fontFace.glyph(label.charCodeAt(index));

        const advances = Typesetter2.advances(label);
        const kernings = Typesetter2.kernings(label);

        const fragments = Typesetter2.fragments(label);
        const fragmentWidths = Typesetter2.fragmentWidths(fragments, advances, kernings);


        /* Typeset Lines. A line is a 3-tuple of start-index, end-index, and line width. The indices are referencing
        vertices of the glyph vertices. They cannot be reused for further typesetting. */

        const lines = new Array<Line>();
        let firstIndexOfLine = 0;

        const pen: vec2 = vec2.fromValues(0.0, -Typesetter2.lineAnchorOffset(label));

        let vertexIndex = 0;

        const elide = label.elide !== Label.Elide.None;

        if (elide) {

            // let ellipsisWidth = 0.0;

            // for(label.ellipsis.charCodeAt())

        }


        for (let i = 0; i < fragments.length; ++i) {

            const fragment = fragments[i];

            /* Elide takes precedence, since full line width is used, so every line break is omitted. */
            const lineFeed = !elide && fragment[2] === Typesetter2.FragmentType.LineFeed;
            let wordWrap = false;

            /* If word wrap is desired (no elide, no line feed already and label enabled), then keep words with
            subsequent delimiters into account. These should be moved to the next line together (not split). */
            if (!elide && !lineFeed && label.wrap) {
                const lookAhead = fragment[2] === Typesetter2.FragmentType.Word &&
                    i < fragments.length - 1 && fragments[i + 1][2] === Typesetter2.FragmentType.Delimiter;

                wordWrap = pen[0] + fragmentWidths[i] + (lookAhead ? fragmentWidths[i + 1] : 0) > label.lineWidth;
            }

            /* New line! Either line feed or word wrap made it. */
            if (lineFeed || wordWrap) {
                lines.push([firstIndexOfLine, vertexIndex, pen[0]]);
                firstIndexOfLine = vertexIndex;

                pen[0] = 0.0;
                pen[1] -= fontFace.lineHeight;

                /* In case of line feed, no additional vertex needs to be written. */
                if (lineFeed) {
                    continue;
                }
                vertexIndex = fragment[0];
            }

            /* Advance forward for the next word-fragment. */
            for (; vertexIndex < fragment[1]; ++vertexIndex) {
                Typesetter2.writeVertex(fontFace, pen, glyphs(vertexIndex), vertices.vertices[vertexIndex]);
                pen[0] += advances[vertexIndex] + kernings[vertexIndex];
            }
        }
        if (firstIndexOfLine < vertexIndex) {
            lines.push([firstIndexOfLine, vertexIndex, pen[0]]);
        }


        /* Apply transforms (alignment and static label transform) to all written vertices. */
        Typesetter2.transform(label, vertices, lines);
    }

}


export namespace Typesetter2 {

    export enum FragmentType {
        Word = 0,
        Delimiter = 1,
        LineFeed = 2,
    }

}
