// tslint:disable:member-ordering
// tslint:disable:max-classes-per-file

// TODO!: rename to .d.ts when done (-> error checking doesn't work properly with it)
// TODO!: publish interfaces derived from spec on npm?

/// https://immersive-web.github.io/webxr/#idl-index

type EventHandler = (ev: Event) => void;

/**
 * https://immersive-web.github.io/webxr-reference/webxr-device-api/xr
 * https://immersive-web.github.io/webxr/#xr
 */
interface XR extends EventTarget {
    requestDevice(): Promise<XRDevice>;
    ondevicechange: EventHandler;
}

interface Navigator {
    readonly xr: XR;
}

/**
 * https://immersive-web.github.io/webxr-reference/webxr-device-api/xrdevice
 * https://immersive-web.github.io/webxr/#xrdevice
 */
interface XRDevice {
    supportsSession(options?: XRSessionCreationOptions): Promise<void>;
    requestSession(options?: XRSessionCreationOptions): Promise<XRSession>;
}

/** https://immersive-web.github.io/webxr/#dictdef-xrsessioncreationoptions */
interface XRSessionCreationOptions {
    /** Defaults to false. */
    immersive?: boolean;
    outputContext?: XRPresentationContext;
}

/**
 * https://immersive-web.github.io/webxr-reference/webxr-device-api/xrsession
 * https://immersive-web.github.io/webxr/#xrsession-interface
 */
interface XRSession extends EventTarget {
    // Attributes
    readonly device: XRDevice;
    readonly immersive: boolean;
    readonly outputContext: XRPresentationContext;

    depthNear: number;
    depthFar: number;
    baseLayer: XRLayer;

    // Methods
    requestFrameOfReference(type: XRFrameOfReferenceType, options?: XRFrameOfReferenceOptions):
        Promise<XRFrameOfReference>;

    getInputSources(): Array<XRInputSource>;

    requestAnimationFrame(callback: XRFrameRequestCallback): number;
    cancelAnimationFrame(handle: number): void;

    end(): Promise<void>;

    // Events
    onblur: XRSessionEventHandler;
    onfocus: XRSessionEventHandler;
    onresetpose: XRSessionEventHandler;
    onend: XRSessionEventHandler;
    onselect: XRInputSourceEventHandler;
    onselectstart: XRInputSourceEventHandler;
    onselectend: XRInputSourceEventHandler;
}

type XRFrameRequestCallback = (time: number, frame: XRFrame) => void;

interface XRFrame {
    readonly session: XRSession;
    readonly views: Array<XRView>;

    getDevicePose(coordinateSystem: XRCoordinateSystem): XRDevicePose | null;
    getInputPose(inputSource: XRInputSource, coordinateSystem: XRCoordinateSystem): XRInputPose | null;
}

interface XRCoordinateSystem extends EventTarget {
    getTransformTo(other: XRCoordinateSystem): Float32Array | null;
}

enum XRFrameOfReferenceType {
    'head-model',
    'eye-level',
    'stage',
}

interface XRFrameOfReferenceOptions {
    /** Defaults to false */
    disableStageEmulation: boolean;
    /** Defaults to 0.0 */
    stageEmulationHeight: number;
}

interface XRFrameOfReference extends XRCoordinateSystem {
    readonly bounds: XRStageBounds | null;
    readonly emulatedHeight: number;

    onboundschange: (ev: XRCoordinateSystemEvent) => void;
}

interface XRStageBounds {
    readonly geometry: Array<XRStageBoundsPoint>;
}

interface XRStageBoundsPoint {
    readonly x: number;
    readonly z: number;
}

enum XREye {
    'left',
    'right',
}

interface XRView {
    readonly eye: XREye;
    readonly projectionMatrix: Float32Array;
}

interface XRViewport {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

interface XRDevicePose {
    readonly poseModelMatrix: Float32Array;
    getViewMatrix(view: XRView): Float32Array;
}

enum XRHandedness {
    '',
    'left',
    'right',
}

enum XRTargetRayMode {
    'gazing',
    'pointing',
    'tapping',
}

interface XRInputSource {
    readonly handedness: XRHandedness;
    readonly targetRayMode: XRTargetRayMode;
}

interface XRInputPose {
    readonly emulatedPosition: boolean;
    readonly targetRayMatrix: Float32Array;
    readonly gripMatrix: Float32Array | null;
}

// tslint:disable-next-line:no-empty-interface
interface XRLayer { }

declare type WebGL2RenderingContext = any;
type XRWebGLRenderingContext = WebGLRenderingContext | WebGL2RenderingContext;

interface XRWebGLLayerInit {
    /** Default: true */
    antialias: boolean;
    /** Default: false */
    depth: boolean;
    /** Default: false */
    stencil: boolean;
    /** Default: true */
    alpha: boolean;
    /** Default: false */
    multiview: boolean;
    /** Default: 1.0 */
    framebufferScaleFactor: number;
}

declare class XRWebGLLayer implements XRLayer {
    constructor(session: XRSession, context: XRWebGLRenderingContext, layerInit?: XRWebGLLayerInit);

    // Attributes
    readonly context: XRWebGLRenderingContext;

    readonly antialias: boolean;
    readonly depth: boolean;
    readonly stencil: boolean;
    readonly alpha: boolean;
    readonly multiview: boolean;

    readonly framebuffer: WebGLFramebuffer;
    readonly framebufferWidth: number;
    readonly framebufferHeight: number;

    // Methods
    getViewport(view: XRView): XRViewport | null;
    requestViewportScaling(viewportScaleFactor: number): void;

    // Static Methods
    static getNativeFramebufferScaleFactor(session: XRSession): number;
}

interface WebGLContextAttributes {
    /** Default: null */
    compatibleXRDevice: XRDevice | null;
}

interface WebGLRenderingContextBase {
    setCompatibleXRDevice(device: XRDevice): Promise<void>;
}

interface XRPresentationContext {
    readonly canvas: HTMLCanvasElement;
}

// NOTE: ignoring constructors for events

interface XRSessionEvent extends Event {
    readonly frame: XRFrame;
    readonly inputSource: XRInputSource;
}

type XRSessionEventHandler = (ev: XRSessionEvent) => void;


interface XRInputSourceEvent extends Event {
    readonly frame: XRFrame;
    readonly inputSource: XRInputSource;
}

type XRInputSourceEventHandler = (ev: XRInputSourceEvent) => void;

interface XRCoordinateSystemEvent extends Event {
    readonly coordinateSystem: XRCoordinateSystem;
}
