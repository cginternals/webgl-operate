
/* spellchecker: disable */

import { Observable, ReplaySubject } from 'rxjs';

import { assert, log, logIf, LogLevel, logVerbosity } from './auxiliaries';
import { clamp } from './gl-matrix-extensions';

/* spellchecker: enable */


/**
 * This internal interface is not intended for module export and should not be used as generic rendering/controller
 * interface. The renderer interface should be used for rendering related tasks instead.
 */
export interface Controllable {

    /**
     * Used to trigger an renderer update. Returns true iff rendering is invalidated and
     * a new multi-frame should be rendered-
     */
    update(multiFrameNumber: number): boolean;

    /**
     * Used to prepare rendering of a multi-frame.
     */
    prepare(): void;

    /**
     * Used to trigger rendering of a single, intermediate frame.
     */
    frame(frameNumber: number): void;

    /**
     * Used to swap/blit frame from back to front buffer.
     */
    swap(): void;

}


/**
 * This class controls the rendering flow by means of triggering rendering of a well defined amount of frames
 * (multi-frame number) for frame accumulation. Single frame rendering is handled with a multi-frame number of 1. If a
 * full multi-frame is accumulated, rendering halts. The rendering is not intended to be controlled by owning objects,
 * but via invalidation from within the renderer instead. However, an explicit redraw of a full single or multi-frame
 * can be invoked by calling `update()`. Furthermore, when using multi-frame rendering, the renderer can be halted at a
 * specific frame by setting a debug-frame number.
 *
 * Terminology: a multi-frame is the final result after accumulating a number of intermediate frames (frame). The
 * number of intermediate frames is defined by the multi-frame number. For a multi-frame, the controller invokes the
 * `prepare` on a controllable first, followed by multiple `frame` and `swap` calls. Please note that the
 * adaptive batch mode is yet experimental (can be enabled using `batchSize`).
 */

export class Controller {

    /**
     * Toggle for debug outputs; if true control flow will be logged.
     */
    protected static _debug = false;
    set debug(value: boolean) {
        if (value && logVerbosity() < LogLevel.Debug) {
            logVerbosity(LogLevel.Debug);
            log(LogLevel.Debug,
                `changed log verbosity to ${LogLevel.Debug} (debug)`);
        }
        Controller._debug = value;
    }

    /**
     * Number of intermediate frames that are rendered during one browser frame
     */
    protected _batchSize = 1;
    set batch(size: number) {
        log(LogLevel.Warning, `(adaptive) batch multi-frame rendering is experimental for now`);
        this._batchSize = Math.max(1, size);
    }


    /**
     * @see {@link multiFrameNumber}
     * This property can be observed, e.g., `aController.multiFrameNumberObservable.subscribe()`.
     */
    protected _multiFrameNumber = 1;
    protected _multiFrameNumberSubject = new ReplaySubject<number>(1);

    /**
     * @see {@link debugFrameNumber}
     * This property can be observed, e.g., `aController.debugFrameNumberObservable.subscribe()`.
     */
    protected _debugFrameNumber = 0;
    protected _debugFrameNumberSubject = new ReplaySubject<number>(1);

    /**
     * @see {@link frameNumber}
     * This property can be observed, e.g., `aController.frameNumberObservable.subscribe()`.
     */
    protected _frameNumber = 0;
    protected _frameNumberSubject = new ReplaySubject<number>(1);


    // /** @see {@link multiFrameDelay} */
    // protected _multiFrameDelay = 0;
    // protected _delayedRequestTimeout: number | undefined;


    /**
     * Controllable, e.g., an instance of a Renderer.
     */
    protected _controllable: Controllable | undefined;


    /**
     * Holds the handle of the pending animate frame request, if requested. Throughout the controller, only a single
     * request at a time is allowed.
     */
    protected _pendingRequest = 0;

    /**
     * Stores the controller's pause state.
     */
    protected _pause = false;

    /**
     * Blocking updates can be used to re-configure the controller without triggering
     */
    protected _block = false;

    /**
     * Number of update requested while being in blocked mode. If there is one or more blocked requests, an update will
     * be triggered when unblocked.
     */
    protected _blockedUpdates = 0;


    /* Debug and  reporting facilities. */

    /**
     * Total number of rendered intermediate frames.
     */
    protected _intermediateFrameCount = 0;

    /**
     * Total number of completed multi-frames.
     */
    protected _multiFrameCount = 0;

    /**
     * Time tracker used to the minimum and maximum frame time of an intermediate frame (per multi-frame).
     */
    protected _intermediateFrameTimes = new Array<number>(2);
    /**
     * Time tracker used to accumulate all durations of executed frame and swap callbacks per multi-frame. This is the
     * net rendering time and is used to derive the average frame time.
     */
    protected _multiFrameTime: number;
    /**
     * Time tracker used to capture the time the update callback took.
     */
    protected _updateFrameTime: number;

    /**
     * Used to measure the gross rendering time of a multi-frame. The first point in time denotes the start of the
     * rendering, the second, the point in time the last frame was rendered.
     *
     * Note: point in times might be shifted due to (un)pausing. Their intent is to allow measuring the rendering
     * duration, nothing else.
     */
    protected _multiTime: Array<number> = [0.0, 0.0];

    /**
     * Point in time when the pause started. This is used to shift the gross rendering time measurement in _multiTime.
     */
    protected _pauseTime: number | undefined;
    protected _totalPauseTime = 0;


    /**
     * Triggers a frame invocation before the browser repaints. If no rendering callback is setup, the request
     * is ignored.
     */
    protected request(type?: Controller.RequestType): void {
        /**
         * Prevent unnecessary canceling and requesting of animation frames when updating multiple times before an
         * actual first frame is triggered.
         */
        if (this._pendingRequest !== 0) {
            logIf(Controller._debug, LogLevel.Debug, `c request (ignored) | pending: '${this._pendingRequest}'`);
            return;
        }
        if (this._pause || !this._controllable) {
            logIf(Controller._debug, LogLevel.Debug, `c request (ignored) | pending: '${this._pendingRequest}'`);
            return;
        }
        logIf(Controller._debug, LogLevel.Debug, `c request           | intermediates: #${this._frameNumber}`);

        const dfnum = this._debugFrameNumber;
        const mfnum = this._multiFrameNumber;

        assert(dfnum <= mfnum, `debug-frame number exceeds multi-frame number`);
        assert(this._pendingRequest === 0, `another request is pending, cannot invoke multiple requests`);

        if (dfnum > 0 && this._frameNumber >= dfnum) {
            this.pause();
        }

        const numRemainingIntermediates = Math.max((dfnum > 0 ? dfnum : mfnum) - this._frameNumber, 0);

        if (type !== undefined) {
            this._pendingRequest = window.requestAnimationFrame(() => this.invoke(type));
        } else if (numRemainingIntermediates > 0) {
            this._pendingRequest = window.requestAnimationFrame(() => this.invoke(Controller.RequestType.Frame));
        } else if (dfnum === mfnum || dfnum === 0) {
            ++this._multiFrameCount;
        }
    }


    // protected requestDelayed(type?: Controller.RequestType): void {
    //     if (this._multiFrameDelay === 0 || this._frameNumber !== 1) {
    //         return this.request(type);
    //     }

    //     if (this._delayedRequestTimeout !== undefined) {
    //         clearTimeout(this._delayedRequestTimeout);
    //     }
    //     this._delayedRequestTimeout = window.setTimeout(() => this.request(type), this._multiFrameDelay);
    // }


    protected reset(): boolean {
        const block = this._block || (this._frameNumber === 0 && this._pendingRequest);
        logIf(Controller._debug, LogLevel.Debug, `c update  ${block ? '(blocked) ' : '          '}| ` +
            `pending: '${this._pendingRequest}', intermediates: #${this._frameNumber}`);

        if (block) {
            ++this._blockedUpdates;
            return true;
        }
        this.cancel();
        return false;
    }

    /**
     * Cancel a pending frame invocation (if existing).
     */
    protected cancel(): void {
        if (this._pendingRequest === 0) {
            logIf(Controller._debug, LogLevel.Debug, `c cancel  (ignored) |`);
            return;
        }
        logIf(Controller._debug, LogLevel.Debug, `c cancel            | pending: '${this._pendingRequest}'`);

        window.cancelAnimationFrame(this._pendingRequest);
        this._pendingRequest = 0;
    }

    protected invoke(type: Controller.RequestType): void {
        assert(this._pendingRequest !== 0, `manual/explicit invocation not anticipated`);
        assert(this._controllable !== undefined, `expected valid controllable for invocation`);

        this._pendingRequest = 0;

        /* tslint:disable-next-line:switch-default */
        switch (type) {
            case Controller.RequestType.Update:
                this.invokeUpdate(false);
                break;
            case Controller.RequestType.NonOptionalUpdate:
                this.invokeUpdate(true);
                break;
            case Controller.RequestType.Prepare:
                this.invokePrepare();
                break;
            case Controller.RequestType.Frame:
                this.invokeFrame();
                break;
        }
    }

    protected invokeUpdate(force: boolean = false): void {
        logIf(Controller._debug, LogLevel.Debug, `c invoke update     | ` +
            `pending: '${this._pendingRequest}', mfnum: ${this._multiFrameNumber}`);

        this.unblock();
        assert(!this._pause, `updates should not be invoked when paused`);

        const redraw: boolean = (this._controllable as Controllable).update(this._multiFrameNumber);
        if (force || redraw) {
            this.invokePrepare();
            return;
        }
        this.invokeFrame();
    }

    /**
     * Actual invocation of the controllable's prepare method.
     */
    protected invokePrepare(): void {
        logIf(Controller._debug, LogLevel.Debug, `c invoke prepare    |`);

        this._frameNumber = 0;

        this._pause = false;
        this._pauseTime = undefined;

        this._multiFrameTime = 0.0;
        this._intermediateFrameTimes[0] = Number.MAX_VALUE;
        this._intermediateFrameTimes[1] = Number.MIN_VALUE;

        /* Trigger preparation of a new multi-frame and measure execution time. */
        this._multiTime[0] = performance.now();
        (this._controllable as Controllable).prepare();
        this._multiTime[1] = performance.now();

        const updateDuration = this._multiTime[1] - this._multiTime[0];
        this._multiFrameTime = updateDuration;
        this._updateFrameTime = updateDuration;

        this.invokeFrame();
    }

    /**
     * Invokes rendering of an intermediate frame, increments the frame counter, and requests rendering of the next
     * frame. The rendering is invoked by means of a callback to the canvas renderer. This function implements various
     * asserts to assure correct control logic and absolutely prevent unnecessary frame requests.
     */
    protected invokeFrame(): void {
        assert(!this._pause, `frames should not be invoked when paused`);
        logIf(Controller._debug, LogLevel.Debug, `c invoke frame      | pending: '${this._pendingRequest}'`);

        const dfnum = this._debugFrameNumber;
        const mfnum = this._multiFrameNumber;

        if (this._frameNumber === mfnum) {
            return;
        }

        const debug = dfnum > 0;
        assert(!debug || this._frameNumber < dfnum, `frame number about to exceed debug-frame number`);

        assert(this._controllable !== undefined, `update invoked without controllable set`);


        /* Trigger an intermediate frame and measure and accumulate execution time for average frame time. This should
        be the only place, any renderer frame method is invoked. */

        const t0 = performance.now();

        let batchEnd = Math.min(this._multiFrameNumber, this._frameNumber + this._batchSize);
        if (this._debugFrameNumber > 0) {
            batchEnd = Math.min(batchEnd, this._debugFrameNumber);
        }

        for (; this._frameNumber < batchEnd; ++this._frameNumber) {
            logIf(Controller._debug, LogLevel.Debug, `c -> frame          | frame: ${this._frameNumber}`);
            (this._controllable as Controllable).frame(this._frameNumber);
            ++this._intermediateFrameCount;
        }
        logIf(Controller._debug, LogLevel.Debug, `c -> swap           |`);

        (this._controllable as Controllable).swap();
        this._multiTime[1] = performance.now();

        /* Note: critical call sequence; be careful when changing the following lines. */

        const frameDuration = this._multiTime[1] - t0;
        this._multiFrameTime += frameDuration;

        /* Keep track of minimum and maximum intermediate frame durations. */
        this._intermediateFrameTimes[0] = Math.min(this._intermediateFrameTimes[0], frameDuration);
        /* Note that the first frame is probably the slowest due to lazy initialization of stages/passes. */
        this._intermediateFrameTimes[1] = Math.max(this._intermediateFrameTimes[1], frameDuration);

        this.frameNumberNext();

        this.request();
    }


    /**
     * Utility for communicating this._multiFrameNumber changes to its associated subject.
     */
    protected multiFrameNumberNext(): void {
        this._multiFrameNumberSubject.next(this._multiFrameNumber);
    }

    /**
     * Utility for communicating this._debugFrameNumber changes to its associated subject.
     */
    protected debugFrameNumberNext(): void {
        this._debugFrameNumberSubject.next(this._debugFrameNumber);
    }

    /**
     * Utility for communicating this._frameNumber changes to its associated subject.
     */
    protected frameNumberNext(): void {
        this._frameNumberSubject.next(this._frameNumber);
    }


    /**
     * Sets pause state to true which affects subsequent requests. Any pending requests are canceled.
     */
    pause(): void {
        const ignore = this._pause;
        logIf(Controller._debug, LogLevel.Debug, `c pause   ${ignore ? '(ignored)' : ''}`);

        if (this._pause) {
            return;
        }
        this._pause = true;
        this._pauseTime = performance.now();

        this.cancel();
    }

    /**
     * Sets pause state to false which affects subsequent requests. Furthermore, a request is invoked.
     */
    unpause(): void {
        const ignore = !this._pause;
        logIf(Controller._debug, LogLevel.Debug, `c unpause ${ignore ? '(ignored)' : ''}`);

        if (ignore) {
            return;
        }
        this._pause = false;

        if (this._pauseTime !== undefined && !isNaN(this._pauseTime)) {
            /* Subtract paused time from multi-frame time. */
            const pauseDelay = performance.now() - this._pauseTime;
            this._multiTime[0] += pauseDelay;

            /* Note: this is just in case the fps is gathered while a request is pending. */
            this._multiTime[1] += pauseDelay;

            this._totalPauseTime += pauseDelay;
        }
        this.request();
    }

    /**
     * Resets multi-frame rendering by restarting at the first frame. If paused, this unpauses the controller.
     * If updates where blocked using `block`, block updates is disabled.
     */
    update(force: boolean = false): void {
        if (this.reset()) {
            return;
        }
        this.request(force ? Controller.RequestType.NonOptionalUpdate : Controller.RequestType.Update);
    }

    prepare(): void {
        if (this.reset()) {
            return;
        }
        this.request(Controller.RequestType.Prepare);
    }


    /**
     * Block implicit updates, e.g., caused by various setters. This can be used to reconfigure the controller without
     * triggering to multiple intermediate updates. The block updates mode can be exited using `unblock`.
     */
    block(): void {
        logIf(Controller._debug, LogLevel.Debug, `c block   ${this._block ? '(ignored) ' : '          '}|`);

        if (this._block) {
            return;
        }
        this._block = true;
    }

    /**
     * Unblock updates. If there was at least one blocked update request, an immediate update is invoked.
     */
    unblock(): void {
        logIf(Controller._debug, LogLevel.Debug, `c unblock ${!this._block ? '(ignored) ' : '          '}` +
            `| blocked: #${this._blockedUpdates}`);

        if (!this._block) {
            return;
        }
        this._block = false;
        if (this._blockedUpdates > 0) {
            this._blockedUpdates = 0;
            this.update();
        }
    }


    /**
     * Returns whether or not the control is paused.
     * @returns - True if paused, else false.
     */
    get paused(): boolean {
        return this._pause;
    }

    /**
     * Returns whether or not the control is blocking updates.
     * @returns - True if blocked, else false.
     */
    get blocked(): boolean {
        return this._block;
    }


    /**
     * Sets the controllable, for which updates, frames, and swaps are invoked whenever rendering is
     * invalidated and an updated multi-frame is required. Swap is detached from frame since rendering an intermediate
     * frame is usually done offscreen and explicit swap control can be useful.
     * @param controllable - Controllable for update, frame, and swap invocation.
     */
    set controllable(controllable: Controllable | undefined) {
        if (controllable === this._controllable) {
            return;
        }
        this._controllable = controllable;
        this.update();
    }


    /**
     * Returns the multi-frame number. The number is greater than or equal to zero. Multi-frame number is implemented
     * as a property and allows for change callback.
     * @returns - Multi-frame number.
     */
    get multiFrameNumber(): number {
        return this._multiFrameNumber;
    }

    /**
     * Changes the multi-frame number. If the provided value equals the current number set, nothing happens. If the
     * provided value is negative, the multi-frame number is set to 1.
     * @param multiFrameNumber - The multi-frame number targeted for rendering.
     */
    set multiFrameNumber(multiFrameNumber: number) {
        const value: number = Math.max(1, isNaN(multiFrameNumber) ? 1 : multiFrameNumber);
        if (value === this._multiFrameNumber) {
            return;
        }

        this._multiFrameNumber = value;
        this.multiFrameNumberNext();

        logIf(value !== multiFrameNumber, LogLevel.Debug,
            `multi-frame number adjusted to ${value}, given ${multiFrameNumber}`);

        if (this.debugFrameNumber > this.multiFrameNumber) {
            this.debugFrameNumber = this.multiFrameNumber;
        } else {
            this.update();
        }
    }

    /**
     * Observable that can be used to subscribe to multi-frame number changes.
     */
    get multiFrameNumber$(): Observable<number> {
        return this._multiFrameNumberSubject.asObservable();
    }


    /**
     * Returns the debug-frame number greater than or equal to zero.
     * @returns - Debug-frame number.
     */
    get debugFrameNumber(): number {
        return this._debugFrameNumber;
    }

    /**
     * Sets the debug.-frame number (debug number) that, if greater than zero, causes the rendering to halt when the
     * current frame number (frame number) equals the debug number. Debugging can be disabled by setting the debug
     * number to zero.
     *
     * If the debug number is greater than the frame number rendering is restarted by means of an update(). If the
     * debug number is less than the frame number the rendering continues and halts accordingly. If the debug number
     * equals the current debug number set, nothing happens. If the debug number is greater than the multi-frame
     * number, it is reduced to the multi-frame number.
     *
     * Note: in contrast to setting the multi-frame number, setting the debug-frame number unpauses the controller.
     *
     * @param debugFrameNumber - Debug-frame number.
     */
    set debugFrameNumber(debugFrameNumber: number) {
        const value: number = clamp(isNaN(debugFrameNumber) ? 0 : debugFrameNumber, 0, this.multiFrameNumber);
        if (value === this._debugFrameNumber) {
            return;
        }

        this._debugFrameNumber = value;
        this.debugFrameNumberNext();

        logIf(value !== debugFrameNumber, LogLevel.Debug,
            `debug-frame number adjusted to ${value}, given ${debugFrameNumber}`);

        if (this._block) {
            return;
        }

        if (this.debugFrameNumber < this._frameNumber) {
            this.prepare();
        } else if (!this._pendingRequest) {
            this.unpause();
            this.request();
        }
    }

    /**
     * Observable that can be used to subscribe to debug-frame number changes.
     */
    get debugFrameNumber$(): Observable<number> {
        return this._debugFrameNumberSubject.asObservable();
    }


    // /**
    //  * Sets the multi-frame delay in milliseconds. This is used to delay rendering of subsequent intermediate frames
    //  * after an update.
    //  * @param multiFrameDelay - A multi-frame delay in milliseconds.
    //  */

    // set multiFrameDelay(multiFrameDelay: number) {
    //     const value: number = Math.max(0, multiFrameDelay);
    //     if (value === this._multiFrameDelay) {
    //         return;
    //     }
    //     this._multiFrameDelay = value;
    // }

    // /**
    //  * Time in milliseconds used to delay rendering of subsequent intermediate frames after an update.
    //  * @returns - The current multi-frame delay in milliseconds.
    //  */
    // get multiFrameDelay(): number {
    //     return this._multiFrameDelay;
    // }


    /**
     * The current multi-frame number; it is less than or equal to the multi-frame number and enumerates the last
     * rendered frame. Note that this does not denote the number of 'completed' multi-frames rendered (not a continuous
     * frame count).
     * @returns - The current (intermediate) frame number.
     */
    get frameNumber(): number {
        return this._frameNumber;
    }

    /**
     * Observable that can be used to subscribe to frame number changes.
     */
    get frameNumber$(): Observable<number> {
        return this._frameNumberSubject.asObservable();
    }


    /**
     * Returns the total number of rendered (requested and probably completed) intermediate frames.
     * @returns - The total number of intermediate frames rendered.
     */
    get intermediateFrameCount(): number {
        return this._intermediateFrameCount;
    }

    /**
     * Returns the total number of completed multi-frames.
     * @returns - The total number of multi-frames completed.
     */
    get multiFrameCount(): number {
        return this._multiFrameCount;
    }

    /**
     * Provides the average time it takes to render an intermediate frame within the current displayed multi-frame (if
     * a new multi-frame is triggered, the average frame time is reset).
     * @returns - Average frame time (intermediate frame rendering) in ms
     */
    get averageFrameTime(): number {
        return this._frameNumber === 0 ? 0.0 : this._multiFrameTime / this._frameNumber;
    }

    /**
     * Provides the update time tracked for the current multi-frame.
     * @returns - Time of the multi-frame update (before first intermediate frame is rendered) in ms
     */
    get updateFrameTime(): number {
        return this._updateFrameTime;
    }

    /**
     * Provides the minimum rendering time tracked over all intermediate frames of the current multi-frame.
     * @returns - Minimum intermediate frame time in ms
     */
    get minimumFrameTime(): number {
        return this._intermediateFrameTimes[0];
    }

    /**
     * Provides the maximum rendering time tracked over all intermediate frames of the current multi-frame. Note that
     * the maximum frame time is most often caused by the first intermediate frame within a multi-frame due to lazy
     * stage initialization or reconfiguration.
     * @returns - Maximum intermediate frame time in ms
     */
    get maximumFrameTime(): number {
        return this._intermediateFrameTimes[1];
    }

    /**
     * The time in milliseconds that passed since the current multi-frame (up to the current frame number) was
     * requested. This time excludes time spent paused (e.g., caused by halting rendering at debug-frame number).
     * Note that this is not a measure of frame rendering performance. The number of frame requests per second might be
     * limited to 60Hz even though the rendering of an intermediate frame takes only a few milliseconds.
     * @returns - Time passed for current multi-frame in milliseconds.
     */
    get multiFrameTime(): number {
        return this._frameNumber === 0 ? 0.0 : this._multiTime[1] - this._multiTime[0];
    }
    /**
     * The frames per second is based on the average number of a full intermediate frame request up to the current
     * frame number.
     * @returns - Number of frames per second based on the current multi-frame
     */
    get framesPerSecond(): number {
        return this._frameNumber === 0 ? 0.0 : 1000.0 / (this.multiFrameTime / this._frameNumber);
    }

    /**
     * Wraps window.performance.now() and subtracts the total time the controller was paused.
     * @returns - Time elapsed since origin minus the time the controller was paused
     */
    get elapsedTime(): number {
        const now = window.performance.now();
        return now - (this._pause ? now - this._pauseTime! : 0) - this._totalPauseTime;
    }
}


export namespace Controller {

    export enum RequestType { Update, NonOptionalUpdate, Prepare, Frame }

}
