
import { mat4 } from 'gl-matrix';

import { assert } from '../auxiliaries';
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
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false, camera: false, geometry: false, color: false, font: false, labels: false,
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


    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation | undefined;
    protected _uNdcOffset: WebGLUniformLocation | undefined;
    protected _uColor: WebGLUniformLocation | undefined;

    protected _font: FontFace | undefined;
    protected _labels: Array<Label>;

    protected _geometry3D: LabelGeometry;
    protected _geometry2D: LabelGeometry;


    /**
     * Creates a render pass for labels.
     * @param context - Valid context to create the object for.
     */
    constructor(context: Context) {
        super();
        this._context = context;

        this._program = new Program(context, 'LabelRenderProgram');
        this._geometry3D = new LabelGeometry(this._context, 'LabelRenderGeometry');
        this._geometry2D = new LabelGeometry(this._context, 'LabelRenderGeometry2D');

        this._color = new Color([0.5, 0.5, 0.5], 1.0);

        this._labels = new Array<Label>();
    }

    /**
     * Typesets and renders 2D and 3D labels.
     */
    protected prepare(): void {
        if (this._font === undefined) {
            const empty = new Float32Array(0);
            this._geometry2D.update(empty, empty, empty, empty);
            this._geometry3D.update(empty, empty, empty, empty);
            return;
        }

        /* Remove all calculated vertices for 2D and 3D labels. */
        const glyphs2D = new GlyphVertices(0);
        const glyphs3D = new GlyphVertices(0);

        const frameSize = this._camera.viewport;
        console.log(this._labels);
        for (const label of this._labels) {
            label.fontFace = this._font!;

            if (label instanceof Position2DLabel) {
                glyphs2D.concat(label.typeset(frameSize));
            } else if (label instanceof Position3DLabel) {
                glyphs3D.concat(label.typeset());
            }
        }

        this._geometry2D.update(glyphs2D.origins, glyphs2D.tangents, glyphs2D.ups, glyphs2D.texCoords);
        this._geometry3D.update(glyphs3D.origins, glyphs3D.tangents, glyphs3D.ups, glyphs3D.texCoords);
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

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_glyphs'), 0);
        gl.uniform4fv(this._uColor, this._color.rgbaF32);
        this._program.unbind();


        const aVertex = this._program.attribute('a_vertex', 0);
        const aTexCoord = this._program.attribute('a_texCoord', 1);
        const aOrigin = this._program.attribute('a_origin', 2);
        const aTangent = this._program.attribute('a_tangent', 3);
        const aUp = this._program.attribute('a_up', 4);


        if (!this._geometry2D.initialized) {
            this._geometry2D.initialize(aVertex, aTexCoord, aOrigin, aTangent, aUp);
        }
        if (!this._geometry3D.initialized) {
            this._geometry3D.initialize(aVertex, aTexCoord, aOrigin, aTangent, aUp);
        }


        /* Deprecated  @todo this will be removed soon. There will be no default font. */
        FontFace.fromFile('./data/opensansr144.fnt', this._context).then((fontFace) => {
            this._font = fontFace;
            this._altered.alter('font');
        });

        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._geometry3D.uninitialize();
        this._geometry2D.uninitialize();
        this._program.uninitialize();

        this._uViewProjection = undefined;
        this._uNdcOffset = undefined;
        this._uColor = undefined;
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
        gl.depthFunc(gl.LESS);

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

        this._geometry3D.bind();
        this._geometry3D.draw();

        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, mat4.create());

        this._geometry2D.bind();
        this._geometry2D.draw();


        /** Every stage is expected to bind its own vao when drawing, unbinding is not necessary. */
        // this._geometry.unbind();
        /** Every stage is expected to bind its own program when drawing, unbinding is not necessary. */
        // this._program.unbind();

        this._font.glyphTexture.unbind(gl.TEXTURE0);

        if (this._depthMask === false) {
            gl.depthMask(true);
        }

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

}
