
import { assert } from './auxiliaries';


/**
 * Check if externals are loaded and sample some definitions.
 */

assert(window.hasOwnProperty('Rx'), `expected rxjs to be accessible via 'Rx'` +
    `, try loading this peer dependency, e.g., with a preceeding script tag`);
assert((window as any).Rx.hasOwnProperty('Observable'), `expected rxjs to have 'Observable' defined`);
assert((window as any).Rx.hasOwnProperty('Subject'), `expected rxjs to have 'Subject' defined`);
assert((window as any).Rx.hasOwnProperty('ReplaySubject'), `expected rxjs to have 'ReplaySubject' defined`);

/**
 * gl-matrix cannot be externalized directly for now. A workaround that assumes gl-matrix distribution to be loaded
 * at run-time and maps all its objects to the custom 'glm' namespace, declared for webpack ('gl-matrix' : 'glm') didn't
 * work either. Webpack currently seems to handle empty/global externals incorrectly ('gl-matrix': '' does not work).
 */

// ['vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4', 'mat2d', 'quat'].forEach((property) =>
//     assert((window as any).hasOwnProperty(property), `expected '${property}' to be defined globally`));
