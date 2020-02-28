
const fs = require('fs');
const webpack = require('webpack');

// Setup global, additional definitions for the build/configuration.
var DEFINITIONS = {
    DISABLE_ASSERTIONS: JSON.stringify(false),
    LOG_VERBOSITY_THRESHOLD: JSON.stringify(3),
};

// If configured from within a git repository, add revision information to DEFINITIONS.
if (fs.existsSync('.git')) {
    const GitRevisionPlugin = require('git-revision-webpack-plugin')
    const gitrev = new GitRevisionPlugin();

    DEFINITIONS.GIT_REV_VERSION = JSON.stringify(gitrev.version());
    DEFINITIONS.GIT_REV_COMMIT = JSON.stringify(gitrev.commithash());
    DEFINITIONS.GIT_REV_BRANCH = JSON.stringify(gitrev.branch());
}


const rxjsExternals = require('webpack-rxjs-externals');

module.exports = {
    context: __dirname + '/source',
    cache: true,
    entry: {
        'webgl-operate': ['polyfill.ts', 'webgl-operate.ts'],
    },
    devtool: 'source-map',
    plugins: [
        new webpack.DefinePlugin(DEFINITIONS)
    ],
    output: {
        path: __dirname + '/build/js',
        filename: '[name].js',
        library: 'gloperate',
        libraryTarget: 'umd'
    },
    externals: [rxjsExternals()],
    resolve: {
        modules: [__dirname + '/node_modules', __dirname + '/source'],
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                include: /source/,
                exclude: /(source\/shaders|demos|website|node_modules)/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            declaration: false,
                            noUnusedLocals: false,
                            removeComments: false
                        }
                    }
                }
            },
            {
                test: /\.(glsl|vert|frag)$/,
                use: { loader: 'webpack-glsl-loader' },
            }]
    },
};

if (process.env.ANALYZE) {
    const analyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    module.exports.plugins.push(new analyzer());
}
