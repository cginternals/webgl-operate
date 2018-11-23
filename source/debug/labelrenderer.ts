
/* spellchecker: disable */

import { assert, log, LogLevel } from '../auxiliaries';

import { vec3 } from 'gl-matrix';

import { fract } from '../gl-matrix-extensions';

import { AccumulatePass } from '../accumulatepass';
import { AntiAliasingKernel } from '../antialiasingkernel';
import { BlitPass } from '../blitpass';
import { Camera } from '../camera';
import { Context } from '../context';
import { DefaultFramebuffer } from '../defaultframebuffer';
import { Framebuffer } from '../framebuffer';
import { MouseEventProvider } from '../mouseeventprovider';
import { Navigation } from '../navigation';
import { Renderbuffer } from '../renderbuffer';
import { Invalidate, Renderer } from '../renderer';
import { Texture2D } from '../texture2d';

import { FontFace } from '../text/fontface';
import { Label } from '../text/label';
import { LabelRenderPass } from '../text/labelrenderpass';
import { Position2DLabel } from '../text/position2dlabel';
import { Position3DLabel } from '../text/position3dlabel';
import { Text } from '../text/text';
import { Projected3DLabel } from '../text';

/* spellchecker: enable */


namespace debug {

    /**
     * This is an example renderer for labels. It uses a LabelRenderPass.
     */
    export class LabelRenderer extends Renderer {

        protected _extensions = false;

        protected _ndcOffsetKernel: AntiAliasingKernel;

        protected _accumulate: AccumulatePass;
        protected _blit: BlitPass;
        protected _labelPass: LabelRenderPass;

        protected _camera: Camera;

        protected _defaultFBO: DefaultFramebuffer;
        protected _colorRenderTexture: Texture2D;
        protected _depthRenderbuffer: Renderbuffer;
        protected _intermediateFBO: Framebuffer;

        protected _navigation: Navigation;


        protected _hue = 0;
        protected _pos = 0;

        protected _fontFace: FontFace | undefined;

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
            this._labelPass.depthMask = true;

            FontFace.fromFile('./data/opensansr144.fnt', context)
                .then((fontFace) => {
                    for (const label of this._labelPass.labels) {
                        label.fontFace = fontFace;
                    }
                    this._fontFace = fontFace;
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

            for (const label of this._labelPass.labels) {
                if (label.altered || label.color.altered) {
                    return true;
                }
            }
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

            this._labelPass.update();
            this._accumulate.update();

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

            const ndcOffset = this._ndcOffsetKernel.get(frameNumber) as [number, number];
            ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
            ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];

            this._labelPass.ndcOffset = ndcOffset;

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

            const werther = 'A wonderful serenity has taken possession of my entire soul, like these sweet mornings \
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


            const label0 = new Position3DLabel(new Text(`${werther}`), Label.Type.Static);
            label0.lineWidth = 1.0;
            label0.position = [-1.2, +0.5, 0.5];
            label0.alignment = Label.Alignment.Left;
            label0.wrap = true;

            const label1 = new Position3DLabel(new Text(`${werther}`), Label.Type.Static);
            label1.lineWidth = 1.0;
            label1.position = [+0.1, +0.5, 0.5];
            label1.alignment = Label.Alignment.Left;
            label1.elide = Label.Elide.Middle;
            label1.color.fromHex('ff8888');

            const label2 = new Position3DLabel(new Text(`${werther}`), Label.Type.Dynamic);
            label2.lineWidth = 1.0;
            label2.position = [+0.1, +0.3, 0.5];
            label2.alignment = Label.Alignment.Left;
            label2.elide = Label.Elide.Right;
            label2.color.fromHex('75bc1c');


            const label3 = new Position3DLabel(new Text(`${werther}`), Label.Type.Dynamic);
            label3.lineWidth = 1.0;
            label3.position = [+0.1, +0.1, 0.5];
            label3.alignment = Label.Alignment.Left;
            label3.elide = Label.Elide.Left;
            label3.color.fromHex('1cbc75');

            const label4 = new Position3DLabel(new Text(`${werther}`), Label.Type.Static);
            label4.lineWidth = 0.66;
            label4.position = [+0.1, -0.1, 0.5];
            label4.alignment = Label.Alignment.Left;
            label4.wrap = true;
            label4.color.fromHex('eeeeee');

            const label2D = new Position2DLabel(new Text(`Hello Again, 2D!`), Label.Type.Dynamic);
            label2D.fontSize = 50;
            label2D.alignment = Label.Alignment.Center;
            label2D.color.fromHex('f0ba42');

            const labelOrder1 = new Position2DLabel(new Text(`Currently,`), Label.Type.Static);
            labelOrder1.fontSize = 185;
            labelOrder1.position = [0, 85];
            labelOrder1.alignment = Label.Alignment.Center;
            labelOrder1.lineAnchor = Label.LineAnchor.Center;
            labelOrder1.color.fromHex('660000');
            const labelOrder2 = new Position2DLabel(new Text(`drawing order`), Label.Type.Static);
            labelOrder2.fontSize = 165;
            labelOrder2.position = [0, 0];
            labelOrder2.alignment = Label.Alignment.Center;
            labelOrder2.lineAnchor = Label.LineAnchor.Center;
            labelOrder2.color.fromHex('006600');
            const labelOrder3 = new Position2DLabel(new Text(`is important!`), Label.Type.Static);
            labelOrder3.fontSize = 185;
            labelOrder3.position = [0, -85];
            labelOrder3.alignment = Label.Alignment.Center;
            labelOrder3.lineAnchor = Label.LineAnchor.Center;
            labelOrder3.color.fromHex('000066');

            // const projectedLabel = new Projected3DLabel(new Text('Hello Projected!'), Label.Type.Static);
            // projectedLabel.position = [+0.1, 0.0, 0.5];

            setInterval(() => {
                const hsl = label1.color.hsl;

                this._hue = performance.now() * 0.0004;
                label1.color.fromHSL(fract(this._hue), hsl[1], hsl[2]);

                label2.position = [+0.1 + Math.cos(this._hue * 16.0) * 0.05, +0.3, Math.sin(this._hue * 2.0) * 0.5];
                // projectedLabel.position = [+0.1 + Math.cos(this._hue * 16.0) * 0.05,
                //     0,
                // Math.sin(this._hue * 2.0) * 0.5];

                label2D.position = [Math.cos(this._hue * 4.0) * 40, Math.sin(this._hue * 4.0) * 40];

                label3.up = [0, Math.cos(this._hue * 8.0), Math.sin(this._hue * 8.0)];

                label1.lineWidth = Math.sin(this._hue * 4.0) * 0.5 + 0.5;

                label4.text.text = werther.substr(this._pos, 128);
                ++this._pos;
                if (this._pos > werther.length) {
                    this._pos = 0;
                }

                if (this._pos % 10 === 0) {
                    const newLabel = new Position3DLabel(new Text('trololo'), Label.Type.Static);
                    newLabel.position = [0.0, 0.0, this._pos * 0.01];
                    newLabel.color.fromHex('440000');
                    newLabel.alignment = Label.Alignment.Center;
                    newLabel.lineAnchor = Label.LineAnchor.Center;

                    const projectedLabel = new Projected3DLabel(new Text('Hello Projected!'), Label.Type.Static);
                    projectedLabel.position = [0.0, 0.0, this._pos * 0.01];
                    projectedLabel.color.fromHex('005500');

                    if (this._fontFace) {
                        newLabel.fontFace = this._fontFace;
                        projectedLabel.fontFace = this._fontFace;
                    }
                    if (this._labelPass.labels.length <= 30) {
                        const asdf = this._labelPass.labels;
                        asdf.push(newLabel);
                        asdf.push(projectedLabel);
                        this._labelPass.labels = asdf;
                    }
                }

                this.invalidate();
            }, 33);


            // this._labelPass.labels = [labelOrder1, label2D, label0, label1, labelOrder2, label2, label3, label4,
            //     labelOrder3, projectedLabel];

            this._labelPass.labels = [label0, label1, label2, label3, label4];
        }
    }
}

export = debug;
