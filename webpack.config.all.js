
module.exports = require('./webpack.config');
module.exports.entry = {
    'webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts'],
    'webgl-operate.min': ['require.ts', 'polyfill.ts', 'webgl-operate.ts'],
    'webgl-operate.slim': ['require.ts', 'polyfill.ts', 'webgl-operate.slim.ts'],
    'webgl-operate.slim.min': ['require.ts', 'polyfill.ts', 'webgl-operate.slim.ts'],
    '../lib/webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts']
};

module.exports.module.rules[0].use = {
    loader: 'ts-loader',
    options: { compilerOptions: { declaration: true } }
};
