
import { clamp } from './gl-matrix-extensions';


/**
 * If true, assertions immediately return on invocation (variable can be set via webpack define plugin).
 */
declare var DISABLE_ASSERTIONS: boolean;

/**
 * If defined, logs of equal or higher verbosity level are skipped (variable can be set via webpack define plugin).
 */
declare var LOG_VERBOSITY_THRESHOLD: number; // -1 disables all logs


/** Namespace that comprises various utils (also cleans up documentation). */
namespace auxiliaries {

    let logVerbosityThreshold = typeof LOG_VERBOSITY_THRESHOLD !== 'undefined' ? LOG_VERBOSITY_THRESHOLD : 3;

    /**
     * Allows to specify the log verbosity. The default verbosity depends on the bundle type, e.g., a production bundle
     * might use a verbosity of 1, a local development bundle might favor a verbosity of 2. Even though verbosity levels
     * can be used arbitrarily, a verbosity of 0 is intended for user info only, 1 for developers, and 2 for developers
     * of this module. However, this semantic breaks when reusing this logging mechanism in other modules as well...
     * @param verbosity - Log level threshold, -1:disabled, 0:user, 1:developer, and 2:module developer.
     * @returns - The current log verbosity.
     */
    export function logVerbosity(verbosity?: number): number {
        if (verbosity !== undefined) {
            logVerbosityThreshold = Math.max(-1, verbosity);
        }
        return logVerbosityThreshold;
    }

    /**
     * Log verbosity levels.
     */
    export enum LogLevel { Debug = 3, Info = 2, Warning = 1, Error = 0 }

    /**
     * Evaluates the provided expression and throws an evaluation error if false.
     * ```
     * assert(foo <= threshold, `value of foo ${foo} exceeds threshold of ${threshold}`);
     * ```
     * @param expression - Result of an expression expected to be true.
     * @param message - Message to be passed to the error (if thrown).
     */
    const assertImpl = (expression: boolean, message: string): void => {
        if (expression) {
            return;
        }
        /* The parameters are intentionally not forwarded to console.assert since it does not interrupt execution. */
        throw new EvalError(message);
    };
    const assertEmpty = (expression: boolean, message: string): void => { };

    export let assert = assertImpl;
    if (typeof DISABLE_ASSERTIONS !== 'undefined' && DISABLE_ASSERTIONS) {
        assert = assertEmpty;
    }

    /**
     * Allows to specify whether or not assertions should be enabled or disabled/ignored.
     * @param enable - If true, assertions will be evaluated and might throw errors.
     */
    export function assertions(enable?: boolean): boolean {
        if (enable !== undefined) {
            assert = enable ? assertImpl : assertEmpty;
        }
        return assert !== assertEmpty;
    }

    /**
     * Writes a warning to the console when the evaluated expression is false.
     * ```
     * log(,`scale changed to ${scale}, given ${this._scale}`);
     * ```
     * @param expression - Result of an expression expected to be true.
     * @param verbosity - Verbosity of log level: user, developer, or module developer.
     * @param message - Message to be passed to the error (if thrown).
     */
    export function log(verbosity: LogLevel, message: string): void {
        if (verbosity > logVerbosityThreshold) {
            return;
        }
        console.log(`[${verbosity}] ${message}`);
    }

    /**
     * Writes a lo message to the console when the evaluated expression is false.
     * ```
     * logIf(!vec2.equals(this._scale, scale), LogLevel.Info, `scale changed to ${scale}, given ${this._scale}`);
     * ```
     * @param expression - Result of an expression expected to be true.
     * @param verbosity - Verbosity of log level: debug, info, warning, or error.
     * @param message - Message to be passed to the error (if thrown).
     */
    export function logIf(expression: boolean, verbosity: LogLevel, message: string): void {
        if (!expression) {
            return;
        }
        log(verbosity, message);
    }


    /**
     * Starts performance measure using the performance API. This call initiates a performance mark and should be
     * followed by a `logPerformanceStop` call later on. Furthermore, the measurement can be tracked using, e.g., the
     * Chrome built-in performance profiler. Example:
     * ```
     * gloperate.auxiliaries.logPerformanceStart('initialization');
     * ...
     * gloperate.auxiliaries.logPerformanceStop('initialization');
     * ```
     * The example above should output something like: `[3] initialization | 5.635s`.
     * @param mark - Name for the performance measure and base name for the start mark (`<mark>-start`).
     */
    export function logPerformanceStart(mark: string) {
        const start = `${mark}-start`;
        assert(performance.getEntriesByName(mark).length === 0,
            `expected mark identifier to not already exists, given ${mark}`);
        assert(performance.getEntriesByName(start).length === 0,
            `expected mark identifier to not already exists, given ${start}`);

        performance.mark(start);
    }

    /**
     * This creates a second, end mark for the given mark name, then creates a performance measure between the start
     * and end mark (`<mark>-start` and `<mark>-end`), resolves the duration for logging and, finally, removes/cleans
     * both marks and the measure. The duration is pretty printed ranging from nanoseconds to seconds. Example:
     * ```
     * gloperate.auxiliaries.logPerformanceStart('initialization');
     * ...
     * gloperate.auxiliaries.logPerformanceStop('initialization', '#items processed: ' + items.length , 48);
     * ```
     * The example above should output something like: `[3] initialization           #items processed: 4096 | 7.172ms`.
     * @param mark - Name for the performance measure and base name for the end mark (`<mark>-end`).
     * @param message - Optional message to provide to the debug-log output.
     * @param measureIndent - Optional indentation of the measure (useful if multiple measurements shall be aligned).
     */
    export function logPerformanceStop(mark: string, message: string | undefined, measureIndent: number = 0) {
        const start = `${mark}-start`;
        const end = `${mark}-end`;
        assert(performance.getEntriesByName(mark).length === 0,
            `expected mark identifier to not already exists, given ${mark}`);
        assert(performance.getEntriesByName(end).length === 0,
            `expected mark identifier to not already exists, given ${end}`);

        performance.mark(end);
        performance.measure(mark, start, end);

        const measures = performance.getEntriesByName(mark);
        const measure = measures[0];

        performance.clearMarks(start);
        performance.clearMarks(end);
        performance.clearMeasures(mark);

        const minIndent = message === undefined || message!.length === 0 ? 0 : 2;
        const indent = Math.max(minIndent, measureIndent - mark.length - (message ? message!.length : 0) - 1);

        const prettyMeasure = prettyPrintMilliseconds(measure.duration);
        log(LogLevel.Debug, `${mark}${' '.repeat(indent)}${message ? message : ''} | ${prettyMeasure}`);
    }


    /**
     * Generates a random value within a given range [min,max].
     * @param min - Minimum random value possible.
     * @param max - Maximum random value possible.
     * @return - Random number in the range [min,max].
     */
    export function rand(min: number = 0.0, max: number = 1.0): number {
        return Math.random() * (max - min) + min;
    }

    /**
     * Byte suffixes based on ISO/IEC 80000 used for pretty printing of bytes.
     */
    const byteSuffixes: Array<string> = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi'];

    /**
     * Prints bytes using ISO/IEC 80000 postfixes for bytes and fixed number of decimal places (3 decimal places if
     * bytes >= KiB).
     * ```
     * prettyPrintBytes(27738900); // returns '26.454MiB'
     * ```
     * @param bytes - Number of bytes in plain bytes.
     */
    export function prettyPrintBytes(bytes: number): string {
        const prefix: number = bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0;
        const value = bytes / Math.pow(1024, prefix);
        return `${prefix > 0 ? value.toFixed(3) : value}${byteSuffixes[prefix]}B`;
    }


    /**
     * Suffixes used for pretty printing of time values in milliseconds.
     */
    const msSuffixes: Array<string> = ['', 'ns', 'μs', 'ms', 's'];
    /**
     * Scales used for pretty printing of time values in milliseconds.
     */
    const msScales: Array<number> = [0, 1e+6, 1e+3, 1e+0, 1e-3];

    /**
     * Prints given milliseconds in an appropriate seconds-based time unit and fixed number of decimal places.
     * ```
     * prettyPrintMilliseconds(0.03277); // returns '32.770μs'
     * ```
     * @param milliseconds - Number of milliseconds as floating point number.
     */
    export function prettyPrintMilliseconds(milliseconds: number): string {
        let prefix: number = milliseconds > 0 ? Math.floor(Math.log(milliseconds * 10) / Math.log(1e+3)) + 3 : 0;
        prefix = clamp(prefix, 0, 4);

        const value = milliseconds * msScales[prefix];
        return `${prefix > 0 ? value.toFixed(3) : value}${msSuffixes[prefix]}`;
    }


    /**
     * Tests if specific bits are set in a given bitfield and returns true if so, false otherwise.
     */
    export function bitInBitfield(flags: GLbitfield, flag: GLbitfield | undefined): boolean {
        if (flag === undefined) {
            return false;
        }
        return (flags & flag) === flag;
    }

    /**
     * Conversion multiplier for radians to degrees conversion (180 / PI).
     */
    export const RAD2DEG = 57.295779513082320;

    /**
     * Conversion multiplier for degrees to radians conversion (PI / 180).
     */
    export const DEG2RAD = 0.017453292519943295;

    /**
     * Queries window.location.search.
     */
    export function GETsearch(): string {
        return window.location.search;
    }

    /**
     * Queries the value of a GET parameter.
     *  * @param parameter - Name/identifier of the parameter to query for.
     */
    export function GETparameter(parameter: string): string | undefined {
        const re = new RegExp(`${parameter}=([^&] +)`);
        const match = document.location.search.match(re);
        if (!match) {
            return undefined;
        }
        return match[1];
    }

}

export = auxiliaries;
