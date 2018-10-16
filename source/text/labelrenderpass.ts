
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

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

import { FontLoader } from './fontloader';
import { Label } from './label';
import { LabelGeometry } from './labelgeometry';
import { Position2DLabel } from './position2dlabel';
import { Position3DLabel } from './position3dlabel';
import { Typesetter } from './typesetter';


/**
 * The LabelRenderPass @todo
 */
export class LabelRenderPass extends Initializable {

    /**
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false, camera: false, geometry: false, color: false,
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


    protected _program: Program;
    protected _uViewProjection: WebGLUniformLocation | undefined;
    protected _uNdcOffset: WebGLUniformLocation | undefined;
    protected _uColor: WebGLUniformLocation | undefined;

    protected _fontFace: FontFace;
    protected _labels3D: Array<Position3DLabel>;
    protected _labels2D: Array<Position2DLabel>;
    protected _geometry3D: LabelGeometry;
    protected _geometry2D: LabelGeometry;
    protected _vertices3D: GlyphVertices;
    protected _vertices2D: GlyphVertices;

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
        this._vertices3D = new GlyphVertices(0);
        this._vertices2D = new GlyphVertices(0);

        this._color = new Color([0.5, 0.5, 0.5], 1.0);
    }

    /**
     * Loads a font asset and creates a FontFace
     * @param context - Valid context to create the object for.
     */
    protected loadFont(context: Context): void {

        /* This is a placeholder until the 'real' fontFace is loaded asynchronously by the fontLoader */
        const fontFace: FontFace = new FontFace(context);
        this._fontFace = fontFace;

        FontLoader.load(context, './data/opensansr144.fnt', false).then(
            (fontFace) => {
                this._fontFace = fontFace;
                this.renderThese3DLabels(this._labels3D);
                this.renderThese2DLabels(this._labels2D);
            },
        );
    }

    /**
     * Typesets and renders 2D labels. If font face is not loaded yet, this function will be called again after a valid
     * font face is loaded.
     * @param labels - all 2D labels
     */
    renderThese2DLabels(labels: Array<Position2DLabel>): void {
        if (labels.length === 0) {
            log(LogLevel.Debug, `No 2D labels to render!`);
            return;
        }

        /** We need to hold those labels because this function might be called before the font face
         * is loaded. Once the font face is loaded, we try to render those labels again.
         */

        this._labels2D = labels;

        if (this._fontFace.glyphTextureExtent['0'] === 0) {
            log(LogLevel.Debug,
                `Will not render 2D labels as long as font face is not loaded.`);
            return;
        }

        this.clear2DLabels();
        labels.forEach((label: Position2DLabel) => {
            this.render2DLabel(label);
        });
    }

    /**
     * Typesets and renders 3D labels. If font face is not loaded yet, this function will be called again after a valid
     * font face is loaded.
     * @param labels - all 3D labels
     */
    renderThese3DLabels(labels: Array<Position3DLabel>): void {
        if (labels.length === 0) {
            log(LogLevel.Debug, `No 3D labels to render!`);
            return;
        }

        /** We need to hold those labels because this function might be called before the font face
         * is loaded. Once the font face is loaded, we try to render those labels again.
         */

        this._labels3D = labels;

        if (this._fontFace.glyphTextureExtent['0'] === 0) {
            log(LogLevel.Debug,
                `Will not render 3D labels as long as font face is not loaded.`);
            return;
        }

        this.clear3DLabels();
        labels.forEach((label: Position3DLabel) => {
            this.render3DLabel(label);
        });
    }

    /**
     * Removes all calculated vertices for 2D labels.
     */
    clear2DLabels(): void {
        this._vertices2D = new GlyphVertices(0);
    }

    /**
     * Removes all calculated vertices for 3D labels.
     */
    clear3DLabels(): void {
        this._vertices3D = new GlyphVertices(0);
    }

    /**
     * Typesets a label and adds it to the 2D labels that will be rendered.
     * @param label - the 2D label to be rendered.
     */
    render2DLabel(label: Position2DLabel): void {
        label.fontFace = this._fontFace;

        const frameSize = this._camera.viewport;

        this._vertices2D = this._vertices2D.concat(label.typeset(frameSize)) as GlyphVertices;
        this._vertices2D.updateBuffers();

        this._geometry2D.setGlyphCoords(this._vertices2D.origins, this._vertices2D.tangents, this._vertices2D.ups);
        this._geometry2D.setTexCoords(this._vertices2D.texCoords);
    }

    /**
     * Typesets a label and adds it to the 3D labels that will be rendered.
     * @param label - the 3D label to be rendered.
     */
    render3DLabel(label: Position3DLabel): void {
        label.fontFace = this._fontFace;

        this._vertices3D = this._vertices3D.concat(label.typeset()) as GlyphVertices;
        this._vertices3D.updateBuffers();

        this._geometry3D.setGlyphCoords(this._vertices3D.origins, this._vertices3D.tangents, this._vertices3D.ups);
        this._geometry3D.setTexCoords(this._vertices3D.texCoords);
    }

    /**
     * This is deprecated and currently kept for compatibility. It can be generically used for all kinds of labels.
     */
    prepareLabel(label: Label, is3D: boolean): void {
        label.fontFace = this._fontFace;

        label.transform = label.userTransform;

        const frameSize = this._camera.viewport;

        if (label.fontSizeUnit === Label.SpaceUnit.Px) {
            // TODO meaningful margins from label.margins or config.margins ?
            const margins: vec4 = vec4.create();
            // TODO meaningful ppiScale from label.ppiScale or config.ppiScale ?
            const ppiScale = 1;

            /* compute transform matrix */
            const transform = mat4.create();

            if (is3D) {
                /* even though px as font size unit doesn't make sense in 3D space, the current architecture doesn't
                forbid it. We have to pre-scale using aspect ratio. */
                mat4.scale(transform, transform, vec3.fromValues(1.0,
                    frameSize[1] / frameSize[0],
                    1.0));
            }

            // translate to lower left in NDC
            mat4.translate(transform, transform, vec3.fromValues(-1.0, -1.0, 0.0));
            // scale glyphs to NDC size
            // this._frameSize should be the viewport size
            mat4.scale(transform, transform, vec3.fromValues(2.0 / frameSize[0],
                2.0 / frameSize[1],
                1.0));

            // scale glyphs to pixel size with respect to the displays ppi
            mat4.scale(transform, transform, vec3.fromValues(ppiScale, ppiScale, ppiScale));

            // translate to origin in point space - scale origin within
            // margined extend (i.e., viewport with margined areas removed)
            const marginedExtent: vec2 = vec2.create();
            vec2.sub(marginedExtent, vec2.fromValues(
                frameSize[0] / ppiScale, frameSize[1] / ppiScale),
                vec2.fromValues(margins[3] + margins[1], margins[2] + margins[0]));

            const v3 = vec3.fromValues(0.5 * marginedExtent[0], 0.5 * marginedExtent[1], 0);
            vec3.add(v3, v3, vec3.fromValues(margins[3], margins[2], 0.0));
            mat4.translate(transform, transform, v3);

            label.transform = mat4.mul(label.transform, label.userTransform, transform);
        }

        /* prepare vertex storage (values will be overridden by typesetter) */
        const vertices = new GlyphVertices(label.length);

        Typesetter.typeset(label, vertices, 0);

        this._vertices2D = this._vertices2D.concat(vertices) as GlyphVertices;

        const origins: Array<number> = [];
        const tans: Array<number> = [];
        const ups: Array<number> = [];
        const texCoords: Array<number> = [];

        const l = this._vertices2D.length;

        for (let i = 0; i < l; i++) {
            const v = this._vertices2D[i];

            origins.push.apply(origins, v.origin);
            tans.push.apply(tans, v.tangent);
            ups.push.apply(ups, v.up);
            texCoords.push.apply(texCoords, v.uvRect);
        }

        if (is3D) {
            this._geometry3D.setGlyphCoords(
                Float32Array.from(origins), Float32Array.from(tans), Float32Array.from(ups));
            this._geometry3D.setTexCoords(Float32Array.from(texCoords));
        } else {
            this._geometry2D.setGlyphCoords(
                Float32Array.from(origins), Float32Array.from(tans), Float32Array.from(ups));
            this._geometry2D.setTexCoords(Float32Array.from(texCoords));
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

        this.loadFont(this._context);

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


    @Initializable.assert_initialized()
    update(): void {
        const gl = this._context.gl;
        this._program.bind();

        if (this._altered.camera || this._camera.altered) {
            gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);
        }

        if (this._altered.color) {
            gl.uniform4fv(this._uColor, this._color.rgbaF32);
        }

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    frame(): void {
        assert(this._target && this._target.valid, `valid target expected`);

        const gl = this._context.gl;

        const size = this._target.size;
        gl.viewport(0, 0, size[0], size[1]);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        gl.enable(gl.BLEND);
        /* Note that WebGL supports separate blend by default. */
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        /* Use the following plain blend mode when relying on premultiplied colors. */
        // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        this._program.bind();

        gl.uniform2fv(this._uNdcOffset, this._ndcOffset);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        this._fontFace.glyphTexture.bind(gl.TEXTURE0);


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

        this._fontFace.glyphTexture.unbind(gl.TEXTURE0);

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

}
