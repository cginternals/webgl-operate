
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { fromVec4, v4 } from '../gl-matrix-extensions';

import { assert } from '../auxiliaries';
import { GLfloat2 } from '../tuples';

import { FontFace } from './fontface';
import { Glyph } from './glyph';
import { GlyphVertex, GlyphVertices } from './glyphvertices';
import { Label } from './label';


/**
 * The typesetter is responsible for layouting text on the screen or in a virtual space. It takes a label,
 * which defines where it wants to appear (@see {@link Label}), and a font face that is used to display the
 * text, and computes the actual position for each glyph. Its output is a vertex array, which describes the glyphs
 * position and appearance on the screen/in the scene and which can be rendered using a LabelRenderPass.
 */
export class Typesetter {

    protected static readonly DELIMITERS: string = '\x0A ,.-/()[]<>';

    /** @todo should a Label define its ellipsis characters? */
    protected static readonly ELLIPSIS_CHARS: string = '...';

    /**
     * Returns if newline should be applied for next word (or next glyph if word exceeds the line width)
     * @param label the label that has a wordWrapper different from WordWrapper.None
     * @param pen horizontal and vertical position at which typesetting takes place/arrived.
     * @param glyph current glyph
     * @param index current index for char in this label
     * @param safeForwardIndex used to reduce the number of wordwrap forward passes
     * @returns whether or not typesetting should go on a new line
     */
    protected static wordWrap(label: Label, pen: vec2, glyph: Glyph, index: number, safeForwardIndex: number): boolean {
        // assert(label.wordWrapper !== Label.WordWrapper.None,
        //     `expected a WordWrapper enabled for label, given ${label.wordWrapper}`);
        const lineWidth = label.lineWidth;

        const penForward = pen[0] + glyph.advance + (index > 0 ? label.kerningBefore(index) : 0.0);
        if (glyph.depictable() && penForward > lineWidth && (glyph.advance <= lineWidth || pen[0] > 0.0)) {
            return true;
        }
        if (index < safeForwardIndex) {
            return false;
        }
        /* tslint:disable-next-line:prefer-const */
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
            const precedingGlyph = label.fontFace!.glyph(label.charCodeAt(index));
            if (precedingGlyph.depictable()) {
                break;
            }
            pen[0] -= precedingGlyph.advance;
            --index;
        }
        extent[0] = Math.max(pen[0], extent[1]);
        extent[1] += label.fontFace!.lineHeight;
    }

    /**
     * Adjusts the vertices for a line after typesetting (done due to line feed, word wrap, or end of line) w.r.t.
     * the targeted line alignment.
     * @param pen - Current typesetting position (probably the end of the line in typesetting space).
     * @param alignment - Targeted alignment, e.g., left, center, or right.
     * @param glyphs - Glyph vertices for rendering to align the origins' x-components of (expected untransformed).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    protected static transformAlignment(pen: vec2, alignment: Label.Alignment,
        glyphs: GlyphVertices | undefined, begin: number, end: number): void {
        if (glyphs === undefined || alignment === Label.Alignment.Left) {
            return;
        }

        let penOffset = -pen[0];
        if (alignment === Label.Alignment.Center) {
            penOffset *= 0.5;
        }

        /* Origin is expected to be in typesetting space (not transformed yet). */
        for (let i = begin; i <= end; ++i) {
            glyphs.vertices[i].origin[0] += penOffset;
        }
    }

    /**
     * Adjusts the vertices for line anchor (done due after typesetting) w.r.t. the targeted anchoring.
     * @param label - Label to adjust the y-positions for.
     * @param glyphs - In/out param: Glyph vertices for rendering to align the origins' y-components of (expected
     * untransformed).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     *
     * @todo Apply once at the beginning! Initial offset!
     */
    protected static transformLineAnchor(label: Label, glyphs: GlyphVertices | undefined, begin: number, end: number):
        void {

        if (glyphs === undefined) {
            return;
        }

        let offset = 0.0;
        switch (label.lineAnchor) {
            case Label.LineAnchor.Ascent:
                offset = label.fontFace!.ascent;
                break;
            case Label.LineAnchor.Center:
                offset = label.fontFace!.size * 0.5 + label.fontFace!.descent;
                break;
            case Label.LineAnchor.Descent:
                offset = label.fontFace!.descent;
                break;
            case Label.LineAnchor.Top:
                offset = label.fontFace!.base;
                break;
            case Label.LineAnchor.Bottom:
                offset = label.fontFace!.base - label.fontFace!.lineHeight;
                break;
            case Label.LineAnchor.Baseline:
            default:
                return;
        }

        for (let i = begin; i <= end; ++i) {
            glyphs.vertices[i].origin[1] -= offset;
        }
    }

    /**
     * Configuring the vertex for a given glyph to be rendered. If no vertex is given or the glyph is not depictable,
     * this method immediately exits at the beginning.
     * @param fontFace - Font face to be applied for setting up the vertex.
     * @param pen - Typesetting position which is the not-yet-transformed position the glyph will be rendered at.
     * @param glyph - Glyph that is to be rendered/configured.
     * @param vertex - Out param: Associated vertex to store data required for rendering.
     */
    protected static transformGlyph(fontFace: FontFace, pen: vec2, glyph: Glyph,
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
     * Call this when a label was already typeset, but the WordWrapper abbreviates the label's text and thus needs to
     * disable vertices that were already typeset.
     * @todo this smells like the typesetter or the GlyphVertices or the Label need to be refactored.
     * @param vertex - In/out param: associated vertex to store data required for rendering.
     */
    protected static disableGlyphVertex(vertex: GlyphVertex): void {
        vertex.origin = vec3.create();
        vertex.tangent = vec3.create();
        vertex.up = vec3.create();
        vertex.uvRect = vec4.create();
    }

    /**
     * Computes origin, tangent, and up vector for every vertex of in the given range.
     * @param transform - Transformation to apply to every vertex.
     * @param glyphs - Glyph vertices to be transformed (expected untransformed, in typesetting space).
     * @param begin - Vertex index to start alignment at.
     * @param end - Vertex index to stop alignment at.
     */
    protected static transformVertex(transform: mat4,
        glyphs: GlyphVertices | undefined, begin: number, end: number): void {
        if (glyphs === undefined || mat4.equals(transform, mat4.create())) {
            return;
        }

        for (let i: number = begin; i < end; ++i) {
            const v = glyphs.vertices[i];

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
     * Transforms the labels extent (typesetting space to, e.g., world space or screen space).
     * @param transform - Transformation that was applied to every vertex.
     * @param extent - Untransformed label extent (in typesetting space) to be transformed.
     * @returns - Transformed label extent (copy).
     */
    protected static transformExtent(transform: mat4, extent: vec2): GLfloat2 {
        const lowerLeft = vec4.transformMat4(v4(), vec4.fromValues(0.0, 0.0, 0.0, 1.0), transform);
        const lowerRight = vec4.transformMat4(v4(), vec4.fromValues(extent[0], 0.0, 0.0, 1.0), transform);
        const upperLeft = vec4.transformMat4(v4(), vec4.fromValues(0.0, extent[1], 0.0, 1.0), transform);
        return [vec4.distance(lowerRight, lowerLeft), vec4.distance(upperLeft, lowerLeft)];
    }

    /**
     * This functions applies the label's wordWrapper, so that the label fits its given lineWidth. It updates the
     * label's text, but it does not re-typeset it.
     * NOTE: Only call this when label exceeds its line width after typesetting. With other circumstances, behaviour is
     * undefined.
     * @param label - the typeset label that exceeds its given lineWidth
     * @param advancesPerGlyph - an array of glyph advances with applied kerning (for the given label)
     * @returns true when label needs to be typeset again.
     * @todo line feeds are not handled well when they appear in the last line and that line fits the label.lineWidth
     */
    protected static applyWordWrapper(label: Label, advancesPerGlyph: Array<number>): boolean {

        let labelNeedsReTypeset = false;

        /** In case the wordWrapper uses ellipsis, we need to know the width of the ellipsis, so that the ellipsis
         * itself does not make the label exceed its line width.
         * @todo What if the width of the ellipsis is larger than label.lindWidth?
         */
        let ellipsisWidth = 0;

        for (let j = 0; j < this.ELLIPSIS_CHARS.length; j++) {
            const glyph = label.fontFace!.glyph(this.ELLIPSIS_CHARS.charCodeAt(j));

            let kerning = 0;
            if (j + 1 < this.ELLIPSIS_CHARS.length) {
                kerning = label.fontFace!.kerning(
                    this.ELLIPSIS_CHARS.charCodeAt(j), this.ELLIPSIS_CHARS.charCodeAt(j + 1));
            }

            ellipsisWidth += glyph.advance + kerning;
        }

        switch (label.wordWrapper) {

            case Label.WordWrapper.NewLine: {
                console.log('TODO: newline');
                labelNeedsReTypeset = false;
                break;
            }
            case Label.WordWrapper.EllipsisMiddle: {
                /** Test how many glyphs we need to elide, so that the label's text and the ellipsis fit into
                 * the maximum line width.
                 */
                const sum = (accumulator: number, currentValue: number) => accumulator + currentValue;

                let index = Math.floor(advancesPerGlyph.length / 2);
                let newText = label.text.text;

                const goalWidth = label.lineWidth - ellipsisWidth;

                let width = advancesPerGlyph.reduce(sum);

                while (width > goalWidth) {
                    index = Math.floor(advancesPerGlyph.length / 2);
                    advancesPerGlyph.splice(index, 1);
                    newText = newText.slice(0, index) + newText.slice(index + 1);

                    if (advancesPerGlyph.length < 1) {
                        console.warn('damn.');
                        break;
                    }
                    width = advancesPerGlyph.reduce(sum);
                }

                /** Update the label's text. We cannot undo this.
                 * @todo make it undoable? e.g., label.originalText and label.currentText ?
                 */
                newText = newText.slice(0, index) + this.ELLIPSIS_CHARS + newText.slice(index + 1);
                label.text.text = newText;

                labelNeedsReTypeset = true;
                break;
            }
            case Label.WordWrapper.EllipsisBeginning: {

                /** Test how many glyphs we need to elide, so that the label's text and the ellipsis fit into
                 * the maximum line width.
                 */
                let index = advancesPerGlyph.length - 1;
                let width = 0;
                for (; index >= 0; index--) {
                    /** We already know that not all glyphs will fit, so always test with current glyph's width AND
                     * ellipsis width.
                     */
                    if (width + advancesPerGlyph[index] + ellipsisWidth > label.lineWidth) {
                        index--;
                        break;
                    }
                    width += advancesPerGlyph[index];
                }

                /** Update the label's text. We cannot undo this.
                 * @todo make it undoable? e.g., label.originalText and label.currentText ?
                 */
                const newText = label.text;
                newText.text = newText.text.slice(index);
                newText.text = this.ELLIPSIS_CHARS + newText.text;
                label.text = newText;

                labelNeedsReTypeset = true;
                break;
            }
            case Label.WordWrapper.EllipsisEnd: {
                /** Test how many glyphs we need to elide, so that the label's text and the ellipsis fit into
                 * the maximum line width.
                 */
                let index = 0;
                let width = 0;
                for (; index < advancesPerGlyph.length; index++) {
                    /** We already know that not all glyphs will fit, so always test with current glyph's width AND
                     * ellipsis width.
                     */
                    if (width + advancesPerGlyph[index] + ellipsisWidth > label.lineWidth) {
                        index--;
                        break;
                    }
                    width += advancesPerGlyph[index];
                }

                /** Update the label's text. We cannot undo this.
                 * @todo make it undoable? e.g., label.originalText and label.currentText ?
                 */
                const newText = label.text;
                newText.text = newText.text.slice(0, index);
                newText.text += this.ELLIPSIS_CHARS;

                label.text = newText;

                labelNeedsReTypeset = true;
                break;
            }
            case Label.WordWrapper.None:
            default:
                break;
        }
        return labelNeedsReTypeset;
    }

    /**
     * Typesets the given label, transforming the vertices in-world and gathering the glyphs' advances (including
     * kerning). Those glyph advances might be useful for later changes to the label as reaction to the typeset values,
     * e.g., word wrap for labels exceeding their given lineWidth.
     * @param label - the label that shall be typeset
     * @param advancesPerGlyph - out param: an array of glyph advances with applied kerning (for the given label)
     * @param pen - In/out param: horizontal and vertical position at which typesetting takes place/arrived
     * @param vertexIndex - the current vertex index
     * @param extent - In/out param: extent to be adjusted.
     * @param glyphs - In/out param: the glyph vertices, a prepared (optionally empty) vertex storage
     * @returns indices useful for subsequent calculations: [iBegin, iEnd, index, vertexIndex, feedVertexIndex];
     */
    protected static typesetGlyphs(label: Label, advancesPerGlyph: Array<number>, pen: vec2, vertexIndex: number,
        extent: vec2, glyphs?: GlyphVertices): Array<number> {

        const iBegin = 0;
        const iEnd: number = label.length;

        /* Index used to reduce the number of wordwrap forward passes. */
        /* tslint:disable-next-line:prefer-const */
        let safeForwardIndex = iBegin;
        let feedVertexIndex: number = vertexIndex;

        let index = iBegin;
        let width = 0;
        for (; index !== iEnd; ++index) {
            const glyph = label.fontFace!.glyph(label.charCodeAt(index));

            /* Handle line feeds */
            const feedLine = label.lineFeedAt(index);

            /** @todo use this function for WordWrapper.NewLine */
            // Typesetter.wordWrap(label, pen, glyph, index, safeForwardIndex));

            if (feedLine) {
                /* Handle pen and extent w.r.t. non-depictable glyphs. */
                Typesetter.backward(label, index - 1, iBegin, pen, extent);
                /* Handle alignment (does nothing if vertices are not required/undefined). */
                Typesetter.transformAlignment(pen, label.alignment, glyphs, feedVertexIndex, vertexIndex);

                pen[0] = 0.0;
                pen[1] -= label.fontFace!.lineHeight;

                feedVertexIndex = vertexIndex;

            } else if (index > iBegin) {
                pen[0] += label.kerningBefore(index);
            }

            advancesPerGlyph.push(pen[0] - width);
            width = pen[0];

            /* Add and configure data for rendering the current character/glyph of the label. */
            Typesetter.transformGlyph(label.fontFace!, pen, glyph, glyphs ? glyphs.vertices[vertexIndex++] : undefined);

            pen[0] += glyph.advance;
        }

        return [iBegin, iEnd, index, vertexIndex, feedVertexIndex];
    }

    /**
     * Typesets the given label, transforming the vertices in-world, ready to be rendered.
     * @param label the label that shall be typeset
     * @param glyphs the glyph vertices, a prepared (optionally empty) vertex storage
     * @param begin vertex index to start the typesetting (usually 0)
     * @returns the transformed label extent
     */
    static typeset(label: Label, glyphs?: GlyphVertices, begin?: number): GLfloat2 {
        assert(!!label.fontFace, `expected a font face for label before typesetting`);

        const advancesPerGlyph: Array<number> = [];
        /* Horizontal and vertical position at which typesetting takes place/arrived. */
        let pen = vec2.create();
        let vertexIndex: number = begin !== undefined ? begin : 0;
        let extent = vec2.create();

        let indices = this.typesetGlyphs(label, advancesPerGlyph, pen, vertexIndex, extent, glyphs);

        let iBegin = indices[0];
        let iEnd = indices[1];
        let index = indices[2];
        vertexIndex = indices[3];
        let feedVertexIndex = indices[4];

        /* Handle word wrap if label exceeds the maximum line width */
        if (label.lineWidth < pen[0]) {
            if (index !== advancesPerGlyph.length || vertexIndex !== index || vertexIndex !== advancesPerGlyph.length) {
                /** all three of them should be equal
                 * @todo debug; remove this when in PR!
                 */
                console.warn(index, advancesPerGlyph.length, vertexIndex);
            }

            const typesetAgain = this.applyWordWrapper(label, advancesPerGlyph);

            if (typesetAgain) {
                pen = vec2.create();
                vertexIndex = begin !== undefined ? begin : 0;
                extent = vec2.create();

                /** We already typeset the whole label and need to disable all glyph vertices in order to overwrite
                 * them properly.
                 */
                if (glyphs) {
                    for (const glyphVertex of glyphs.vertices) {
                        this.disableGlyphVertex(glyphVertex);
                    }
                }

                indices = this.typesetGlyphs(label, advancesPerGlyph, pen, vertexIndex, extent, glyphs);

                iBegin = indices[0];
                iEnd = indices[1];
                index = indices[2];
                vertexIndex = indices[3];
                feedVertexIndex = indices[4];
            }
        }

        /* Handle alignment (when last line of sequence is processed). */
        Typesetter.backward(label, index - 1, iBegin, pen, extent);
        /* Handle alignment and anchoring (does nothing if vertices are not required/undefined). */
        Typesetter.transformAlignment(pen, label.alignment, glyphs, feedVertexIndex, iEnd - 1);
        Typesetter.transformLineAnchor(label, glyphs, iBegin, iEnd - 1);

        Typesetter.transformVertex(label.transform, glyphs, iBegin, vertexIndex);

        const labelExtent = Typesetter.transformExtent(label.transform, extent);
        label.extent = labelExtent;

        return labelExtent;
    }

}
