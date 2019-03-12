
/* spellchecker: disable */

import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

import { assert } from '../auxiliaries';
import { v3 } from '../gl-matrix-extensions';

import { FontFace } from './fontface';
import { Glyph } from './glyph';
import { GlyphVertices } from './glyphvertices';
import { Label } from './label';

/* spellchecker: enable */


type Fragment = [number, number, Typesetter.FragmentType];
type Line = [number, number, number];


/**
 * The typesetter is responsible for layouting text on the screen or in a virtual space. It takes a label,
 * which defines where it wants to appear (@see {@link Label}), and a font face that is used to display the
 * text, and computes the actual position for each glyph. Its output is a vertex array, which describes the glyphs
 * position and appearance on the screen/in the scene and which can be rendered using a LabelRenderPass.
 */
export class Typesetter {

    private static readonly DELIMITERS: string = '\x0A ,.-/()[]<>';

    /**
     * Configuring the vertex for a given glyph to be rendered. If no vertex is given or the glyph is not depictable,
     * this method immediately exits at the beginning.
     * @param fontFace - Font face to be applied for setting up the vertex.
     * @param pen - Typesetting position which is the not-yet-transformed position the glyph will be rendered at.
     * @param glyph - Glyph that is to be rendered/configured.
     * @param vertices - Glyph vertex store required for rendering.
     * @param index - Glyph vertex index for store manipulation.
     */
    private static writeVertex(fontFace: FontFace, pen: vec2, glyph: Glyph,
        vertices: GlyphVertices | undefined, index: number): void {

        if (vertices === undefined || glyph.depictable() === false) {
            return;
        }

        // Please be aware that all vertices getter return typed views on a big float32array.
        // As a consequence do strictly rely on in-place operations only.

        const padding = fontFace.glyphTexturePadding;
        const origin: vec3 = vertices.origin(index);
        vec3.set(origin, pen[0], pen[1], 0.0);
        origin[0] += glyph.bearing[0] - padding[3];
        origin[1] += glyph.bearing[1] - glyph.extent[1];

        vec3.set(vertices.tangent(index), glyph.extent[0], 0.0, 0.0);
        vec3.set(vertices.up(index), 0.0, glyph.extent[1], 0.0);

        const lowerLeft: vec2 = vertices.uvLowerLeft(index);
        vec2.copy(lowerLeft, glyph.subTextureOrigin);

        const upperRight: vec2 = vertices.uvUpperRight(index);
        vec2.add(upperRight, glyph.subTextureOrigin, glyph.subTextureExtent);
    }


    /**
     * Compute an initial line anchor w.r.t. the targeted anchoring.
     * @param label - Label to adjust the y-positions for.
     */
    private static lineAnchorOffset(label: Label): number {
        let offset = 0.0;

        const padding = label.fontFace!.glyphTexturePadding;
        const fontFace = label.fontFace!;
        switch (label.lineAnchor) {
            case Label.LineAnchor.Baseline:
            default:
                offset = - padding[0];
                break;
            case Label.LineAnchor.Ascent:
                offset = fontFace.ascent - padding[0];
                break;
            case Label.LineAnchor.Descent:
                offset = fontFace.descent * (1.0 + padding[0] / fontFace.ascent);
                break;
            case Label.LineAnchor.Center:
                offset = fontFace.ascent - padding[0] - 0.5 * fontFace.size;
                break;
            case Label.LineAnchor.Top:
                offset = fontFace.ascent - padding[0] + 0.5 * fontFace.lineGap;
                break;
            case Label.LineAnchor.Bottom:
                offset = fontFace.ascent - padding[0] + 0.5 * fontFace.lineGap - fontFace.lineHeight;
                break;
        }
        return offset;
    }


    /**
     * Resolves a typed float array storing the advances of each of the label's characters.
     * @param label - Label to resolve advances for.
     * @param text - Text to compute advances for, if none is given, label.text is used.
     * @returns - A typed float array of all ordered character advances.
     */
    private static advances(label: Label, text?: string): Float32Array {
        assert(label.fontFace !== undefined, `expected a font face for label in order to resolve advances`);
        if (text === undefined) {
            text = label.text.text;
        }

        const advances = new Float32Array(text.length);
        for (let i = 0; i < text.length; ++i) {
            const charCode = text.charCodeAt(i);
            advances[i] = label.fontFace!.glyph(charCode).advance;
        }
        return advances;
    }

    /**
     * Resolves a typed float array storing the kernings of each of the label's characters.
     * @param label - Label to resolve kernings for.
     * @param text - Text to compute advances for, if none is given, label.text is used.
     * @returns - A typed float array of all ordered character kernings.
     */
    private static kernings(label: Label, text?: string): Float32Array {
        assert(label.fontFace !== undefined, `expected a font face for label in order to resolve kernings`);

        if (text === undefined) {
            const kernings = new Float32Array(label.length);
            for (let i = 0; i < label.length; ++i) {
                const kerning = label.kerningAfter(i);
                kernings[i] = isNaN(kerning) ? 0.0 : kerning;
            }
            return kernings;
        }

        const kerningAfter = (index: number): number => {
            if (index < 0 || index > text!.length - 1) {
                return NaN;
            }
            return label.fontFace!.kerning(text!.charCodeAt(index), text!.charCodeAt(index + 1));
        };

        const kernings = new Float32Array(text.length);
        for (let i = 0; i < text.length; ++i) {
            const kerning = kerningAfter(i);
            kernings[i] = isNaN(kerning) ? 0.0 : kerning;
        }
        return kernings;
    }


    /**
     * Create array of word, delimiter, and line feed fragments. A fragment thereby denotes the start and exclusive end
     * index as well as the type. The array is intended to favor maintainability over performance.
     * @param label - Label to create fragments for.
     * @returns - Fragments, i.e., indices ranges and associated fragment type (word, linefeed, delimiter).
     */
    private static fragments(label: Label): Array<Fragment> {

        const fragments = new Array<Fragment>();

        let isDelimiter: boolean;
        let currentWordIndex = 0;
        for (let i = 0; i < label.length; ++i) {

            isDelimiter = Typesetter.DELIMITERS.indexOf(label.charAt(i)) > -1;
            if (!isDelimiter /* includes LineFeed */) {
                continue;
            }

            if (currentWordIndex < i) {
                // Add previous word fragment (indicated by word index below current index).
                fragments.push([currentWordIndex, i, Typesetter.FragmentType.Word]);
            }
            const type = label.lineFeedAt(i) ? Typesetter.FragmentType.LineFeed : Typesetter.FragmentType.Delimiter;
            fragments.push([i, i + 1, type]);
            currentWordIndex = i + 1;
        }
        // Account for last fragment that does not end with delimiter.
        if (!isDelimiter!) {
            fragments.push([currentWordIndex, label.length, Typesetter.FragmentType.Word]);
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
                width + advance + (index < fragment[1] ? kernings[index + fragment[0]] : 0.0), 0.0);
        }
        return widths;
    }

    /**
     * Computes the left and right side thresholds for elide computation.
     * @param label - Label to query elide mode and line width from.
     * @param ellipsisWidth - Pre-computed width of the full ellipsis (t avoid re-computation).
     * @returns - The left and right thresholds intended for elide fragment retrieval.
     */
    private static elideThresholds(label: Label, ellipsisWidth: number): [number, number] {
        switch (label.elide) {
            case Label.Elide.Right:
                return [label.lineWidth - ellipsisWidth, 0.0];
            case Label.Elide.Middle:
                const threshold = label.lineWidth / 2 - ellipsisWidth / 2;
                return [threshold, threshold];
            case Label.Elide.Left:
                return [0.0, label.lineWidth - ellipsisWidth];
            default:
                return [0.0, 0.0];
        }
    }


    /**
     * Creates a sub list of fragments that fit into threshold. The last fragment might be adjusted in order to cram
     * as many  characters as possible for the elide. Reverse flag can be used do start left or right.
     * @param threshold - Threshold in typesetting space.
     * @param labelFragments - Pre-computed label fragments.
     * @param labelFragmentWidths - Pre-accumulated widths of the label fragments.
     * @param labelAdvances - Advances in order to reduce lookups.
     * @param labelKernings - Kernings in order to reduce lookups.
     * @param reverse -If enabled, the right side elide fragments will be collected and adjusted. Left side otherwise.
     * @returns - A new fragment, fragment-widths array for elide advancing, and overall width.
     */
    private static elideFragments(threshold: number,
        labelFragments: Array<Fragment>, labelFragmentWidths: Float32Array,
        labelAdvances: Float32Array, labelKernings: Float32Array,
        reverse: boolean): [Array<Fragment>, Array<number>, number] {

        const fragments = new Array<Fragment>();
        const fragmentWidths = new Array<number>();

        let width = 0.0;
        let lastLabelFragmentWidth = 0.0;

        // tslint:disable-next-line:prefer-for-of
        for (let i0 = reverse ? labelFragments.length - 1 : 0;
            reverse ? i0 > -1 : i0 < labelFragments.length; reverse ? --i0 : ++i0) {

            const fragment = labelFragments[i0];

            if (fragment[2] === Typesetter.FragmentType.LineFeed) {
                continue;
            }

            // If next fragment fits as a whole, put it in.
            if (width + labelFragmentWidths[i0] < threshold) {
                width += labelFragmentWidths[i0];

                fragments.push(fragment);
                fragmentWidths.push(labelFragmentWidths[i0]);
                continue;
            }
            // If the single delimiter didn't fit or first/last character of word, then break.
            if (fragment[2] === Typesetter.FragmentType.Delimiter ||
                width + labelAdvances[reverse ? fragment[1] - 1 : fragment[0]] > threshold) {
                break;
            }

            // Try to cramp as many characters of the fragment (word) as possible.
            for (let i1 = reverse ? fragment[1] - 1 : fragment[0];
                reverse ? i1 >= fragment[0] : i1 < fragment[1]; reverse ? --i1 : ++i1) {

                if (width + lastLabelFragmentWidth + labelAdvances[i1] + labelKernings[i1] < threshold) {
                    lastLabelFragmentWidth += labelAdvances[i1] + labelKernings[i1];
                    continue;
                }

                fragments.push([reverse ? i1 + 1 : fragment[0], reverse ? fragment[1] : i1, fragment[2]]);
                fragmentWidths.push(lastLabelFragmentWidth);
                break;
            }
            break;
        }

        return [fragments, fragmentWidths, width + lastLabelFragmentWidth];
    }


    /**
     * Computes origin, tangent, and up vector for every vertex of in the given range.
     * @param transform - Transformation to apply to every vertex.
     * @param vertices - Glyph vertices to be transformed (expected untransformed, in typesetting space).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    private static transformVertices(transform: mat4,
        vertices: GlyphVertices | undefined, begin: number, end: number): void {
        if (vertices === undefined || mat4.equals(transform, mat4.create())) {
            return;
        }

        for (let index: number = begin; index < end; ++index) {
            const origin = vertices.origin(index);

            const ll: vec3 = v3(); // Lower Left
            vec3.transformMat4(ll, origin, transform);
            const lr: vec3 = v3(); // Lower Right
            vec3.transformMat4(lr, vec3.add(lr, origin, vertices.tangent(index)), transform);
            const ul: vec3 = v3(); // Upper Left
            vec3.transformMat4(ul, vec3.add(ul, origin, vertices.up(index)), transform);

            vec3.copy(vertices.origin(index), ll);
            vec3.sub(vertices.tangent(index), lr, ll);
            vec3.sub(vertices.up(index), ul, ll);
        }
    }

    /**
     * @param currentRectangle - [minX, minY, minZ, maxX, maxY, maxZ] is updated in-place
     * @param newRectangle - [minX, minY, minZ, maxX, maxY, maxZ] used to update currentRectangle
     */
    private static updateRectangleMinMax(currentRectangle: number[], newRectangle: number[]): void {
        assert(currentRectangle.length === 6 && newRectangle.length === 6, `expected the rectangles to have 6 values!`);

        let i = 0;
        for (; i < 3; i++) {
            currentRectangle[i] = Math.min(currentRectangle[i], newRectangle[i]);
        }
        for (; i < 6; i++) {
            currentRectangle[i] = Math.max(currentRectangle[i], newRectangle[i]);
        }
    }

    /**
     * Returns a vec2 [min, max] containing the minimum and the maximum of the given values.
     * @param currentMin - the current minimum (e.g., initialized to +Infinity)
     * @param currentMax - the current maximum (e.g., initialized to -Infinity)
     * @param values - find the maximum and minimum of the given values
     */
    private static minMax(currentMin: number, currentMax: number, values: number[]): vec2 {
        const min = Math.min(currentMin, ...values);
        const max = Math.max(currentMax, ...values);
        return vec2.fromValues(min, max);
    }

    /**
     * Returns [minX, minY, minZ, maxX, maxY, maxZ] of the vertices coordinates, i.e., origins,
     * origins + tangents, origins + ups, from which a bounding rectangle can be calculated.
     * @param vertices - Glyph vertices to be transformed (expected untransformed, in typesetting space).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    private static getMinMaxVertices(vertices: GlyphVertices, begin: number, end: number)
        : [number, number, number, number, number, number] {

        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;

        for (let i: number = begin; i < end; ++i) {
            const x = Typesetter.minMax(minX, maxX, [vertices.origin(i)[0], vertices.origin(i)[0] + vertices.up(i)[0],
            vertices.origin(i)[0] + vertices.tangent(i)[0]]);
            minX = x[0];
            maxX = x[1];

            const y = Typesetter.minMax(minY, maxY, [vertices.origin(i)[1], vertices.origin(i)[1] + vertices.up(i)[1],
            vertices.origin(i)[1] + vertices.tangent(i)[1]]);
            minY = y[0];
            maxY = y[1];

            const z = Typesetter.minMax(minZ, maxZ, [vertices.origin(i)[2], vertices.origin(i)[2] + vertices.up(i)[2],
            vertices.origin(i)[2] + vertices.tangent(i)[2]]);
            minZ = z[0];
            maxZ = z[1];
        }

        return [minX, minY, minZ, maxX, maxY, maxZ];
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

        // Origin is expected to be in typesetting space (not transformed yet).
        for (let index = begin; index < end; ++index) {
            vertices.origin(index)[0] += offset;
        }
    }

    /**
     * Create and transform glyph vertices for rendering.
     * @param label - Label providing transform data, e.g., alignment and static transform.
     * @param vertices - Glyph vertices to apply transformations to.
     * @param lines - Indices of glyph vertices on same lines to apply line-based transformations.
     */
    private static transform(label: Label, vertices: GlyphVertices, lines: Array<Line>): void {

        const boundingRectangle = [
            Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

        for (const line of lines) {
            Typesetter.transformAlignment(line[2], label.alignment, vertices, line[0], line[1]);

            Typesetter.updateRectangleMinMax(boundingRectangle,
                Typesetter.getMinMaxVertices(vertices, line[0], line[1]));

            Typesetter.transformVertices(label.staticTransform, vertices, line[0], line[1]);
        }

        // transform extent from Typesetting Space to label space (depending on the label, e.g. screen space (px) or
        // world space)
        const width = boundingRectangle[3] - boundingRectangle[0];
        const height = boundingRectangle[4] - boundingRectangle[1];

        const ll = vec4.transformMat4(vec4.create(), vec4.fromValues(0, 0, 0, 1), label.staticTransform);
        const lr = vec4.transformMat4(vec4.create(), vec4.fromValues(width, 0, 0, 1), label.staticTransform);
        const ul = vec4.transformMat4(vec4.create(), vec4.fromValues(0, height, 0, 1), label.staticTransform);

        const extent = vec2.fromValues(vec4.distance(lr, ll), vec4.distance(ul, ll));

        label.extent = [extent[0], extent[1]];
    }


    /**
     * Typesets the given label, transforming the vertices in-world, ready to be rendered.
     * @param label - The label that is to be typeset.
     * @param vertices - in/out The glyph vertices, a prepared (optionally empty) vertex storage.
     * @returns - The number of glyphs that are actually typeset and setup as vertices.
     */
    static typeset(label: Label, vertices: GlyphVertices): number {

        if (label.length === 0) {
            return 0;
        }

        assert(label.fontFace !== undefined, `expected a font face for label before typesetting`);
        const fontFace = label.fontFace!;

        // Retrieve advances, kernings, as well as line feed and delimiter indices.

        // Utility to query glyphs by index. If the index exceeds the label's text length, the ellipsis is queried
        // instead of the text. Due to pre-fetching kernings and advances, additional/optional ellipsis data is appended
        // and later access via offset @see {@link advance}.
        const glyphs = (index: number): Glyph => index < label.length ? fontFace.glyph(label.charCodeAt(index)) :
            fontFace.glyph(label.ellipsis.charCodeAt(index - label.length));

        const labelAdvances = Typesetter.advances(label);
        const labelKernings = Typesetter.kernings(label);

        const labelFragments = Typesetter.fragments(label);
        const labelFragmentWidths = Typesetter.fragmentWidths(labelFragments, labelAdvances, labelKernings);


        // const pen: vec2 = vec2.fromValues(-fontFace.glyphTexturePadding[3], -Typesetter.lineAnchorOffset(label));
        const pen: vec2 = vec2.fromValues(0.0, -Typesetter.lineAnchorOffset(label));

        const lines = new Array<Line>();
        let vertexIndex = 0;

        const elide = label.elide !== Label.Elide.None;


        // Typeset Lines. A line is a 3-tuple of start-index, end-index, and line width. The indices are referencing
        // vertices of the glyph vertices. They cannot be reused for further typesetting. For it a local advance
        // function is defined (easier to maintain without need of so many arguments).
        const advance = (fragments: Array<Fragment>, fragmentWidths: Float32Array, threshold: number = NaN,
            advances: Float32Array = labelAdvances, kernings: Float32Array = labelKernings, offset: number = 0) => {

            let firstIndexOfLine = vertexIndex;

            for (let i = 0; i < fragments.length; ++i) {

                const fragment = fragments[i];
                if (fragment[0] >= fragment[1]) {
                    continue;
                }

                // Elide takes precedence, since full line width is used, so every line break is omitted.
                const lineFeed = !elide && fragment[2] === Typesetter.FragmentType.LineFeed;
                let wordWrap = false;

                // If word wrap is desired (no elide, no line feed already and label enabled), then take words with
                // subsequent delimiters into account. These should be moved to the next line together (not split).
                if (!elide && !lineFeed && label.wrap) {
                    // If this fragment is a non depictable delimiter don't break. Non depictable fragments/characters
                    // will not be visible at the end of a line, but would increase the indent for the subsequent line.
                    // This, however, is only applied for the first non depictable delimiter, since, e.g., multiple
                    // spaces are probably expected to indent the next line instead of trim-like behavior.
                    // Example: 'A wonderful serenity has taken place'. If line breaks is required after 'taken' it will
                    // ignore the subsequent space. For 'A wonderful serenity has    taken place' four spaces will occur
                    // on the next new line: '    place' instead of 'place'.
                    const depictable = fragment[2] !== Typesetter.FragmentType.Delimiter ||
                        glyphs(fragment[0]).depictable();

                    // If this fragment is a word then take next depictable delimiter into account.
                    const lookAhead = fragment[2] === Typesetter.FragmentType.Word &&
                        i < fragments.length - 1 && fragments[i + 1][2] === Typesetter.FragmentType.Delimiter;
                    const depictableAhead = lookAhead && glyphs(fragments[i + 1][0]).depictable();

                    wordWrap = pen[0] + (depictable ? fragmentWidths[i] : 0.0)
                        + (depictableAhead ? fragmentWidths[i + 1] : 0.0) > label.lineWidth;
                }

                // New line! Either line feed or word wrap made it.
                if (lineFeed || wordWrap) {
                    lines.push([firstIndexOfLine, vertexIndex, pen[0]]);
                    firstIndexOfLine = vertexIndex;

                    pen[0] = 0.0;
                    pen[1] -= fontFace.lineHeight;

                    // In case of line feed, no additional vertex needs to be written.
                    if (lineFeed) {
                        continue;
                    }
                }

                // Advance forward for the next word-fragment.
                for (let i = fragment[0]; i < fragment[1]; ++i) {
                    if (glyphs(i).depictable()) {
                        Typesetter.writeVertex(fontFace, pen, glyphs(i), vertices, vertexIndex);
                        ++vertexIndex;
                    }
                    pen[0] += advances[i - offset] + kernings[i - offset];
                }
            }
            if (firstIndexOfLine < vertexIndex) {
                lines.push([firstIndexOfLine, vertexIndex, pen[0]]);
            }
        };


        const fullApproximatedWidth = labelFragmentWidths.reduce((accumulate, width) => accumulate + width, 0.0);
        if (elide && fullApproximatedWidth > label.lineWidth) {

            // Compute width of ellipsis (reuse default advances, kernings and fragment widths functions).
            const ellipsisFragments: Array<Fragment> =
                [[label.length, label.length + label.ellipsis.length, Typesetter.FragmentType.Word]];

            const ellipsisAdvances = Typesetter.advances(label, label.ellipsis);
            const ellipsisKernings = Typesetter.kernings(label, label.ellipsis);
            const ellipsisFragmentWidths = Typesetter.fragmentWidths(
                [[0, label.ellipsis.length, Typesetter.FragmentType.Word]], ellipsisAdvances, ellipsisKernings);

            const ellipsisWidth = ellipsisFragmentWidths[0];
            // If even the ellipsis does not fit within line width, then skip typesetting.
            if (label.lineWidth < ellipsisWidth) {
                return 0;
            }
            const thresholds = Typesetter.elideThresholds(label, ellipsisWidth);

            const [leftFragments, leftFragmentWidths, leftWidth] = Typesetter.elideFragments(
                thresholds[0], labelFragments, labelFragmentWidths, labelAdvances, labelKernings, false);

            // Pass the unused width (delta to left-side threshold) to the right-side threshold.
            if (label.elide === Label.Elide.Middle) {
                thresholds[1] += thresholds[0] - leftWidth;
            }

            const [rightFragments, rightFragmentWidths] = Typesetter.elideFragments(
                thresholds[1], labelFragments, labelFragmentWidths, labelAdvances, labelKernings, true);

            advance(leftFragments, new Float32Array(leftFragmentWidths));

            advance(ellipsisFragments, ellipsisFragmentWidths, NaN,
                ellipsisAdvances, ellipsisKernings, label.length);

            advance(rightFragments.reverse(), new Float32Array(rightFragmentWidths.reverse()));

            // Accumulate all lines into a single line.
            assert(lines.length < 4, `expected at most 3-line-yield from advance, given ${lines}`);
            lines[0][1] = lines[lines.length - 1][1];
            lines[0][2] = pen[0];
            lines.length = 1;

        } else {

            advance(labelFragments, labelFragmentWidths, label.lineWidth);

        }


        // Apply transforms (alignment and static label transform) to all written vertices.
        Typesetter.transform(label, vertices, lines);
        vertices.shrink(vertexIndex);

        return vertexIndex;
    }

}


export namespace Typesetter {

    export enum FragmentType {
        Word = 0,
        Delimiter = 1,
        LineFeed = 2,
    }

}
