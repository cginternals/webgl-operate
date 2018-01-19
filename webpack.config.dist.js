
module.exports = require('./webpack.config');

module.exports.entry = {
    'webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts'],
    'webgl-operate.min': ['require.ts', 'polyfill.ts', 'webgl-operate.ts'],
    'webgl-operate.slim': ['require.ts', 'polyfill.ts', 'webgl-operate.slim.ts'],
    'webgl-operate.slim.min': ['require.ts', 'polyfill.ts', 'webgl-operate.slim.ts']
};

module.exports.output.library = 'gloperate';
module.exports.output.libraryTarget = 'umd';
