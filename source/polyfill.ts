/**
 * IE11 polyfill for string.repeat function, from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat#Polyfill
 */
if (String.prototype.repeat === undefined) {
    // tslint:disable-next-line:space-before-function-paren
    String.prototype.repeat = function (count): string {
        'use strict';
        if (this === null) {
            throw new TypeError('can\'t convert ' + this + ' to object');
        }
        const str = '' + this;
        count = +count;
        if (count !== count) {
            count = 0;
        }
        if (count < 0) {
            throw new RangeError('repeat count must be non-negative');
        }
        if (count === Infinity) {
            throw new RangeError('repeat count must be less than infinity');
        }
        count = Math.floor(count);
        if (str.length === 0 || count === 0) {
            return '';
        }
        // Ensuring count is a 31-bit integer allows us to heavily optimize the
        // main part. But anyway, most current (August 2014) browsers can't handle
        // strings 1 << 28 chars or longer, so:
        if (str.length * count >= 1 << 28) {
            throw new RangeError('repeat count must not overflow maximum string size');
        }
        let rpt = '';
        for (let i = 0; i < count; i++) {
            rpt += str;
        }
        return rpt;
    };

}


/**
 * IE11 polyfill for string.startsWith function, from https://stackoverflow.com/a/30867255.
 */
if (String.prototype.startsWith === undefined) {
    /* tslint:disable-next-line:space-before-function-paren */
    String.prototype.startsWith = function (searchString, position): boolean {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}


/**
 * IE11 polyfill for string.endsWith function, from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
 */
if (String.prototype.endsWith === undefined) {
    /* tslint:disable-next-line:space-before-function-paren */
    String.prototype.endsWith = function (search, length?): boolean {
        if (length === undefined || length > this.length) {
            length = this.length as number;
        }
        return this.substring(length - search.length, length) === search;
    };
}


/**
 * IE11 polyfill for Array.forEach function, from ...
 */
if (Array.prototype.forEach === undefined) {
    /* tslint:disable-next-line:space-before-function-paren */
    Array.prototype.forEach = (action, that /*opt*/) => {
        const n = this.length;
        /* tslint:disable-prefer-for-of */
        for (let i = 0; i < n; i++) {
            if (i in this) {
                action.call(that, this[i], i, this);
            }
        }
    };
}

/**
 * IE11 polyfill for Math.log10 function
 */
if (Math.log10 === undefined) {
    /* tslint:disable-next-line:space-before-function-paren */
    Math.log10 = (x) => Math.log(x) * Math.LOG10E;
}

/**
 * IE11 polyfill for Number.EPSILON.
 */
interface NumberPolyfill {
    EPSILON: number;
}
if (Number.EPSILON === undefined) {
    (Number as NumberPolyfill).EPSILON = Math.pow(2, -52);
}



// tslint:disable-next-line:max-line-length
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/slice#Polyfill
[Float32Array, Uint8Array, Int8Array, Uint32Array, Int32Array].forEach((arrayType) => {
    if (!arrayType.prototype.slice) {
        Object.defineProperty(arrayType.prototype, 'slice', { value: Array.prototype.slice });
    }
    if (!arrayType.prototype.reduce) {
        Object.defineProperty(arrayType.prototype, 'reduce', { value: Array.prototype.reduce });
    }
});
