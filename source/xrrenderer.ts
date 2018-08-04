import { FrameData } from './framedata';
import { Renderer } from './renderer';

/**
 * Specialization of `Renderer` to support WebXR.
 * It adds default empty implementation for the abstract `Renderer` methods not relevant
 * for WebXR (`onPrepare`, `onUpdate`, `onFrame`, `onSwap`) and adds a new abstract method (`onXRFrame`)
 * that receives all XR specific input data.
 */
export abstract class XRRenderer extends Renderer {
    /**
     * NOT called when using WebXR (a new frame is always invoked because the view parameters generally change always)
     * Override when the renderer can also be used without WebXR.
     * @returns - Whether to redraw
     */
    protected onUpdate(): boolean {
        return false;
    }

    /**
     * NOT called when using WebXR (multi-frame rendering is not supported)
     * Override when the renderer can also be used without WebXR.
     */
    protected onPrepare(): void { }

    /**
     * NOT called when using WebXR (see `onXRFrame` below)
     */
    protected onFrame(frameNumber: number): void { }

    /**
     * Actual frame call specified by inheritor for WebXR.
     * This should be used for actual rendering implementation.
     *
     * If the renderer should be work with and without WebXR, implement both `onFrame` and `onXRFrame`
     * and handle the different sources for view parameters there.
     * (`FrameData` for WebXR and (generally) `Camera` for non-WebXR) .
     */
    protected abstract onXRFrame(frameData: FrameData): void;

    /**
     * NOT called when using WebXR.
     * Override when the renderer can also be used without WebXR.
     */
    protected onSwap(): void { }

    xrframe(frameData: FrameData): any {
        this.onXRFrame(frameData);
    }
}
