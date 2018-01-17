/**
 * This custom script is used to copy all assets from source to lib distribution. Please not that this is only required
 * for publishing this module as npm package. For distribution, webpack bundles all required assets.
 */

const copy = require('./copy.js');
copy('./source', './lib', ['**/*.{json,glsl,frag,vert}']);
