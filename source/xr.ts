/// WebXR playground - to be refactored into a reasonable file structure later

import { assert } from './auxiliaries';

export function supportsXR(): boolean {
    return navigator.xr !== undefined;
}

export async function initXR() {
    assert(supportsXR(), 'WebXR not supported by browser');
    let device = await navigator.xr.requestDevice();
}
