/**
 * IE11 polyfill for string.repeat function, from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat#Polyfill
 */
if (String.prototype.repeat === undefined) {
    // tslint:disable-next-line:space-before-function-paren
    String.prototype.repeat = function (count): string {
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
 * IE11 polyfill for string.includes function, from
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String/includes
 */
if (String.prototype.includes === undefined) {
    // tslint:disable-next-line: space-before-function-paren
    String.prototype.includes = function (search, start): boolean {
        if (typeof start !== 'number') {
            start = 0;
        }

        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}

/**
 * IE11 polyfill for string.trimLeft function, from
 * https://stackoverflow.com/a/2308168
 */
if (String.prototype.trimLeft === undefined) {
    // tslint:disable-next-line: space-before-function-paren
    String.prototype.trimLeft = function (): string {
        return this.replace(/^\s+/, '');
    };
}

/**
 * IE11 polyfill for string.trimLeft function, from
 * https://stackoverflow.com/a/2308168
 */
if (String.prototype.trimRight === undefined) {
    // tslint:disable-next-line: space-before-function-paren
    String.prototype.trimRight = function (): string {
        return this.replace(/^\s+/, '');
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
 * IE11 polyfill for Array.fill function, from ...
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill
 */
if (Array.prototype.fill === undefined) {
    Array.prototype.fill = (value, start: number, end: number) => {

        // Steps 1-2.
        if (this === null) {
            throw new TypeError('this is null or not defined');
        }

        const O = Object(this);

        // Steps 3-5.
        const len = O.length >>> 0;

        // Steps 6-7.
        const relativeStart = start >> 0;

        // Step 8.
        let k = relativeStart < 0 ?
            Math.max(len + relativeStart, 0) :
            Math.min(relativeStart, len);

        // Steps 9-10.
        const relativeEnd = end === undefined ?
            len : end >> 0;

        // Step 11.
        const final = relativeEnd < 0 ?
            Math.max(len + relativeEnd, 0) :
            Math.min(relativeEnd, len);

        // Step 12.
        while (k < final) {
            O[k] = value;
            ++k;
        }

        // Step 13.
        return O;
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
    if (!arrayType.prototype.filter) {
        Object.defineProperty(arrayType.prototype, 'filter', { value: Array.prototype.filter });
    }
    if (!arrayType.prototype.map) {
        Object.defineProperty(arrayType.prototype, 'map', { value: Array.prototype.map });
    }
    if (!arrayType.prototype.indexOf) {
        Object.defineProperty(arrayType.prototype, 'indexOf', { value: Array.prototype.indexOf });
    }
});


// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (typeof Object.assign === 'undefined') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, 'assign', {
        value(target: any, varArgs: any): void { // .length of function is 2
            if (target === undefined && target === null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }

            const to = Object(target);

            for (let index = 1; index < arguments.length; index++) {
                const nextSource = arguments[index];

                if (nextSource !== undefined && nextSource !== null) { // Skip over if undefined or null
                    for (const nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        configurable: true,
        writable: true,
    });
}
