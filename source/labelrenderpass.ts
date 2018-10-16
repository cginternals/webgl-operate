
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { assert, log, LogLevel } from './auxiliaries';

import { Camera } from './camera';
import { ChangeLookup } from './changelookup';
import { Context } from './context';
import { FontFace } from './fontface';
import { FontLoader } from './fontloader';
import { Framebuffer } from './framebuffer';
import { GlyphVertices } from './glyphvertices';
import { Initializable } from './initializable';
import { Label } from './label';
import { LabelGeometry } from './labelgeometry';
import { Position2DLabel } from './position2dlabel';
import { Position3DLabel } from './position3dlabel';
import { Program } from './program';
import { Shader } from './shader';
import { Typesetter } from './typesetter';

import tuples = require('./tuples');


export class LabelRenderPass extends Initializable {

    private _standardDerivatives: any = undefined;


    /**
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false, camera: false, geometry: false,
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
    protected _ndcOffset: tuples.GLfloat2;

    /** @see {@link attachment} */
    protected _attachment: number | undefined;

    protected _drawRestricted: boolean;

    protected _program: Program;
    protected _uAttachment: WebGLUniformLocation | undefined;
    protected _uViewProjection: WebGLUniformLocation | undefined;
    protected _uNdcOffset: WebGLUniformLocation | undefined;
    protected _uGlyphAtlas: WebGLUniformLocation | undefined;

    protected _fontFace: FontFace;
    protected _labels3D: Array<Position3DLabel>;
    protected _labels2D: Array<Position2DLabel>;
    protected _geometry3D: LabelGeometry;
    protected _geometry2D: LabelGeometry;
    protected _vertices3D: GlyphVertices;
    protected _vertices2D: GlyphVertices;

    /**
     * Creates a render pass for labels.
     * @param context the WebGL rendering context
     */
    constructor(context: Context) {
        super();
        this._context = context;

        this._drawRestricted = !this._context.isWebGL2 && !this._context.supportsDrawBuffers;

        this._program = new Program(context, 'LabelRenderProgram');
        this._geometry3D = new LabelGeometry(this._context, 'LabelRenderGeometry');
        this._geometry2D = new LabelGeometry(this._context, 'LabelRenderGeometry2D');
        this._vertices3D = new GlyphVertices(0);
        this._vertices2D = new GlyphVertices(0);
    }

    protected loadFont(context: Context): void {

        /* This is a placeholder until the 'real' fontFace is loaded asynchronously by the fontLoader */
        const fontFace: FontFace = new FontFace(context);
        this._fontFace = fontFace;

        FontLoader.load(context, './data/opensansr144/opensansr144.fnt', false).then(
            (fontFace) => {
                this._fontFace = fontFace;
                this.renderThese3DLabels(this._labels3D);
                this.renderThese2DLabels(this._labels2D);
            },
        );
    }

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

    clear2DLabels(): void {
        this._vertices2D = new GlyphVertices(0);
    }

    clear3DLabels(): void {
        this._vertices3D = new GlyphVertices(0);
    }

    render2DLabel(label: Position2DLabel): void {
        label.fontFace = this._fontFace;

        const frameSize = this._camera.viewport;

        this._vertices2D = this._vertices2D.concat(label.typeset(frameSize)) as GlyphVertices;
        this._vertices2D.updateBuffers();

        this._geometry2D.setGlyphCoords(this._vertices2D.origins, this._vertices2D.tangents, this._vertices2D.ups);
        this._geometry2D.setTexCoords(this._vertices2D.texCoords);
    }

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

        /* Note that storing the extension has no use except preventing the compiler to remove the
        context call in TPE. */
        if (this._context.isWebGL1 && this._standardDerivatives === undefined) {
            assert(this._context.supportsStandardDerivatives,
                'OES_standard_derivatives is required by QuadRenderPass');
            this._standardDerivatives = this._context.standardDerivatives;
        }

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'glyphquad.vert');
        vert.initialize(require('./shaders/glyphquad.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'glyphquad.frag');
        frag.initialize(require('./shaders/glyphquad.frag'));

        this._program.initialize([vert, frag]);

        if (this._drawRestricted) {
            this._uAttachment = this._program.uniform('u_attachment');
        }

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uGlyphAtlas = this._program.uniform('u_glyphs');

        const aVertex = this._program.attribute('a_quadVertex', 0);
        const aTexCoord = this._program.attribute('a_texCoord', 1);
        const aOrigin = this._program.attribute('a_origin', 2);
        const aTan = this._program.attribute('a_tan', 3);
        const aUp = this._program.attribute('a_up', 4);

        if (!this._geometry2D.initialized) {
            this._geometry2D.initialize(aVertex, aTexCoord, aOrigin, aTan, aUp);
        }

        if (!this._geometry3D.initialized) {
            this._geometry3D.initialize(aVertex, aTexCoord, aOrigin, aTan, aUp);
        }

        this.loadFont(this._context);

        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._geometry3D.uninitialize();
        this._geometry2D.uninitialize();
        this._program.uninitialize();

        this._uAttachment = undefined;
        this._uViewProjection = undefined;
        this._uNdcOffset = undefined;
        this._uGlyphAtlas = undefined;
    }


    @Initializable.assert_initialized()
    update(): void {
        const gl = this._context.gl;
        this._program.bind();

        if (this._altered.camera || this._camera.altered) {
            gl.uniformMatrix4fv(this._uViewProjection, false, this._camera.viewProjection);
        }
        /*
        if (this._altered.geometry && this._geometry2D.valid && this._geometry3D.valid) {
            this._geometry2D.update();
            this._geometry3D.update();
        }
        */

        this._altered.reset();
    }

    @Initializable.assert_initialized()
    frame(): void {
        assert(this._target && this._target.valid, `valid target expected`);

        const gl = this._context.gl;

        const size = this._target.size;
        gl.viewport(0, 0, size[0], size[1]);

        gl.disable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        let wasBlendEnabled = false;
        const oldBlendSRC: any = gl.getParameter(gl.BLEND_SRC_RGB);
        const oldBlendDST: any = gl.getParameter(gl.BLEND_DST_RGB);

        wasBlendEnabled = gl.isEnabled(gl.BLEND);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        /**
         * If rendering is restricted to any attachment > 0 the depth attachment or actual depth buffer
         * is used as is and no depth is written to the buffer.
         */
        if (this._attachment !== undefined && this._attachment > 0) {
            gl.depthFunc(gl.LEQUAL);
            gl.depthMask(false);
        } else {
            gl.depthFunc(gl.LESS);
        }

        this._program.bind();

        if (this._drawRestricted) {
            gl.uniform1i(this._uAttachment, this._attachment);
        }

        gl.uniform2fv(this._uNdcOffset, this._ndcOffset);

        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        this._fontFace.glyphTexture.bind(gl.TEXTURE0);
        gl.uniform1i(this._uGlyphAtlas, 0);

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

        gl.blendFunc(oldBlendSRC, oldBlendDST);
        if (!wasBlendEnabled) {
            gl.disable(gl.BLEND);
        }

        gl.depthFunc(gl.LESS);
        gl.depthMask(true);

        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.DEPTH_TEST);
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
    set ndcOffset(offset: tuples.GLfloat2) {
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
     * Sets the attachment which should be rendered to when multiple render targets are not available.
     */
    set attachment(id: number | undefined) {
        assert(id === undefined || (id !== undefined && this._drawRestricted),
            `expected draw buffers to be unsupported`);
        this._attachment = id;
    }
}

