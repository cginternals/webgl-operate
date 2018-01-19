
module.exports = require('./webpack.config');

module.exports.entry = {
    '../lib/webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts']
};

module.exports.module.rules[0].use = {
    loader: 'ts-loader',
    options: { compilerOptions: { declaration: true } }
};

module.exports.output.libraryTarget = 'commonjs2';
