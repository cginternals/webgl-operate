
namespace common {

    /**
     * If defined, assertions immediately return on invocation
     */
    const DISABLE_ASSERTIONS = false;

    /**
     * If defined, logs of equal or higher verbosity level are skipped.
     */
    const LOG_VERBOSITY_THRESHOLD = 2; // -1 disables all logs

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
     *
     * @param expression - Result of an expression expected to be true.
     * @param message - Message to be passed to the error (if thrown).
     */
    export function assert(expression: boolean, message: string): void {
        if (DISABLE_ASSERTIONS || expression) {
            return;
        }

        // Note: the parameters are intentionally not forwarded to console.assert since it does not interrupt execution.
        throw new EvalError(message);
    }

    /**
     * Evaluates the provided expression and throws a range error if false.
     * ```
     * assert_range(foo >= 0, `value of foo expected to be positive`);
     * ```
     *
     * @param expression - Result of an expression expected to be true.
     * @param message - Message to be passed to the error (if thrown).
     */
    export function assert_range(expression: boolean, message: string): void {
        if (DISABLE_ASSERTIONS || expression) {
            return;
        }

        // Note: the parameters are intentionally not forwarded to console.assert since it does not interrupt execution.
        throw new RangeError(message);
    }

    /**
     * Writes a warning to the console when the evaluated expression is false.
     * ```
     * log_if(!vec2.equals(this._scale, scale),
     *     `scale changed to ${scale}, given ${this._scale}`);
     * ```
     *
     * @param expression - Result of an expression expected to be true.
     * @param verbosity - Verbosity of log level: is it interesting for the user, developer, or module developer
     * @param message - Message to be passed to the error (if thrown).
     */
    export function log_if(expression: boolean, verbosity: LogLevel, message: string): void {

        if (verbosity > LOG_VERBOSITY_THRESHOLD || !expression) {
            return;
        }

        console.log(`[${verbosity}] ${message}`);
    }

    /**
     * Generates a random value within a given range [min,max].
     *
     * @param min - Minimum random value possible.
     * @param max - Maximum random value possible.
     *
     * @return Random number in the range [min,max].
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
     *
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
    export function bitInBitfield(flags: GLbitfield, flag: GLbitfield): boolean {
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
     * Explicitly define an epsilon since, e.g., IE11 does not support Number.EPSILON.
     */
    export const EPSILON: number = Number.EPSILON ? Number.EPSILON : 2.220446049250313e-16;

    /**
     * Queries the value of a GET parameter.
     *
     * @param parameter - Name/identifier of the parameter to query for.
     */
    export function GETparameter(parameter: string): string | undefined {
        const href = decodeURI(window.location.href);
        if (href.indexOf(parameter) < 0) {
            return undefined;
        }

        /* tslint:disable-next-line:variable-name */
        const GETparameters = href.split('?')[1].split('&');
        for (const parameters of GETparameters) {
            const paramAndValue = parameters.split('=');
            if (paramAndValue[0] === parameter) {
                return paramAndValue[1];
            }
        }
        return undefined;
    }
}

export = common;
