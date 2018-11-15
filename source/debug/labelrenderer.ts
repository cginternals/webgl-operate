
import { assert, log, LogLevel } from '../auxiliaries';

import { vec3 } from 'gl-matrix';

import { AccumulatePass } from '../accumulatepass';
import { AntiAliasingKernel } from '../antialiasingkernel';
import { BlitPass } from '../blitpass';
import { Camera } from '../camera';
import { Color } from '../color';
import { Context } from '../context';
import { DefaultFramebuffer } from '../defaultframebuffer';
import { Framebuffer } from '../framebuffer';
import { MouseEventProvider } from '../mouseeventprovider';
import { Navigation } from '../navigation';
import { Program } from '../program';
import { Renderbuffer } from '../renderbuffer';
import { Invalidate, Renderer } from '../renderer';
import { Shader } from '../shader';
import { Texture2D } from '../texture2d';

import { FontFace } from '../text/fontface';
import { Label } from '../text/label';
import { LabelRenderPass } from '../text/labelrenderpass';
import { Position2DLabel } from '../text/position2dlabel';
import { Position3DLabel } from '../text/position3dlabel';
import { Text } from '../text/text';

import { TestNavigation } from './testnavigation';


namespace debug {

    /**
     * This is an example renderer for labels. It uses a LabelRenderPass.
     */
    export class LabelRenderer extends Renderer {

        protected _extensions = false;
        protected _program: Program;

        protected _ndcOffsetKernel: AntiAliasingKernel;
        protected _uNdcOffset: WebGLUniformLocation;
        protected _uFrameNumber: WebGLUniformLocation;

        protected _accumulate: AccumulatePass;
        protected _blit: BlitPass;
        protected _labelPass: LabelRenderPass;

        protected _camera: Camera;
        protected _uViewProjection: WebGLUniformLocation;

        protected _defaultFBO: DefaultFramebuffer;
        protected _colorRenderTexture: Texture2D;
        protected _depthRenderbuffer: Renderbuffer;
        protected _intermediateFBO: Framebuffer;

        protected _testNavigation: TestNavigation;
        protected _navigation: Navigation;

        protected _fontFace: FontFace;


        /**
         * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
         * @param context - valid context to create the object for.
         * @param identifier - meaningful name for identification of this instance.
         * @param mouseEventProvider - required for mouse interaction
         * @returns - whether initialization was successful
         */
        protected onInitialize(context: Context, callback: Invalidate,
            mouseEventProvider: MouseEventProvider,
        /* keyEventProvider: KeyEventProvider, */
        /* touchEventProvider: TouchEventProvider */): boolean {

            const gl = this._context.gl;
            const gl2facade = this._context.gl2facade;

            /* Enable required extensions. */

            if (this._extensions === false && this._context.isWebGL1) {
                assert(this._context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
                /* tslint:disable-next-line:no-unused-expression */
                this._context.standardDerivatives;
                this._extensions = true;
            }

            /* Create and configure program and geometry. */

            const vert = new Shader(this._context, gl.VERTEX_SHADER, 'glyph.vert');
            vert.initialize(require('../text/glyph.vert'));

            const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'glyph.frag');
            frag.initialize(require('../text/glyph.frag'));

            this._program = new Program(this._context);
            this._program.initialize([vert, frag]);

            this._uNdcOffset = this._program.uniform('u_ndcOffset');
            this._uFrameNumber = this._program.uniform('u_frameNumber');
            this._uViewProjection = this._program.uniform('u_viewProjection');

            this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);

            /* Create framebuffers, textures, and render buffers. */

            this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
            this._defaultFBO.initialize();

            this._colorRenderTexture = new Texture2D(this._context, 'ColorRenderTexture');
            this._depthRenderbuffer = new Renderbuffer(this._context, 'DepthRenderbuffer');

            this._intermediateFBO = new Framebuffer(this._context, 'IntermediateFBO');

            /* Create and configure accumulation pass. */

            this._accumulate = new AccumulatePass(this._context);
            this._accumulate.initialize();
            this._accumulate.precision = this._framePrecision;
            this._accumulate.texture = this._colorRenderTexture;
            // this._accumulate.depthStencilAttachment = this._depthRenderbuffer;

            /* Create and configure blit pass. */

            this._blit = new BlitPass(this._context);
            this._blit.initialize();
            this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
            this._blit.drawBuffer = gl.BACK;
            this._blit.target = this._defaultFBO;


            /* Create and configure test navigation. */

            this._camera = new Camera();
            this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
            this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._camera.eye = vec3.fromValues(0.0, 0.0, 2.0);
            this._camera.near = 0.1;
            this._camera.far = 8.0;

            /* Initialize navigation */
            this._navigation = new Navigation(callback, mouseEventProvider);
            this._navigation.camera = this._camera;

            /* Create and configure label pass. */

            this._labelPass = new LabelRenderPass(context);
            this._labelPass.initialize();
            this._labelPass.camera = this._camera;
            this._labelPass.target = this._intermediateFBO;
            this._labelPass.color = new Color([1.0, 1.0, 1.0, 1.0]);

            FontFace.fromFile('./data/opensansr144.fnt', context)
                .then((fontFace) => {
                    this._labelPass.fontFace = fontFace;
                    this.invalidate();
                })
                .catch((reason) => log(LogLevel.Error, reason));

            this.setupScene();

            return true;
        }

        /**
         * Uninitializes Buffers, Textures, and Program.
         */
        protected onUninitialize(): void {
            super.uninitialize();

            this._uNdcOffset = -1;
            this._uFrameNumber = -1;
            this._program.uninitialize();

            this._intermediateFBO.uninitialize();
            this._defaultFBO.uninitialize();
            this._colorRenderTexture.uninitialize();
            this._depthRenderbuffer.uninitialize();

            this._blit.uninitialize();
            this._labelPass.uninitialize();
        }

        /**
         * This is invoked in order to check if rendering of a frame is required by means of implementation specific
         * evaluation (e.g., lazy non continuous rendering). Regardless of the return value a new frame (preparation,
         * frame, swap) might be invoked anyway, e.g., when update is forced or canvas or context properties have
         * changed or the renderer was invalidated @see{@link invalidate}.
         * Updates the navigaten and the AntiAliasingKernel.
         * @returns whether to redraw
         */
        protected onUpdate(): boolean {

            this._ndcOffsetKernel = new AntiAliasingKernel(this._multiFrameNumber);

            this._navigation.update();

            return this._altered.any || this._camera.altered;
        }

        /**
         * This is invoked in order to prepare rendering of one or more frames, regarding multi-frame rendering and
         * camera-updates.
         */
        protected onPrepare(): void {

            const gl = this._context.gl;
            const gl2facade = this._context.gl2facade;

            if (!this._intermediateFBO.initialized) {
                this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                    this._context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
                this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
                this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                    , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);

                this._camera.aspect = this._frameSize[0] / this._frameSize[1];

            } else if (this._altered.frameSize) {
                this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
                this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
                this._camera.aspect = this._frameSize[0] / this._frameSize[1];
                /** @todo
                 * update the geometry of the labels that use pt sizes (e.g. labels in screen space)
                 * and/or update: labels that get too small (to be readable) should not be rendered anymore
                 * (a.k.a. threshold for readability)
                 */
                this.setupScene();
            }

            if (this._altered.canvasSize) {
                this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
            }

            if (this._altered.multiFrameNumber) {
                this._ndcOffsetKernel.width = this._multiFrameNumber;
            }

            if (this._altered.framePrecision) {
                this._accumulate.precision = this._framePrecision;
            }

            if (this._altered.clearColor) {
                this._intermediateFBO.clearColor(this._clearColor);
            }

            this._accumulate.update();

            if (this._camera.altered) {
                this._program.bind();
                gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
                this._program.unbind();
            }

            this._labelPass.update();

            this._altered.reset();
            this._camera.altered = false;
        }

        /**
         * After (1) update and (2) preparation are invoked, a frame is invoked. Renders both 2D and 3D labels.
         * @param frameNumber - for intermediate frames in accumulation rendering
         */
        protected onFrame(frameNumber: number): void {
            const gl = this._context.gl;

            gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

            this._program.bind();

            const ndcOffset = this._ndcOffsetKernel.get(frameNumber) as [number, number];
            ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
            ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];

            this._labelPass.ndcOffset = ndcOffset;

            gl.uniform2fv(this._uNdcOffset, ndcOffset);
            gl.uniform1i(this._uFrameNumber, frameNumber);

            this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
            this._labelPass.frame();
            this._intermediateFBO.unbind();

            this._accumulate.frame(frameNumber);

        }

        /**
         * After (1) update, (2) preparation, and (3) frame are invoked, a swap is invoked for multi-frame rendering.
         */
        protected onSwap(): void {
            this._blit.framebuffer = this._accumulate.framebuffer ?
                this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
            this._blit.frame();
        }

        /**
         * Sets up an example scene with 2D and 3D labels and sets the corresponding data on LabelGeometries. The
         * FontFace is set on each label by the LabelRenderPass.
         */
        protected setupScene(): void {

            /** OpenLL 3D Labels */

            // const pos3Dlabel = new Position3DLabel(new Text('Hello Position 3D!'));
            // pos3Dlabel.fontSize = 0.1;

            // /* position values in world, since fontSizeUnit is set to SpaceUnit.World */
            // pos3Dlabel.setPosition(0.0, 0.1, -0.5);
            // pos3Dlabel.setDirection(0.0, 1.0, 0.0);
            // pos3Dlabel.setUp(-1.0, 0.0, 0.0);

            // const shadowPos3Dlabel = new Position3DLabel(new Text('Hello Position Shadow'));
            // shadowPos3Dlabel.setPosition(0.0, 0.1, -0.5);
            // shadowPos3Dlabel.fontSize = 0.1;
            // shadowPos3Dlabel.setDirection(0.0, 1.0, 0.0);
            // shadowPos3Dlabel.setUp(0.0, 0.0, -1.0);

            // const anotherPos3Dlabel = new Position3DLabel(new Text('Yet another 3D Label'));
            // anotherPos3Dlabel.setPosition(0.2, -0.1, 0.0);
            // anotherPos3Dlabel.setDirection(-1.0, 0.0, 0.0);
            // anotherPos3Dlabel.setUp(0.0, -1.0, 0.0);

            // /** OpenLL 2D Labels */

            // const pos2Dlabel = new Position2DLabel(new Text('Hello Position 2D!'));
            // pos2Dlabel.fontSize = 40;

            // /* position values in px, since fontSizeUnit is set to SpaceUnit.Px */
            // pos2Dlabel.setPosition(-100, 0);
            // pos2Dlabel.setDirection(0.5, -0.5);


            /** Wrapped labels, showcasing Ellipsis and NewLine */

            const werther = 'A wonderful serenity\n; has taken possession of my entire soul, like these sweet mornings \
of spring which I enjoy with my whole heart. I am alone, and feel the charm of existence in this spot, which was \
created for the bliss of souls like mine. I am so happy, my dear friend, so absorbed in the exquisite sense of mere \
tranquil existence, that I neglect my talents. I should be incapable of drawing a single stroke at the present \
moment; and yet I feel that I never was a greater artist than now. When, while the lovely valley teems with vapour \
around me, and the meridian sun strikes the upper surface of the impenetrable foliage of my trees, and but a few \
stray gleams steal into the inner sanctuary, I throw myself down among the tall grass by the trickling stream; and, \
as I lie close to the earth, a thousand unknown plants are noticed by me: when I hear the buzz of the little world \
among the stalks, and grow familiar with the countless indescribable forms of the insects and flies, then I feel the \
presence of the Almighty, who formed us in his own image, and the breath of that universal love which bears and \
sustains us, as it floats around us in an eternity of bliss;  and then, my friend, when darkness overspreads my eyes, \
and heaven and earth seem to dwell in my soul and absorb its power, like the form of a beloved mistress, then I often \
think with longing, Oh, would I could describe these conceptions, could impress upon paper all that is living so full \
and warm within me, that it might be the mirror of my soul, as my soul is the mirror of the infinite God!';

            // const numbers = '0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30';

            const label0 = new Position3DLabel(new Text(`${werther}`));
            label0.lineWidth = 1.0;
            label0.setPosition(-1.2, +0.5, 0.5);
            label0.alignment = Label.Alignment.Left;
            label0.wordWrapper = Label.WordWrap.LineFeed;

            const label1 = new Position3DLabel(new Text(`${werther}`));
            label1.lineWidth = 1.0;
            label1.setPosition(+0.1, +0.5, 0.5);
            label1.alignment = Label.Alignment.Left;
            label1.moep = true;
            label1.wrap = true;



            // const a = 1; // 0.0668; // 0.03993;
            // const label3dEllipsisEnd = new Position3DLabel(new Text(`WordWrap.EllipsisEnd | ${werther}`));
            // label3dEllipsisEnd.lineWidth = a;
            // label3dEllipsisEnd.wordWrapper = Label.WordWrap.EllipsisEnd;
            // label3dEllipsisEnd.setPosition(-1, 0.4, 0);

            // const label3dEllipsisMiddle = new Position3DLabel(new Text(`WordWrap.EllipsisMiddle | ${werther}`));
            // label3dEllipsisMiddle.lineWidth = a;
            // label3dEllipsisMiddle.wordWrapper = Label.WordWrap.EllipsisMiddle;
            // label3dEllipsisMiddle.setPosition(-1, 0.1, 0);

            // const label3dEllipsisBeginning = new Position3DLabel(new Text(`WordWrap.EllipsisBeginning | ${werther}`));
            // label3dEllipsisBeginning.lineWidth = a;
            // label3dEllipsisBeginning.wordWrapper = Label.WordWrap.EllipsisBeginning;
            // label3dEllipsisBeginning.setPosition(-1, -0.2, 0);

            // const differentEllipsis = new Position2DLabel(new Text(`Custom Ellipsis | ${werther}`));
            // differentEllipsis.ellipsisChars = '~';
            // differentEllipsis.setPosition(-200, -150);
            // differentEllipsis.lineWidth = 200;
            // differentEllipsis.wordWrapper = Label.WordWrap.EllipsisMiddle;


            this._labelPass.labels = [label0, label1];
            // this._labelPass.labels = [pos3Dlabel, shadowPos3Dlabel, anotherPos3Dlabel, pos2Dlabel,
            //     wrapped2DLabel, label3dEllipsisMiddle, label3dEllipsisBeginning, label3dEllipsisEnd, differentEllipsis];
        }
    }
}

export = debug;
