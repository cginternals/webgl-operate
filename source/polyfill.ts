
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
 * IE polyfill for Number.EPSILON.
 */
interface NumberPolyfill {
    EPSILON: number;
}
if (Number.EPSILON === undefined) {
    (Number as NumberPolyfill).EPSILON = Math.pow(2, -52);
}
