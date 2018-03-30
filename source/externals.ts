
import { assert } from './auxiliaries';


/**
 * Check if externals are loaded and sample some definitions.
 */

assert(window.hasOwnProperty('Rx'), `expected rxjs to be accessible via 'Rx'` +
    `, try loading this peer dependency, e.g., with a preceeding script tag`);
assert((window as any).Rx.hasOwnProperty('Observable'), `expected rxjs to have 'Observable' defined`);
assert((window as any).Rx.hasOwnProperty('Subject'), `expected rxjs to have 'Subject' defined`);
assert((window as any).Rx.hasOwnProperty('ReplaySubject'), `expected rxjs to have 'ReplaySubject' defined`);

/* gl-matrix cannot be externalized for now ... */
// ['vec2', 'vec3', 'vec4', 'mat3', 'mat4'].forEach((object) =>
//     assert(window.hasOwnProperty(object), `expected gl-matrix/${object} to be accessible via '${object}'` +
//         `, try loading this peer dependency, e.g., with a preceeding script tag`));
