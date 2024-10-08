
const fs = require('fs');
const path = require('path');

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
    cache: false,
    entry: {
        'js/webgl-operate.js': ['polyfill.ts', 'webgl-operate.ts'],
    },
    devtool: 'source-map',
    plugins: [
        new webpack.DefinePlugin(DEFINITIONS)
    ],
    output: {
        path: __dirname + '/build',
        filename: '[name]',
        library: 'webgl-operate',
        libraryTarget: 'umd',
    },
    externals: [
        rxjsExternals()
    ],
    resolve: {
        modules: ['node_modules', path.resolve(__dirname, 'source')],
        extensions: ['.ts', '.tsx', '.js'],
        fallback: { "url": require.resolve("url/") }
    },
    watchOptions: {
        ignored: ['node_modules/**']
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
                            removeComments: true
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
