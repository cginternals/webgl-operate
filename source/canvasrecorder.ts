
/* spellchecker: disable */

import { Canvas } from './canvas';
import { assert } from './auxiliaries';

/* spellchecker: enable */


declare let MediaRecorder: any;

type CanvasCaptureMediaStream = any;
type MediaRecorder = any;
type ImagesAvailableCallback = (images: Array<Blob>) => void;

/**
 * Class to record the contents of a Canvas.
 * Some time after stopping the CanvasRecorder the recorded images will be available as Array of Blobs. The images can
 * be retrieved by setting the onImagesAvailable callback.
 * Exemplary usage:
 * ```
 * const recorder = new CanvasRecorder(canvas);
 * const images = new Array<Blob>();
 * recorder.onImagesAvailable = (data: Array<Blob>) => images.push(data);
 * recorder.start(60);
 * ...
 * recorder.stop();
 *
 * ```
 */
export class CanvasRecorder {

    protected _canvas: Canvas;

    protected _stream: CanvasCaptureMediaStream;
    protected _recorder: MediaRecorder;
    protected _state: CanvasRecorder.State;

    protected _images: Array<Blob>;
    protected _mimeType: string;
    protected _onImagesAvailable: ImagesAvailableCallback | undefined;

    /**
     * Checks whether recording the canvas is supported.
     */
    static isSupported(): boolean {
        return (window as any).MediaRecorder !== undefined;
    }

    /**
     * Checks whether the given MIME type is supported.
     * @param type - MIME type to check.
     */
    static isMIMETypeSupported(type: string): boolean {
        return MediaRecorder.isTypeSupported(type);
    }

    /**
     * Creates a CanvasRecorder. Throws, if it is not supported on the used platform.
     * @param canvas - The canvas to record.
     */
    constructor(canvas: Canvas) {
        assert(CanvasRecorder.isSupported(), 'Recording the canvas is not supported.');

        this._canvas = canvas;
        this._state = CanvasRecorder.State.INACTIVE;
        this._images = new Array<Blob>();
    }

    /**
     * Starts recording the the canvas. If the given fps is 0 it won't automatically record. Instead {@link frame} has
     * to be called every time a new frame should get recorded. Must not be called with negative fps, while already
     * recording or with an unsupported MIME type.
     * @param fps - Maximum fps to record in.
     * @param mimeType - The MIME video type.
     */
    start(fps: number, mimeType: string = 'video/webm', bitsPerSecond: number = 4 * 2 ** 20): void {

        assert(fps >= 0, 'FPS has to be positive');
        assert(this._state === CanvasRecorder.State.INACTIVE, 'Recorder has to be inactive.');
        assert(CanvasRecorder.isMIMETypeSupported(mimeType), `MIME type: ${mimeType} is not supported.`);

        this._stream = (this._canvas.element as any).captureStream(fps);
        this._recorder = new MediaRecorder(this._stream, { mimeType, bitsPerSecond });
        this._images.length = 0;
        this._mimeType = mimeType;


        this._recorder.ondataavailable = (event: any) => this._images.push(event.data);
        this._recorder.onstop = () => { if (this._onImagesAvailable) this._onImagesAvailable(this._images); }

        this._recorder.start();

        this._state = CanvasRecorder.State.RECORDING;
    }

    /**
     * Stops recording the canvas. Must not be called while not already recording.
     */
    stop(): void {
        assert(this._state !== CanvasRecorder.State.INACTIVE, 'Recorder must not be inactive.');

        const tracks = this._stream.getTracks();
        assert(tracks.length === 1, 'CanvasRecorder uses outdated version of MediaStream API.');

        this._recorder.stop();
        tracks[0].stop();

        this._recorder = undefined;
        this._stream = undefined;

        this._state = CanvasRecorder.State.INACTIVE;
    }

    /**
     * Pauses recording. Can be later resumed with {@link resume}.
     * Must not be called while not already recording.
     */
    pause(): void {
        assert(this._state !== CanvasRecorder.State.INACTIVE, 'Recorder must not be inactive.');

        this._recorder.pause();

        this._state = CanvasRecorder.State.PAUSED;
    }

    /**
     * Resumes recording.
     * Must not be called while not already recording.
     */
    resume(): void {
        assert(this._state !== CanvasRecorder.State.INACTIVE, 'Recorder must not be inactive.');

        this._recorder.resume();

        this._state = CanvasRecorder.State.RECORDING;
    }

    /**
     * Explicitly records a single frame from the canvas. This can be used when {@link start} was called with fps = 0.
     */
    frame(): void {
        assert(this._state === CanvasRecorder.State.RECORDING, 'Recorder has to be recording.');

        const tracks = this._stream.getTracks();
        assert(tracks.length === 1, 'CanvasRecorder uses unknown implementation of MediaStream API.');
        assert(this._stream.requestFrame || tracks[0].requestFrame,
            'CanvasRecorder uses unknown implementation of MediaStream API.');

        // Per MDN captureStream should return a MediaStream, which contains exactly 1 CanvasCaptureMediaStreamTrack.
        // Chrome + new Edge implements it exactly like that. Firefox instead returns CanvasCaptureMediaStream, which
        // contains exactly 1 MediaStreamTrack. Since neither a MediaStream nor a MediaStreamTrack offer the possibility
        // to request a frame we have to differentiate between the two.
        if (this._stream.requestFrame) {
            this._stream.requestFrame();
        } else {
            tracks[0].requestFrame();
        }
    }

    /**
     * Creates a temporary hyperlink element and triggers a download of the blob with the given file name. Both, the
     * hyperlink element and the blob url are removed automatically shortly after the hyperlink click was triggered.
     */
    download(fileName: string): void {

        const url = URL.createObjectURL(this.blob);
        const element: HTMLElement = document.createElement('a');

        element.style.display = 'none';
        element.setAttribute('href', url);
        element.setAttribute('download', fileName);

        document.body.appendChild(element);
        element.click();

        setTimeout(() => {
            document.body.removeChild(element);
            window.URL.revokeObjectURL(url);
        }, 256);
    }

    /**
     * Returns the recorded images. Note: Images are not necessarily immediately available after stopping.
     */
    get images(): Array<Blob> {
        return this._images;
    }

    /**
     * Returns the state the CanvasRecorder currently is in.
     */
    get state(): CanvasRecorder.State {
        return this._state;
    }

    /**
     * Returns a new blob of all recorded, available images.
     */
    get blob(): Blob {
        return new Blob(this._images, { type: this._mimeType });
    }

    /**
     * Sets the onImagesAvailable callback.
     */
    set onImagesAvailable(callback: ImagesAvailableCallback) {
        this._onImagesAvailable = callback;
    }
}


export namespace CanvasRecorder {

    export enum State {
        INACTIVE,
        RECORDING,
        PAUSED,
    }
}
