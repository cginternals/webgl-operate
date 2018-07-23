// tslint:disable:member-ordering
// tslint:disable:max-classes-per-file

// TODO!: publish interfaces derived from spec on npm (@types)?

/// All types are derived from the WebXR WebIDL:
/// https://immersive-web.github.io/webxr/#idl-index
/// Last sync with the spec: 2018-07-21

export type EventHandler = (ev: Event) => void;

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xr)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xr)
 */
export interface XR extends EventTarget {
    requestDevice(): Promise<XRDevice>;
    ondevicechange: EventHandler;
}

declare global {
    export interface Navigator {
        readonly xr: XR;
    }
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrdevice)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrdevice)
 */
export interface XRDevice {
    supportsSession(options?: XRSessionCreationOptions): Promise<void>;
    requestSession(options?: XRSessionCreationOptions): Promise<XRSession>;
}

/** [Specification](tps://immersive-web.github.io/webxr/#dictdef-xrsessioncreationoptions) */
export interface XRSessionCreationOptions {
    /** Defaults to false. */
    immersive?: boolean;
    outputContext?: XRPresentationContext;
}

/** [Specification](tps://immersive-web.github.io/webxr/#enumdef-xrenvironmentblendmode) */
export type XREnvironmentBlendMode = 'opaque' | 'additive' | 'alpha-blend';

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrsession)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrsession-interface)
 */
export interface XRSession extends EventTarget {
    // Attributes
    readonly device: XRDevice;
    readonly immersive: boolean;
    readonly outputContext: XRPresentationContext;
    readonly environmentBlendMode: XREnvironmentBlendMode;

    depthNear: number;
    depthFar: number;
    baseLayer: XRWebGLLayer;

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

/**
 * [Specification](https://immersive-web.github.io/webxr/#animation-frames)
 */
export type XRFrameRequestCallback = (time: number, frame: XRFrame) => void;

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrframe)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrpresentationframe-interface)
 */
export interface XRFrame {
    readonly session: XRSession;
    readonly views: Array<XRView>;

    getDevicePose(coordinateSystem: XRCoordinateSystem): XRDevicePose | null;
    getInputPose(inputSource: XRInputSource, coordinateSystem: XRCoordinateSystem): XRInputPose | null;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrcoordinatesystem)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrcoordinatesystem-interface)
 */
export interface XRCoordinateSystem extends EventTarget {
    getTransformTo(other: XRCoordinateSystem): Float32Array | null;
}

/**
 * @see {@link XRFrameOfReference}
 */
export type XRFrameOfReferenceType = 'head-model' | 'eye-level' | 'stage';

/**
 * @see {@link XRFrameOfReference}
 */
export interface XRFrameOfReferenceOptions {
    /** Defaults to false */
    disableStageEmulation: boolean;
    /** Defaults to 0.0 */
    stageEmulationHeight: number;
}

/**
 * [Reference](https://immersive-web.github.io/webxr/#xrframeofreference-interface)
 *
 * [Specification](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrframeofreference)
 */
export interface XRFrameOfReference extends XRCoordinateSystem {
    readonly bounds: XRStageBounds | null;
    readonly emulatedHeight: number;

    onboundschange: (ev: XRCoordinateSystemEvent) => void;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrstagebounds)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrstagebounds-interface)
 */
export interface XRStageBounds {
    readonly geometry: Array<XRStageBoundsPoint>;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrstageboundspoint)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrstagebounds-interface)
 */
export interface XRStageBoundsPoint {
    readonly x: number;
    readonly z: number;
}

/**
 * @see {@link XRView}
 */
export type XREye = 'left' | 'right';

/**
 * [Reference](https://immersive-web.github.io/webxr/#xrview-interface)
 *
 * [Specification](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrview)
 */
export interface XRView {
    readonly eye: XREye;
    readonly projectionMatrix: Float32Array;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrviewport)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrviewport-interface)
 */
export interface XRViewport {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrdevicepose)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrdevicepose-interface)
 */
export interface XRDevicePose {
    readonly poseModelMatrix: Float32Array;
    getViewMatrix(view: XRView): Float32Array;
}

/**
 * @see {@link XRInputSource}
 */
export type XRHandedness = '' | 'left' | 'right';

/**
 * @see {@link XRInputSource}
 */
export type XRTargetRayMode = 'gaze' | 'tracked-pointer' | 'screen';

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrinputsource)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrinputsource-interface)
 */
export interface XRInputSource {
    readonly handedness: XRHandedness;
    readonly targetRayMode: XRTargetRayMode;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrinputpose.html)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrinputpose-interface)
 */
export interface XRInputPose {
    readonly emulatedPosition: boolean;
    readonly targetRayMatrix: Float32Array;
    readonly gripMatrix: Float32Array | null;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrlayer)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrlayer-interface)
 */
export interface XRLayer { } // tslint:disable-line:no-empty-interface

/**
 * @see {@link XRWebGLLayer}
 */
export type XRWebGLRenderingContext = WebGLRenderingContext | WebGL2RenderingContext;

/**
 * @see {@link XRWebGLLayer}
 */
export interface XRWebGLLayerInit {
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

/**
 * [Reference](https://immersive-web.github.io/webxr/#xrwebgllayer-interface)
 *
 * [Specification](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrwebgllayer)
 */
export interface XRWebGLLayer extends XRLayer {
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
}

/**
 * @see {@link XRWebGLLayer}
 */
export interface XRWebGLLayerConstructor {
    new(session: XRSession, context: XRWebGLRenderingContext, layerInit?: XRWebGLLayerInit): XRWebGLLayer;
    getNativeFramebufferScaleFactor(session: XRSession): number;
}

declare global {
    /**
     * @see {@link WebGLRenderingContextBase}
     */
    export interface WebGLContextAttributes {
        /** Default: null */
        compatibleXRDevice?: XRDevice | null;
    }

    // tslint:disable-next-line:variable-name
    var XRWebGLLayer: XRWebGLLayerConstructor;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/partial_webglcontextattributes)
 *
 * [Specification](https://immersive-web.github.io/webxr/#contextcompatibility)
 */
export interface WebGLRenderingContextBase {
    setCompatibleXRDevice(device: XRDevice): Promise<void>;
}

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xr)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrpresentationcontext-interface)
 */
export interface XRPresentationContext {
    readonly canvas: HTMLCanvasElement;
}

// NOTE: ignoring constructors for events

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrsessionevent)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrsessionevent-interface)
 */
export interface XRSessionEvent extends Event {
    readonly frame: XRFrame;
    readonly inputSource: XRInputSource;
}

/**
 * Helper type - the spec only uses the generic `EventHandler` type.
 */
export type XRSessionEventHandler = (ev: XRSessionEvent) => void;

/**
 * [Specification](https://immersive-web.github.io/webxr/#xrinputsourceevent-interface)
 */
export interface XRInputSourceEvent extends Event {
    readonly frame: XRFrame;
    readonly inputSource: XRInputSource;
}

/**
 * Helper type - the spec only uses the generic `EventHandler` type.
 */
export type XRInputSourceEventHandler = (ev: XRInputSourceEvent) => void;

/**
 * [Reference](https://immersive-web.github.io/webxr-reference/webxr-device-api/xrcoordinatesystemevent)
 *
 * [Specification](https://immersive-web.github.io/webxr/#xrcoordinatesystemevent-interface)
 */
export interface XRCoordinateSystemEvent extends Event {
    readonly coordinateSystem: XRCoordinateSystem;
}
