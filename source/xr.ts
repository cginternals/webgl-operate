/// WebXR playground - to be refactored into a reasonable file structure later

import { assert, log, LogLevel } from './auxiliaries';

export function supportsXR(): boolean {
    return navigator.xr !== undefined;
}

/**
 * Request an XRDevice and check if the given session creation options are supported.
 * Returns `undefined` if no devices are found or the session creation options are not supported.
 */
export async function initXR(options?: XRSessionCreationOptions): Promise<XRDevice | undefined> {
    assert(supportsXR(), 'WebXR not supported by browser');
    let device;
    try {
        device = await navigator.xr.requestDevice();
    } catch (e) {
        log(LogLevel.ModuleDev, `Failed to request XR device: ${e}`);
        return;
    }
    try {
        if (await device.supportsSession(options)) {
            return device;
        }
    } catch (e) { // === null
        log(LogLevel.ModuleDev, `XR session with options ${options} not supported`);
    }
}

/**
 * Request an XR session and ...(TODO).
 * May fail with:
 * - NotSupportedError if the options are not supported
 * - InvalidStateError if options.immersive is true and the device already has an immersive session
 * - SecurityError if options.immersive is true and the algorithm is not triggered by user activation
 */
export async function requestSession(device: XRDevice, options?: XRSessionCreationOptions): Promise<XRSession> {
    const session = await device.requestSession(options);

    // TODO!!: create WebGL context, XRWebGLLayer, requestFrameOfReference

    return session;
}
