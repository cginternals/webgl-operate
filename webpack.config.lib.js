
module.exports = require('./webpack.config');

module.exports.cache = false;
module.exports.entry = {
    '../lib/webgl-operate': ['externals.ts', 'require.ts', 'polyfill.ts', 'webgl-operate.ts']
};

module.exports.module.rules[0].use = {
    loader: 'ts-loader',
    options: {
        compilerOptions: {
            declaration: true,
            removeComments: false
        }
    }
};

module.exports.output.library = undefined;
module.exports.output.libraryTarget = 'commonjs2';

module.exports.plugins[0].definitions = {
    DISABLE_ASSERTIONS: JSON.stringify(false),
    LOG_VERBOSITY_THRESHOLD: JSON.stringify(1),
};
