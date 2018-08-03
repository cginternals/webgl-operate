import { RenderView } from './renderview';
import { XRFrame, XRFrameOfReference, XRInputSource, XRInputPose } from './webxr';

/**
 */
export class FrameData {
    private _frame: XRFrame;
    get frame(): XRFrame { return this._frame; }
    set frame(frame: XRFrame) {
        this._frame = frame;
        // TODO!!: invalidate renderviews...?
    }

    private _frameOfReference: XRFrameOfReference;
    get frameOfReference(): XRFrameOfReference { return this._frameOfReference; }
    set frameOfReference(frame: XRFrameOfReference) {
    }

    private _renderViews: RenderView[] = [];
    get renderViews(): RenderView[] {
        const pose = this.frame.getDevicePose(this.frameOfReference);
        // Getting the pose may fail if, for example, tracking is lost.
        if (pose) {
            const views = this._frame.views;

            // Re-using the same array to avoid allocations per frame -> adjust length in case
            // number of views changes
            if (views.length !== this._renderViews.length) {
                this._renderViews.length = views.length;
            }
            for (let i = 0; i < views.length; ++i) {
                const view = views[i];
                if (!this._renderViews[i]) {
                    this._renderViews[i] = new RenderView();
                }
                this._renderViews[i].set(
                    view.projectionMatrix,
                    pose.getViewMatrix(view),
                    this.frame.session.baseLayer.getViewport(view)!,
                );
            }
        } // else: return last frame's data (assumption: instance is reused)

        return this._renderViews;
    }

    /**
     * XRInputSources are generally 3DOF/6DOF hand controllers
     * 3DOF controllers often have emulated 3D positions - signified
     * by the `emulatedPosition` field
     */
    get inputSources(): XRInputSource[] {
        return this.frame.session.getInputSources();
    }

    private _inputPoses: Array<XRInputPose | null> = [];

    /**
     *
     */
    get inputPoses(): Array<XRInputPose | null>[] {
        // TODO!!
        const inputSources = this.inputSources;

        // Re-using the same array to avoid allocations per frame -> adjust length in case
        // number of input sources changes
        if (inputSources.length !== this.inputPoses.length) {
            this.inputPoses.length = inputSources.length;
        }

        return
    }
}
