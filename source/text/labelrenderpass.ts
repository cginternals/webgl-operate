
import { mat4 } from 'gl-matrix';

import { assert, log, LogLevel } from '../auxiliaries';
import { GLfloat2 } from '../tuples';

import { Camera } from '../camera';
import { ChangeLookup } from '../changelookup';
import { Color } from '../color';
import { Context } from '../context';
import { Framebuffer } from '../framebuffer';
import { Initializable } from '../initializable';
import { Program } from '../program';
import { Shader } from '../shader';
import { FontFace } from './fontface';
import { GlyphVertices } from './glyphvertices';

import { Label } from './label';
import { LabelGeometry } from './labelgeometry';
import { Position2DLabel } from './position2dlabel';
import { Position3DLabel } from './position3dlabel';


/**
 * The LabelRenderPass @todo
 */
export class LabelRenderPass extends Initializable {

    /**
     * Default color that is used for label rendering.
     */
    protected static readonly DEFAULT_COLOR: Color = new Color([0.1, 0.1, 0.1, 1.0]);

    /**
     * Default AA step scale: more crisp text rendering.
     */
    protected static readonly DEFAULT_AA_STEP_SCALE: GLfloat = 0.6666;


    /**
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        camera: false,
        geometry: false,
        color: false,
        font: false,
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

    /** @see {@link color} */
    protected _color: Color;

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

    protected _font: FontFace | undefined;
    protected _labels: Array<Label>;

    protected _staticGeometry: LabelGeometry;
    protected _dynamicGeometry: LabelGeometry;


    /**
     * Creates a render pass for labels.
     * @param context - Valid context to create the object for.
     */
    constructor(context: Context) {
        super();
        this._context = context;
        this._depthFunc = context.gl.LESS;

        this._program = new Program(context, 'LabelRenderProgram');

        this._staticGeometry = new LabelGeometry(this._context, 'StaticLabels');
        this._dynamicGeometry = new LabelGeometry(this._context, 'DynamicLabels');

        this._color = LabelRenderPass.DEFAULT_COLOR;
        this._aaStepScale = LabelRenderPass.DEFAULT_AA_STEP_SCALE;

        this._labels = new Array<Label>();
    }

    /**
     * Typesets and renders 2D and 3D labels.
     */
    protected prepare(): void {

        if (this._font === undefined) {
            const empty = new Float32Array(0);
            this._staticGeometry.update(empty, empty, empty, empty);
            this._dynamicGeometry.update(empty, empty, empty, empty);
            return;
        }

        const staticGlyphs = new GlyphVertices(0);
        const dynamicGlyphs = new GlyphVertices(0);

        const frameSize = this._camera.viewport;

        for (const label of this._labels) {
            if (label === undefined) {
                log(LogLevel.Warning, `skip undefined label`);
                continue;
            }
            label.fontFace = this._font!;

            if (label instanceof Position2DLabel) {
                (label.type === Label.Type.Static ? staticGlyphs : dynamicGlyphs).concat(label.typeset(frameSize));
            } else if (label instanceof Position3DLabel) {
                (label.type === Label.Type.Static ? staticGlyphs : dynamicGlyphs).concat(label.typeset());
            }
        }

        if (staticGlyphs.length > 0) {
            this._staticGeometry.update(
                staticGlyphs.origins, staticGlyphs.tangents, staticGlyphs.ups, staticGlyphs.texCoords);
        }
        if (dynamicGlyphs.length > 0) {
            this._dynamicGeometry.update(
                dynamicGlyphs.origins, dynamicGlyphs.tangents, dynamicGlyphs.ups, dynamicGlyphs.texCoords);
        }
    }


    @Initializable.initialize()
    initialize(): boolean {
        const gl = this._context.gl;

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'glyph.vert');
        vert.initialize(require('./glyph.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'glyph.frag');
        frag.initialize(require('./glyph.frag'));

        this._program.initialize([vert, frag]);

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uColor = this._program.uniform('u_color');
        this._uAAStepScale = this._program.uniform('u_aaStepScale');

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_glyphs'), 0);
        gl.uniform4fv(this._uColor, this._color.rgbaF32);
        gl.uniform1f(this._uAAStepScale, this._aaStepScale);
        this._program.unbind();


        const aVertex = this._program.attribute('a_vertex', 0);
        const aTexCoord = this._program.attribute('a_texCoord', 1);
        const aOrigin = this._program.attribute('a_origin', 2);
        const aTangent = this._program.attribute('a_tangent', 3);
        const aUp = this._program.attribute('a_up', 4);


        if (!this._staticGeometry.initialized) {
            this._staticGeometry.initialize(aVertex, aTexCoord, aOrigin, aTangent, aUp);
        }
        if (!this._dynamicGeometry.initialized) {
            this._dynamicGeometry.initialize(aVertex, aTexCoord, aOrigin, aTangent, aUp);
        }

        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._staticGeometry.uninitialize();
        this._dynamicGeometry.uninitialize();
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uNdcOffset = undefined;
        this._uColor = undefined;
        this._uAAStepScale = undefined;
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

        if (override || this._altered.color) {
            gl.uniform4fv(this._uColor, this._color.rgbaF32);
        }

        if (override || this._altered.aaStepScale) {
            gl.uniform1f(this._uAAStepScale, this._aaStepScale);
        }

        if (override || this._altered.labels || this._altered.font) {
            this.prepare();
        }

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    frame(): void {
        assert(this._target && this._target.valid, `valid target expected`);
        if (this._font === undefined) {
            return;
        }

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

        this._font.glyphTexture.bind(gl.TEXTURE0);


        /* Controlling renderer is expected to bind the appropriate target, thus, unbinding is not
        necessary. */
        this._target.bind();

        this._staticGeometry.bind();
        this._staticGeometry.draw();


        /* @todo for dynamic draw per label, update transform uniform, this means label bounds within geometry need
        to be available here or somehow referenced/associated within the geometry... */

        this._dynamicGeometry.bind();
        this._dynamicGeometry.draw();

        /** Every stage is expected to bind its own vao when drawing, unbinding is not necessary. */
        // this._geometry.unbind();
        /** Every stage is expected to bind its own program when drawing, unbinding is not necessary. */
        // this._program.unbind();

        this._font.glyphTexture.unbind(gl.TEXTURE0);

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
     * Color to be applied when rendering glyphs. Note that color will only change on update in order to reduce number
     * of uniform value changes.
     */
    set color(color: Color) {
        if (this._color.equals(color)) {
            return;
        }
        this._color = color;
        this._altered.alter('color');
    }
    get color(): Color {
        this._altered.alter('color'); /* just assume it will be altered on access. */
        return this._color;
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
     * Write access to the labels that should be rendered. Note that label preparation is currently done per
     * label-render pass instance, so drawing the same label with multiple renderers should be avoided. Label
     * preparation will be invoked on update, iff the labels or the font face have changed.
     */
    set labels(labels: Array<Label>) {
        this._labels = labels;
        this._altered.alter('labels');
    }

    /**
     * Allows to specify the font face for rendering. Note that if changes to the font face occur, `update(true)`
     * should be invoked to invoke, e.g., re-typesetting of labels.
     */
    set fontFace(fontFace: FontFace | undefined) {
        this._font = fontFace;
        this._altered.alter('font');
    }
    get fontFace(): FontFace | undefined {
        return this._font;
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
