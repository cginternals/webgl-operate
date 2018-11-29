
/* spellchecker: disable */

import { assert, log, LogLevel } from '../auxiliaries';

import { vec3 } from 'gl-matrix';

import { Camera } from '../camera';
import { Context } from '../context';
import { DefaultFramebuffer } from '../defaultframebuffer';
import { Invalidate, Renderer } from '../renderer';

import { FontFace } from '../text/fontface';
import { Label } from '../text/label';
import { LabelRenderPass } from '../text/labelrenderpass';
import { Position2DLabel } from '../text/position2dlabel';
import { Text } from '../text/text';

/* spellchecker: enable */


namespace debug {

    /**
     * This is an example renderer for labels. It uses a LabelRenderPass.
     */
    export class LabelTestRenderer extends Renderer {

        protected _extensions = false;

        protected _labelPass: LabelRenderPass;

        protected _camera: Camera;

        protected _defaultFBO: DefaultFramebuffer;


        protected _fontFace: FontFace | undefined;

        /**
         * Initializes and sets up rendering passes, navigation, loads a font face and links shaders with program.
         * @param context - valid context to create the object for.
         * @param identifier - meaningful name for identification of this instance.
         * @param mouseEventProvider - required for mouse interaction
         * @returns - whether initialization was successful
         */
        protected onInitialize(context: Context, callback: Invalidate,
        /* mouseEventProvider: MouseEventProvider, */
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

            /* Create and configure test navigation. */

            this._camera = new Camera();
            this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
            this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._camera.eye = vec3.fromValues(0.0, 0.0, 2.0);
            this._camera.near = 0.1;
            this._camera.far = 8.0;

            /* Create and configure label pass. */

            this._labelPass = new LabelRenderPass(context);
            this._labelPass.initialize();
            this._labelPass.camera = this._camera;
            this._labelPass.target = this._defaultFBO;
            this._labelPass.depthMask = true;

            FontFace.fromFile('./data/opensans128-hiero.fnt', context)
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

            this._defaultFBO.uninitialize();
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

            if (this._altered.canvasSize) {
                this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
            }

            if (this._altered.clearColor) {
                this._defaultFBO.clearColor(this._clearColor);
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

            this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
            this._labelPass.frame();
        }

        /**
         * After (1) update, (2) preparation, and (3) frame are invoked, a swap is invoked for multi-frame rendering.
         */
        protected onSwap(): void {
        }

        /**
         * Sets up an example scene with 2D and 3D labels and sets the corresponding data on LabelGeometries. The
         * FontFace is set on each label by the LabelRenderPass.
         */
        protected setupScene(): void {

            /** Wrapped labels, showcasing Ellipsis and NewLine */

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

            const label = new Position2DLabel(new Text(`ABVAg'^|`), Label.Type.Dynamic);
            label.fontSize = 128;
            label.fontSizeUnit = Label.Unit.Pixel;
            label.alignment = Label.Alignment.Left;
            label.lineAnchor = Label.LineAnchor.Baseline;
            label.position = [-555.0, +0.0];

            this._labelPass.labels = [label];
        }
    }
}

export = debug;
