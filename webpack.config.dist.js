
rxjsExternals = require('webpack-rxjs-externals');

module.exports = require('./webpack.config');

module.exports.cache = false;
module.exports.entry = {
    '../dist/webgl-operate': ['webgl-operate.ts'],
    '../dist/webgl-operate.slim': ['webgl-operate.slim.ts'],
};

module.exports.module.rules[0].use = {
    loader: 'ts-loader',
    options: {
        compilerOptions: {
            removeComments: true
        }
    }
};

module.exports.externals = [rxjsExternals()];

module.exports.plugins[0].definitions = {
    DISABLE_ASSERTIONS: JSON.stringify(false),
    LOG_VERBOSITY_THRESHOLD: JSON.stringify(1),
};

if (process.env.ANALYZE) {
    const analyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    module.exports.plugins.push(new analyzer());
}
