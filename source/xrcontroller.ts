/// WebXR playground - to be refactored into a reasonable file structure later

import { mat4, vec3 } from 'gl-matrix';
import { assert } from './auxiliaries';
import { Canvas } from './canvas';
import { Controllable } from './controller';
import { Renderer } from './renderer';
import {
    XRDevice,
    XRFrame,
    XRFrameOfReference, XRFrameOfReferenceOptions, XRFrameOfReferenceType,
    XRSession, XRSessionCreationOptions,
    XRViewport,
    XRWebGLLayer, XRWebGLLayerInit,
} from './webxr';

export function supportsXR(): boolean {
    return navigator.xr !== undefined;
}

/**
 * Helper class to hold render configuration per XRView,
 * i.e. per eye for standard VR/AR.
 * NOTE: Optimized to avoid allocations during render loop.
 */
export class RenderView {
    private _cameraPosition = vec3.create();
    private _cameraPositionValid = false; // use extra flag to avoid allocation new vec3's
    private _inverseViewMatrix: Float32Array;

    // TODO!: Float32Array vs mat4
    private _projectionMatrix: Float32Array;
    get projectionMatrix() {
        return this._projectionMatrix;
    }
    private _viewMatrix: Float32Array;
    get viewMatrix() {
        return this._viewMatrix;
    }
    private _viewProjectionMatrix: Float32Array;
    private _viewProjectionMatrixValid = false; // use extra flag to avoid allocation new mat4's

    private _viewport: XRViewport;
    get viewport() {
        return this._viewport;
    }

    set(projectionMatrix: Float32Array, viewMatrix: Float32Array, viewport: XRViewport) {
        this._projectionMatrix = projectionMatrix;
        this._viewMatrix = viewMatrix;
        this._viewport = viewport;

        this._cameraPositionValid = false;
        this._viewProjectionMatrixValid = false;
    }

    /**
     * Computes camera position from viewMatrix and caches it.
     */
    get cameraPosition(): vec3 {
        if (this._cameraPositionValid) {
            return this._cameraPosition;
        }
        if (!this._inverseViewMatrix) {
            this._inverseViewMatrix = mat4.create();
        }

        mat4.invert(this._inverseViewMatrix as mat4, this.viewMatrix as mat4);
        vec3.transformMat4(this._cameraPosition, this._cameraPosition, this._inverseViewMatrix as mat4);

        this._cameraPositionValid = true;
        return this._cameraPosition;
    }

    /** Computes viewProjection matrix and caches it */
    get viewProjectionMatrix(): Float32Array {
        if (this._viewProjectionMatrixValid) {
            return this._viewProjectionMatrix as mat4;
        }
        if (!this._viewProjectionMatrix) {
            this._viewProjectionMatrix = mat4.create();
        }
        mat4.multiply(this._viewProjectionMatrix as mat4, this.projectionMatrix as mat4, this.viewMatrix as mat4);
        return this._viewProjectionMatrix;
    }
}

// tslint:disable-next:member-ordering
// tslint:disable-next-line:max-classes-per-file
export class XRController {
    private onXRFrameCallback = this.onXRFrame.bind(this);
    private renderViews: RenderView[] = [new RenderView()];

    // Configuration options for setting up and XR session.

    sessionCreationOptions: XRSessionCreationOptions;
    /**
     * Attributes for WebGL context creation. `compatibleXRDevice` will be set
     * automatically after session creation.
     */
    contextAttributes: WebGLContextAttributes = {};
    webGLLayerInit?: XRWebGLLayerInit;
    frameOfRefType: XRFrameOfReferenceType = 'eye-level';
    frameOfRefOptions?: XRFrameOfReferenceOptions;

    device: XRDevice | undefined;
    session: XRSession | undefined;
    canvas: Canvas | undefined;
    gl: any;
    frameOfRef: XRFrameOfReference | undefined;

    renderer: Renderer;

    /**
     * Hints:
     * To mirror the content of an immersive session to a canvas on the page:
     *
     * ```
     * let mirrorCanvas = document.createElement('canvas');
     * document.body.appendChild(mirrorCanvas);
     * let ctx = mirrorCanvas.getContext('xrpresent');
     * let xrc = new XRController({
     *     immersive: true,
     *     outputContext: ctx;
     * })
     * ```
     * To create a 'magic window', do the same, but with `immersive` set to `false`.
     */
    constructor(sessionOpts?: XRSessionCreationOptions) {
        this.sessionCreationOptions = sessionOpts || {};
    }

    /**
     * Initializes `this.device` and checks if it supports sessions with the configured creation options.
     * @throws {NotFoundError} - No devices found.
     * @returns - whether initialization was successful
     */
    async initialize(): Promise<void> {
        assert(supportsXR(), 'WebXR not supported by browser');
        this.device = await navigator.xr.requestDevice();
        this.contextAttributes.compatibleXRDevice = this.device;
    }

    /**
     * Checks whether device supports a session with `this.sessionCreationOptions`.
     * Must call `initialize` before.
     */
    async supportsSession(): Promise<boolean> {
        assert(this.device !== undefined, 'this.device not initialized');
        try {
            await this.device!.supportsSession(this.sessionCreationOptions);
            return true;
        } catch (e) { // === null
            return false;
        }
    }

    /**
     * Request an XR session (`this.session`) using `this.sessionCreationOptions`
     * and initialize WebGL context and `frameOfRef`.
     * May fail with:
     * - NotSupportedError if the options are not supported
     * - InvalidStateError if options.immersive is true and the device already has an immersive session
     * - SecurityError if options.immersive is true and the algorithm is not triggered by user activation
     */
    async requestSession(): Promise<void> {
        this.session = await this.device!.requestSession(this.sessionCreationOptions);

        const canvasEl = document.createElement('canvas');
        // TODO!: external canvas?
        // TODO!!: check what happens to old canvas when switching from magic window to immersive
        this.canvas = new Canvas(canvasEl, this.contextAttributes, this);
        this.gl = this.canvas.context.gl;

        this.session.baseLayer = new XRWebGLLayer(this.session, this.gl, this.webGLLayerInit);
        this.frameOfRef = await this.session.requestFrameOfReference(this.frameOfRefType, this.frameOfRefOptions);

        this.session.requestAnimationFrame(this.onXRFrameCallback);

        this.session.addEventListener('end', () => this.onEndSession());
    }

    async endSession(): Promise<void> {
        await this.session!.end();
    }

    onEndSession() {
        this.session = undefined;
        this.canvas = undefined;
        this.gl = undefined;
        this.frameOfRef = undefined;
    }

    onXRFrame(time: number, frame: XRFrame) {
        this.session!.requestAnimationFrame(this.onXRFrameCallback);
        const gl = this.gl;

        const pose = frame.getDevicePose(this.frameOfRef!);
        // Getting the pose may fail if, for example, tracking is lost.
        if (pose) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.session!.baseLayer.framebuffer);

            for (let i = 0; i < frame.views.length; ++i) {
                const view = frame.views[i];
                if (!this.renderViews[i]) {
                    this.renderViews[i] = new RenderView();
                }
                this.renderViews[i].set(
                    view.projectionMatrix,
                    pose.getViewMatrix(view),
                    this.session!.baseLayer.getViewport(view)!,
                );
            }

            this.renderer.frame(0, this.renderViews);
        } else {
            // TODO!: how to handle?
        }
    }

    // TODO!!: stub other controller methods/properties
    // tslint:disable-next-line:member-ordering
    _block = false;
    block() {
        this._block = true;
    }
    get blocked() {
        // TODO!?
        return this._block;
    }
    unblock() {
        // TODO!?
        this._block = false;
    }
    set controllable(c: Controllable) {
        this.renderer = c as Renderer;
    }
    update(force: boolean = false): void {
        // TODO:!?
    }
}
