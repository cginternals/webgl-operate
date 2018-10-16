
import { assert } from '../auxiliaries';

import { vec3 } from 'gl-matrix';

import { AccumulatePass } from '../accumulatepass';
import { AntiAliasingKernel } from '../antialiasingkernel';
import { BlitPass } from '../blitpass';
import { Camera } from '../camera';
import { Context } from '../context';
import { DefaultFramebuffer } from '../defaultframebuffer';
import { FontFace } from '../fontface';
import { Framebuffer } from '../framebuffer';
import { LabelRenderPass } from '../labelrenderpass';
import { MouseEventProvider } from '../mouseeventprovider';
import { Navigation } from '../navigation';
import { Position2DLabel } from '../position2dlabel';
import { Position3DLabel } from '../position3dlabel';
import { Program } from '../program';
import { Renderbuffer } from '../renderbuffer';
import { Invalidate, Renderer } from '../renderer';
import { Shader } from '../shader';
import { Text } from '../text';
import { Texture2D } from '../texture2d';

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

            const vert = new Shader(this._context, gl.VERTEX_SHADER, 'glyphquad.vert');
            vert.initialize(require('../shaders/glyphquad.vert'));

            const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'glyphquad.frag');
            frag.initialize(require('../shaders/glyphquad.frag'));

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

            this.setupScene();

            return true;
        }

        /**
         * Uninitializes Buffers, Textures and and Programm.
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
         * Sets up an example scene with 2D and 3D labels and sets the corresponding data on LabelGeometries.
         */
        protected setupScene(): void {

            /** OpenLL 3D Labels */

            const placeholderFontFace = new FontFace(this._context, `FontfacePlaceholder`);

            const pos3Dlabel = new Position3DLabel(new Text('Hello Position 3D!'), placeholderFontFace);
            pos3Dlabel.fontSize = 0.1;

            /* position values in world, since fontSizeUnit is set to SpaceUnit.World */
            pos3Dlabel.setPosition(0.0, 0.1, -0.5);
            pos3Dlabel.setDirection(0.0, 1.0, 0.0);
            pos3Dlabel.setUp(-1.0, 0.0, 0.0);

            const shadowPos3Dlabel = new Position3DLabel(new Text('Hello Position Shadow'), placeholderFontFace);
            shadowPos3Dlabel.setPosition(0.0, 0.1, -0.5);
            shadowPos3Dlabel.fontSize = 0.1;
            shadowPos3Dlabel.setDirection(0.0, 1.0, 0.0);
            shadowPos3Dlabel.setUp(0.0, 0.0, -1.0);

            const anotherPos3Dlabel = new Position3DLabel(new Text('Yet another 3D Label'), placeholderFontFace);
            anotherPos3Dlabel.setPosition(0.2, -0.1, 0.0);
            anotherPos3Dlabel.setDirection(-1.0, 0.0, 0.0);
            anotherPos3Dlabel.setUp(0.0, -1.0, 0.0);

            this._labelPass.renderThese3DLabels([pos3Dlabel, shadowPos3Dlabel, anotherPos3Dlabel]);


            /** OpenLL 2D Labels */

            const pos2Dlabel = new Position2DLabel(new Text('Hello Position 2D!'), placeholderFontFace);
            pos2Dlabel.fontSize = 40;

            /* position values in px, since fontSizeUnit is set to SpaceUnit.Px */
            pos2Dlabel.setPosition(-100, 0);
            pos2Dlabel.setDirection(0.5, -0.5);

            this._labelPass.renderThese2DLabels([pos2Dlabel]);
        }
    }
}

export = debug;
