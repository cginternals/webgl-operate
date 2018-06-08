
import { parse } from 'query-string';

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

    let disableAssertions: boolean;
    try {
        disableAssertions = DISABLE_ASSERTIONS;
    } catch (error) {
        disableAssertions = false;
    }

    let logVerbosityThreshold: number;
    try {
        logVerbosityThreshold = LOG_VERBOSITY_THRESHOLD;
    } catch (error) {
        logVerbosityThreshold = 2;
    }

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
     * Allows to specify whether or not assertions should be enabled or disabled/ignored.
     * @param enable - If true, assertions will be evaluated and might throw errors.
     */
    export function assertions(enable?: boolean): boolean {
        if (enable) {
            disableAssertions = !enable;
        }
        return disableAssertions;
    }

    /**
     * Log verbosity levels:
     *   0: a non dev user should find this information useful
     *   1: a dev user should find this information useful
     *   2: a module dev should find this information useful
     */
    export enum LogLevel { User, Dev, ModuleDev }

    /**
     * Evaluates the provided expression and throws an evaluation error if false.
     * ```
     * assert(foo <= threshold, `value of foo ${foo} exceeds threshold of ${threshold}`);
     * ```
     * @param expression - Result of an expression expected to be true.
     * @param message - Message to be passed to the error (if thrown).
     */
    export function assert(expression: boolean, message: string): void {
        if (disableAssertions || expression) {
            return;
        }

        // Note: the parameters are intentionally not forwarded to console.assert since it does not interrupt execution.
        throw new EvalError(message);
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
     * logIf(!vec2.equals(this._scale, scale), LogLevel.Dev, `scale changed to ${scale}, given ${this._scale}`);
     * ```
     * @param expression - Result of an expression expected to be true.
     * @param verbosity - Verbosity of log level: user, developer, or module developer.
     * @param message - Message to be passed to the error (if thrown).
     */
    export function logIf(expression: boolean, verbosity: LogLevel, message: string): void {
        if (!expression) {
            return;
        }
        log(verbosity, message);
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
     * Byte prefixes based on ISO/IEC 80000 used for pretty printing of bytes.
     */
    const prefixes: Array<string> = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi'];

    /**
     * Prints bytes using ISO/IEC 80000 prefixes for bytes and fixed number of decimal places (3 decimal places if
     * bytes >= KiB).
     * ```
     * prettyPrintBytes(27738900); // returns '26.454MiB'
     * ```
     * @param bytes - Number of bytes in plain bytes.
     */
    export function prettyPrintBytes(bytes: number): string {
        const prefix: number = bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0;
        const prefixedBytes = bytes / Math.pow(1024, prefix);
        return `${prefix > 0 ? prefixedBytes.toFixed(3) : prefixedBytes}${prefixes[prefix]}B`;
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
        const params = parse(GETsearch());
        return params[parameter];
    }

}

export = auxiliaries;
