import { assert } from './auxiliaries';
import { Canvas } from './canvas';
import { Controllable } from './controller';
import { FrameData } from './framedata';
import {
    XRDevice,
    XRFrame,
    XRFrameOfReference, XRFrameOfReferenceOptions, XRFrameOfReferenceType,
    XRInputPose,
    XRSession, XRSessionCreationOptions,
    XRWebGLLayerInit,
} from './webxr';
import { XRRenderer } from './xrrenderer';

// tslint:disable-next:member-ordering
/**
 * Controller for WebXR sessions. Basic workflow:
 *
 * ```ts
 * let xrc = new XRController({ immersive: true });
 * await xrc.requestDevice(); // may throw `NotFoundError`
 * if (await xrc.supportsSession()) { // optional check
 *   await xrc.requestSession(); // may throw
 *   // assign any subclass of `Renderer` that uses the `renderViews` parameter in `onFrame`
 *   xrc.canvas!.renderer = new WebXRRenderer();
 *
 *   xrc.session!.addEventListener('end', () => { ... });
 *   ...
 *   xrc.endSession();
 * }
 *
 * ```
 * @experimental
 */
export class XRController {
    private onXRFrameCallback = this.onXRFrame.bind(this);
    private frameData: FrameData = new FrameData();

    // Configuration options for setting up and XR session.

    sessionCreationOptions: XRSessionCreationOptions;
    /**
     * Attributes for WebGL context creation. `compatibleXRDevice` will be set
     * automatically after requesting a device.
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

    renderer: XRRenderer;

    inputPoses: Array<XRInputPose | null> = [];

    /** Checks whether WebXR is supported by the browser. */
    static supportsXR(): boolean {
        return navigator.xr !== undefined;
    }

    /**
     * Hints:
     * To mirror the content of an immersive session to a canvas on the page:
     *
     * ```ts
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
     * Requests a device (e.g. a HMD) and stores it in `this.device`.
     * @throws {NotFoundError} - No devices found.
     * @throws {EvalError} - WebXR is not supported (use the static `supportsXR` function to check before)
     * @returns - a promise that resolves if a device is available.
     */
    async requestDevice(): Promise<void> {
        assert(XRController.supportsXR(), 'WebXR not supported by browser');
        this.device = await navigator.xr.requestDevice();
        this.contextAttributes.compatibleXRDevice = this.device;
    }

    /**
     * Checks whether device supports a session with `this.sessionCreationOptions`.
     * Must call `requestDevice` before.
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
     * - `NotSupportedError` if the options are not supported
     * - `InvalidStateError` if options.immersive is true and the device already has an immersive session
     * - `SecurityError` if options.immersive is true and the algorithm is not triggered by user activation
     */
    async requestSession(): Promise<void> {
        // TODO!: fix example first...
        // assert(!this.session, 'a session is already in progress');
        this.session = await this.device!.requestSession(this.sessionCreationOptions);

        const canvasEl = document.createElement('canvas');
        // TODO!!: check what happens to old canvas when switching from magic window to immersive
        this.canvas = new Canvas(canvasEl, this.contextAttributes, this);
        this.gl = this.canvas.context.gl;

        this.session.baseLayer = new XRWebGLLayer(this.session, this.gl, this.webGLLayerInit);
        this.frameOfRef = await this.session.requestFrameOfReference(this.frameOfRefType, this.frameOfRefOptions);
        this.frameData.frameOfReference = this.frameOfRef;

        this.session.requestAnimationFrame(this.onXRFrameCallback);

        this.session.addEventListener('end', () => this.onEndSession());
    }

    async endSession(): Promise<void> {
        await this.session!.end();
    }

    onEndSession(): void {
        this.session = undefined;
        this.canvas = undefined;
        this.gl = undefined;
        this.frameOfRef = undefined;
        this.frameData = new FrameData();
    }

    onXRFrame(time: number, frame: XRFrame): void {
        if (!this.session) { return; } // TODO!: cancelAnimationFrame in onEndSession instead?
        const session = frame.session;
        session.requestAnimationFrame(this.onXRFrameCallback);
        const gl = this.gl;

        this.frameData.time = time;
        this.frameData.frame = frame;

        gl.bindFramebuffer(gl.FRAMEBUFFER, session.baseLayer.framebuffer);
        this.renderer.xrframe(this.frameData);
    }

    set controllable(c: Controllable) {
        assert(c instanceof XRRenderer, 'Controllable must be an `XRRenderer`');
        this.renderer = c as XRRenderer;
    }

    // NOTE: the block/unblock/update methods don't make much sense for WebXR,
    // but they need to be present and 'work' (otherwise some assertions fail).
    // They are ignored in the render loop however.

    // tslint:disable-next-line:member-ordering
    _block = false;
    block(): void {
        this._block = true;
    }
    get blocked(): boolean {
        return this._block;
    }
    unblock(): void {
        this._block = false;
    }

    update(force: boolean = false): void {
    }
}
