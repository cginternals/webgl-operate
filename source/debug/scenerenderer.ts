
import { mat4, vec3 } from 'gl-matrix';

import { AccumulatePass } from '../accumulatepass';
import { AntiAliasingKernel } from '../antialiasingkernel';
import { BlitPass } from '../blitpass';
import { Camera } from '../camera';
import { Context } from '../context';
import { DefaultFramebuffer } from '../defaultframebuffer';
import { Framebuffer } from '../framebuffer';
import { Geometry } from '../geometry';
import { MouseEventProvider } from '../mouseeventprovider';
import { Navigation } from '../navigation';
import { Program } from '../program';
import { Renderbuffer } from '../renderbuffer';
import { Invalidate, Renderer } from '../renderer';
import { Shader } from '../shader';
import { Texture2D } from '../texture2d';

import { Box } from '../core/box';
import { Sphere } from '../core/sphere';

import { ForwardSceneRenderPass } from '../scene/forwardscenerenderpass';
import { SceneNode } from '../scene/scenenode';


namespace debug {

    /**
     * @todo comment
     */
    export class SceneRenderer extends Renderer {

        protected _navigation: Navigation;
        protected _ndcOffsetKernel: AntiAliasingKernel;

        protected _accumulate: AccumulatePass;
        protected _blit: BlitPass;

        protected _defaultFBO: DefaultFramebuffer;
        protected _colorRenderTexture: Texture2D;
        protected _depthRenderbuffer: Renderbuffer;
        protected _intermediateFBO: Framebuffer;

        protected _forwardPass: ForwardSceneRenderPass;

        protected _camera: Camera;

        protected _scene: SceneNode;

        // Will be removed ...
        protected _useSphere = true;
        protected _meshSize = 1.0;
        protected _textured = true;

        protected _meshNode: SceneNode;
        protected _mesh: Geometry;
        protected _meshProgram: Program;
        protected _uViewProjection: WebGLUniformLocation;
        protected _uModel: WebGLUniformLocation;
        protected _uTexture: WebGLUniformLocation;
        protected _uTextured: WebGLUniformLocation;
        protected _aMeshVertex: GLuint;
        protected _aMeshTexCoord: GLuint;
        protected _texture: Texture2D;


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

            /* Create and configure camera. */

            this._camera = new Camera();
            this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
            this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._camera.eye = vec3.fromValues(0.0, 0.0, 2.0);
            this._camera.near = 0.1;
            this._camera.far = 8.0;

            /* Create and configure navigation */

            this._navigation = new Navigation(callback, mouseEventProvider);
            this._navigation.camera = this._camera;

            /* Create and configure forward pass. */

            this._forwardPass = new ForwardSceneRenderPass(context);
            this._forwardPass.initialize();

            this._forwardPass.camera = this._camera;
            this._forwardPass.target = this._intermediateFBO;

            /* Create scene. */

            this.generateScene();
            this._forwardPass.scene = this._scene;

            /* Will be removed ... */

            /* Create mesh rendering program. */
            const vert = new Shader(this._context, gl.VERTEX_SHADER, 'mesh.vert');
            vert.initialize(require('./mesh.vert'));
            const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'mesh.frag');
            frag.initialize(require('./mesh.frag'));
            this._meshProgram = new Program(this._context, 'MeshProgram');
            this._meshProgram.initialize([vert, frag]);
            this._uViewProjection = this._meshProgram.uniform('u_viewProjection');
            this._uModel = this._meshProgram.uniform('u_model');
            this._uTexture = this._meshProgram.uniform('u_texture');
            this._uTextured = this._meshProgram.uniform('u_textured');
            this._aMeshVertex = this._meshProgram.attribute('a_vertex', 0);
            this._aMeshTexCoord = this._meshProgram.attribute('a_texcoord', 1);

            /* Create geometry. */
            if (this._useSphere) {
                this._mesh = new Sphere(
                    this._context,
                    'mesh',
                    this._meshSize,
                    this._textured);
            } else {
                this._mesh = new Box(
                    this._context,
                    'mesh',
                    this._meshSize,
                    this._meshSize,
                    this._meshSize,
                    this._textured);
            }
            this._mesh.initialize(this._aMeshVertex, this._aMeshTexCoord);

            /* Create and load texture. */
            this._texture = new Texture2D(this._context, 'Texture');
            this._texture.initialize(128, 128, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
            this._texture.fetch('data/logo.png', false).then(() => {
                this.invalidate(true);
            });

            return true;
        }

        /**
         * Uninitializes Buffers, Textures, and Program.
         */
        protected onUninitialize(): void {
            super.uninitialize();

            this._mesh.uninitialize();
            this._meshProgram.uninitialize();

            this._intermediateFBO.uninitialize();
            this._defaultFBO.uninitialize();
            this._colorRenderTexture.uninitialize();
            this._depthRenderbuffer.uninitialize();

            this._blit.uninitialize();
            this._accumulate.uninitialize();
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
            this._forwardPass.update();

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

            } else if (this._altered.frameSize) {
                this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
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

            this._forwardPass.prepare();

            this._altered.reset();
            this._camera.altered = false;
        }

        /**
         * @todo comment
         * @param frameNumber - for intermediate frames in accumulation rendering.
         */
        protected onFrame(frameNumber: number): void {
            const gl = this._context.gl;

            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

            const ndcOffset = this._ndcOffsetKernel.get(frameNumber) as [number, number];
            ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
            ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];

            this._forwardPass.ndcOffset = ndcOffset;
            this._forwardPass.frame();

            // Will be removed ...
            this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
            gl.enable(gl.DEPTH_TEST);

            this._mesh.bind();
            this._meshProgram.bind();

            gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
            gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._meshNode.transform);

            this._texture.bind(gl.TEXTURE0);
            gl.uniform1i(this._uTexture, 0);
            gl.uniform1i(this._uTextured, this._textured);

            this._mesh.draw();

            this._meshProgram.unbind();
            this._mesh.unbind();

            gl.cullFace(gl.BACK);
            gl.disable(gl.CULL_FACE);

            // Accumulate
            this._accumulate.frame(frameNumber);
        }

        /**
         * @todo comment ...
         */
        protected onSwap(): void {
            this._blit.framebuffer = this._accumulate.framebuffer ?
                this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
            this._blit.frame();
        }


        /**
         *  @todo comment
         */
        protected generateScene(): void {

            /* Create scene */
            this._scene = new SceneNode('root');

            /* Create node with a mesh */
            this._meshNode = this._scene.addNode(new SceneNode('mesh'));
            const translate = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0));
            const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.4, 0.4, 0.4));
            const transform = mat4.multiply(mat4.create(), translate, scale);
            this._meshNode.transform = transform;
        }

    }
}

export = debug;
