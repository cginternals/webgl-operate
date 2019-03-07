
export const IS_IE11 = typeof navigator === 'undefined' ?
    undefined : /MSIE 11|Windows/i.test(navigator.userAgent);
export const IS_EDGE = typeof navigator === 'undefined' ?
    undefined : /Edge\/\d./i.test(navigator.userAgent);
