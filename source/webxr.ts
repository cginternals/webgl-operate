/// WebXR playground - to be refactored into a reasonable file structure later

import { assert } from './auxiliaries';

// TODO!: publish interfaces derived from spec on npm?

// tslint:disable:member-ordering


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

declare global {
    interface Navigator {
        readonly xr: XR;
    }
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
    onblur: EventHandler;
    onfocus: EventHandler;
    onresetpose: EventHandler;
    onend: EventHandler;
    onselect: EventHandler;
    onselectstart: EventHandler;
    onselectend: EventHandler;
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

    onboundschange: EventHandler;
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

// TODO!!!: continue here

// TODO!!: tmp
type XRDevicePose = any;
type XRInputPose = any;

interface XRPresentationContext {
    // TODO
}

interface XRLayer {
    // TODO
}

interface XRFrameOfReferenceOptions {
    // TODO
}

interface XRFrameOfReference {
    // TODO
}

interface XRInputSource {
    // TODO
}

///

export function supportsXR(): boolean {
    return navigator.xr !== undefined;
}

export async function initXR() {
    assert(supportsXR(), 'WebXR not supported by browser');
    let device = await navigator.xr.requestDevice();
}
