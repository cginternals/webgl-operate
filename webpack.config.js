
const path = require('path');
const webpack = require('webpack');

var GitRevisionPlugin = require('git-revision-webpack-plugin')
const gitrev = new GitRevisionPlugin();

const rxjsExternals = require('webpack-rxjs-externals');

module.exports = {
    context: __dirname + '/source',
    cache: true,
    entry: { 'webgl-operate': ['polyfill.ts', 'webgl-operate.ts'] },
    devtool: 'source-map',
    plugins: [
        new webpack.DefinePlugin({
            GIT_REV_VERSION: JSON.stringify(gitrev.version()),
            GIT_REV_COMMIT: JSON.stringify(gitrev.commithash()),
            GIT_REV_BRANCH: JSON.stringify(gitrev.branch()),
            DISABLE_ASSERTIONS: JSON.stringify(false),
            LOG_VERBOSITY_THRESHOLD: JSON.stringify(3),
        })
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
                exclude: /(source\/shaders|website|node_modules)/,
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
