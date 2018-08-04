import { RenderView } from './renderview';
import { XRFrame, XRFrameOfReference, XRInputPose, XRInputSource } from './webxr';

interface XRInputData {
    source: XRInputSource;
    /** When tracking is lost, the pose might be `null` */
    pose: XRInputPose | null;
}

/**
 */
export class FrameData {
    private _time: number;
    private _frame: XRFrame;
    private _frameOfReference: XRFrameOfReference;
    private _renderViews: RenderView[] = [];
    private _renderViewsValid = false;
    private _inputData: XRInputData[] = [];
    private _inputDataValid = false;

    /** The timestamp passed to requestAnimationFrame */
    get time(): number { return this._time; }
    set time(time: number) {
        this._time = time;
    }

    get frame(): XRFrame { return this._frame; }
    set frame(frame: XRFrame) {
        this._frame = frame;
        this._renderViewsValid = false;
        this._inputDataValid = false;
    }

    get frameOfReference(): XRFrameOfReference { return this._frameOfReference; }
    set frameOfReference(frameOfReference: XRFrameOfReference) {
        this._frameOfReference = frameOfReference;
        this._inputDataValid = false;
    }

    get renderViews(): RenderView[] {
        if (this._renderViewsValid) {
            return this._renderViews;
        }

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
        } // else: return last frame's data (assumption: object is reused)

        this._renderViewsValid = true;
        return this._renderViews;
    }

    get inputData(): XRInputData[] {
        if (this._inputDataValid) {
            return this._inputData;
        }

        const sources = this._frame.session.getInputSources();
        if (sources.length !== this.inputData.length) {
            this.inputData.length = sources.length;
        }

        for (let i = 0; i < sources.length; ++i) {
            const source = sources[i];
            const pose = this._frame.getInputPose(sources[i], this.frameOfReference);
            if (!this.inputData[i]) {
                this.inputData[i] = {} as XRInputData;
            }
            this.inputData[i].source = source;
            this.inputData[i].pose = pose;
        }

        this._inputDataValid = true;
        return this._inputData;
    }
}
