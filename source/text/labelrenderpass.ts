
/* spellchecker: disable */

import { mat4 } from 'gl-matrix';

import { assert } from '../auxiliaries';
import { GLfloat2, GLsizei2 } from '../tuples';

import { Camera } from '../camera';
import { ChangeLookup } from '../changelookup';
import { Context } from '../context';
import { Framebuffer } from '../framebuffer';
import { Initializable } from '../initializable';
import { Program } from '../program';
import { Shader } from '../shader';
import { Texture2D } from '../texture2d';
import { GlyphVertices } from './glyphvertices';

import { Color } from '../color';
import { FontFace } from './fontface';
import { Label } from './label';
import { LabelGeometry } from './labelgeometry';
import { Position2DLabel } from './position2dlabel';
import { Position3DLabel } from './position3dlabel';
import { Projected3DLabel } from './projected3dlabel';

/* spellchecker: enable */


/**
 * This class allows rendering of multiple dynamic as well as static labels. While preparing for frame, all label
 * geometry is packed into single buffers for the GPU and drawing is done with as few draw calls as possible. The
 * preparation tries to reduce state changes when labels of same color and same font are provided consecutively.
 * It might be beneficial to not render labels of large static texts and some often changing dynamic texts using the
 * same label render pass object. Often changing texts should be out into separate passed for better performance.
 */
export class LabelRenderPass extends Initializable {

    /**
     * Default AA step scale: more crisp text rendering (the value is optimized for multi-frame sampling).
     */
    protected static readonly DEFAULT_AA_STEP_SCALE: GLfloat = 0.6666;


    /**
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        camera: false,
        geometry: false,
        labels: false,
        aaStepScale: false,
    });

    /**
     * Read-only access to the objects context, used to get context information and WebGL API access.
     */
    protected _context: Context;

    /** @see {@link target} */
    protected _target: Framebuffer;

    /** @see {@link camera} */
    protected _camera: Camera;

    /** @see {@link ndcOffset} */
    protected _ndcOffset: GLfloat2;

    /** @see {@link depthMask} */
    protected _depthMask = false;

    /** @see {@link depthFunc} */
    protected _depthFunc: GLenum;

    /** @see {@link aaStepScale} */
    protected _aaStepScale: GLfloat;


    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation | undefined;
    protected _uNdcOffset: WebGLUniformLocation | undefined;
    protected _uColor: WebGLUniformLocation | undefined;
    protected _uAAStepScale: WebGLUniformLocation | undefined;
    protected _uTransform: WebGLUniformLocation | undefined;
    protected _uDynamic: WebGLUniformLocation | undefined;

    protected _labels = new Array<Label>();

    /**
     * Stores for each label (same index in _labels) the range within the geometry.
     */
    protected _ranges = new Array<GLsizei2>();

    /**
     * Stores typeset glyph vertices data per label and is used as cache to avoid unnecessary typesetting.
     */
    protected _verticesPerLabel = new Array<GlyphVertices | undefined>();

    protected _geometry: LabelGeometry;


    /**
     * Creates a render pass for labels.
     * @param context - Valid context to create the object for.
     */
    constructor(context: Context) {
        super();
        this._context = context;
        this._depthFunc = context.gl.LESS;

        this._program = new Program(context, 'LabelRenderProgram');
        this._geometry = new LabelGeometry(this._context, 'LabelGeometry');

        this._aaStepScale = LabelRenderPass.DEFAULT_AA_STEP_SCALE;
    }

    /**
     * Typesets and renders 2D and 3D labels.
     */
    protected prepare(): void {
        const frameSize = this._camera.viewport;

        for (let i = 0; i < this._labels.length; ++i) {
            const label = this._labels[i];
            let vertices: GlyphVertices | undefined;

            const forceTypeset = this._altered.labels && this._verticesPerLabel[i] === undefined;

            if (label instanceof Position2DLabel) {
                label.frameSize = frameSize;
                vertices = label.typeset(forceTypeset);
            } else if (label instanceof Projected3DLabel) {
                label.camera = this._camera;
                vertices = label.typeset(forceTypeset);
            } else if (label instanceof Position3DLabel) {
                vertices = label.typeset(forceTypeset);
            }

            if (vertices === undefined) {
                vertices = this._verticesPerLabel[i];
            } else {
                this._verticesPerLabel[i] = vertices;
            }

            const rangeStart = i > 0 ? this._ranges[i - 1][1] : 0;
            const rangeEnd = rangeStart + (vertices === undefined ? 0 : vertices.length);
            this._ranges[i] = [rangeStart, rangeEnd];
        }

        const data: GlyphVertices = GlyphVertices.concat(this._verticesPerLabel);
        this._geometry.update(data.origins, data.tangents, data.ups, data.texCoords);
    }


    @Initializable.initialize()
    initialize(): boolean {
        const gl = this._context.gl;

        this._geometry.initialize();

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'glyph.vert');
        vert.initialize(require(`./glyph.vert`));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'glyph.frag');
        frag.initialize(require(`./glyph.frag`));

        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._geometry.vertexLocation);
        this._program.attribute('a_texCoord', this._geometry.texCoordLocation);
        this._program.attribute('a_origin', this._geometry.originLocation);
        this._program.attribute('a_tangent', this._geometry.tangentLocation);
        this._program.attribute('a_up', this._geometry.upLocation);

        this._program.link();

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uColor = this._program.uniform('u_color');
        this._uAAStepScale = this._program.uniform('u_aaStepScale');
        this._uTransform = this._program.uniform('u_transform');
        this._uDynamic = this._program.uniform('u_dynamic');

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_glyphs'), 0);
        gl.uniform1f(this._uAAStepScale, this._aaStepScale);
        this._program.unbind();

        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._geometry.uninitialize();
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uNdcOffset = undefined;
        this._uColor = undefined;
        this._uAAStepScale = undefined;
        this._uTransform = undefined;
        this._uDynamic = undefined;
    }


    /**
     * @param override - If enabled, everything will be updated, regardless of tracked alterations.
     */
    @Initializable.assert_initialized()
    update(override: boolean = false): void {
        const gl = this._context.gl;
        this._program.bind();

        if (override || this._altered.camera || this._camera.altered) {
            gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);
        }

        if (override || this._altered.aaStepScale) {
            gl.uniform1f(this._uAAStepScale, this._aaStepScale);
        }

        /** Some labels need the camera to update their font size and position */
        let labelsAltered = override || this._altered.labels || this._altered.camera || this._camera.altered;
        let i = 0;
        while (labelsAltered === false && i < this._labels.length) {
            labelsAltered = this._labels[i].altered;
            ++i;
        }
        if (labelsAltered) {
            this.prepare();
        }

        this._altered.reset();
    }

    /**
     * This invokes draw calls on all labels. Thereby it aims to avoid unnecessary binds when texture or color does
     * not change and accumulate draw calls as long as both remain unchanged. Further more, draw calls will be
     * accumulated as much as possible (static labels only).
     */
    @Initializable.assert_initialized()
    frame(): void {
        if (this._geometry.numberOfGlyphs === 0 || this._labels.length === 0) {
            return;
        }

        assert(this._target && this._target.valid, `valid target expected`);
        const gl = this._context.gl;

        const size = this._target.size;
        gl.viewport(0, 0, size[0], size[1]);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(this._depthFunc);

        if (this._depthMask === false) {
            gl.depthMask(this._depthMask);
        }

        gl.enable(gl.BLEND);
        /* Note that WebGL supports separate blend by default. */
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        /* Use the following plain blend mode when relying on premultiplied colors. */
        // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        this._program.bind();

        gl.uniform2fv(this._uNdcOffset, this._ndcOffset);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        /* Controlling renderer is expected to bind the appropriate target, thus, unbinding is not
        necessary. */
        this._target.bind();

        this._geometry.bind();

        /* Try to avoid unnecessary binds when texture or color does not change and accumulate draw calls as long as
        both remain unchanged. */

        const range: GLsizei2 = [0, 0];
        let currentColor: Color | undefined;
        let currentFontFace: FontFace | undefined;

        const identity = mat4.create();

        for (let i = 0; i < this._labels.length; ++i) {
            const label0 = this._labels[i];
            range[1] = this._ranges[i][1];

            /* Skip labels that have no depictable glyphs. */
            if (range[0] === range[1] || (i < this._labels.length - 1 && !label0.valid)) {
                continue;
            }

            /* If the next/subsequent label has no depictable glyphs or has the same font and color, then increase
            draw range. */
            const label1 = i < this._labels.length - 1 ? this._labels[i + 1] : undefined;
            const bothStatic = label1 && label0.type === Label.Type.Static && label1.type === Label.Type.Static;
            const sameColor = label1 && label0.color.equals(label1.color);
            const sameFontFace = label1 && label0.fontFace === label1.fontFace;
            const sameUnit = label1 && label0.fontSizeUnit === label1.fontSizeUnit;

            if (label1 && (this._ranges[i + 1][0] === this._ranges[i + 1][1]
                || (bothStatic && sameColor && sameFontFace && sameUnit))) {
                continue;
            }

            const dynamic = label0.type === Label.Type.Dynamic;
            gl.uniform1i(this._uDynamic, dynamic);
            if (dynamic) {
                gl.uniformMatrix4fv(this._uTransform, false, label0.dynamicTransform);
            }

            if (currentColor === undefined || !currentColor.equals(label0.color)) {
                gl.uniform4fv(this._uColor, label0.color.rgbaF32);
                currentColor = label0.color;
            }
            if (currentFontFace !== label0.fontFace) {
                label0.fontFace!.glyphTexture.bind(gl.TEXTURE0);
                currentFontFace = label0.fontFace;
            }

            switch (label0.fontSizeUnit) {
                case Label.Unit.Px:
                    gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, identity);
                    break;

                case Label.Unit.World:
                case Label.Unit.Mixed:
                default:
                    gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
            }

            this._geometry.draw(range[0], range[1] - range[0]);

            range[0] = range[1];
        }

        /** Every stage is expected to bind its own vao when drawing, unbinding is not necessary. */
        // this._geometry.unbind();
        /** Every stage is expected to bind its own program when drawing, unbinding is not necessary. */
        // this._program.unbind();

        gl.bindTexture(gl.TEXTURE_2D, Texture2D.DEFAULT_TEXTURE);


        if (this._depthMask === false) {
            gl.depthMask(true);
        }

        gl.depthFunc(gl.LESS);

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
    }

    /**
     * Sets the framebuffer the quads are rendered to.
     * @param target - Framebuffer to render into.
     */
    set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    /**
     * The NDC offset is used for vertex displacement within subpixel space for anti-aliasing over
     * multiple intermediate frames (multi-frame sampling).
     * @param offset - Subpixel offset used for vertex displacement (multi-frame anti-aliasing).
     */
    set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    /**
     * The camera's viewProjection is used for 3D label placement calculation.
     */
    set camera(camera: Camera) {
        this.assertInitialized();
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
        this._altered.alter('camera');
    }


    /**
     * Allows to restrict writing into the depth buffer. If the mask is set to `true`, labels might affect the depth
     * buffer and apply fragment-based discard in order to reduce blank glyph areas to override depth values. If this
     * mode is used, labels should be the last or one of the later rendering passes. If the mask is set to `false`, the
     * common transparency/blending etc issues might occur when several labels overlap or other, e.g., transparent
     * areas are rendered afterwards... However, if only labels of the same color can overlap and no other objects can
     * interfere, this might be the better choice.
     * By default, writing to the depth buffer is disabled (depth mask is false).
     */
    set depthMask(flag: boolean) {
        this._depthMask = flag;
    }
    get depthMask(): boolean {
        return this._depthMask;
    }


    /**
     * Allows to specify the value used for depth buffer comparisons.
     */
    set depthFunc(func: GLenum) {
        this._depthFunc = func;
    }
    get depthFunc(): GLenum {
        return this._depthFunc;
    }


    /**
     * Access to the labels that should be rendered. Note that label preparation is currently done per
     * label-render pass instance, so drawing the same label with multiple renderers should be avoided. Label
     * preparation will be invoked on update, iff the labels or the font face have changed.
     */
    set labels(labels: Array<Label>) {
        this._labels = labels;

        this._ranges.length = this._labels.length;
        this._verticesPerLabel.length = this._labels.length;
        this._verticesPerLabel.fill(undefined);

        this._altered.alter('labels');
    }
    get labels(): Array<Label> {
        return this._labels;
    }


    /**
     * Allows to specify the basic AA step scale which is more of a hack to provide seemingly smoother (e.g., >= 1.0)
     * or crisper (e.g., between 0.0 and 1.0) contours without specific multi sampling. Its just scaling the outcome
     * of the derivatives.
     */
    set aaStepScale(scale: GLfloat) {
        if (this._aaStepScale === scale) {
            return;
        }

        this._aaStepScale = scale;
        this._altered.alter('aaStepScale');
    }
    get aaStepScale(): GLfloat {
        return this._aaStepScale;
    }


}
