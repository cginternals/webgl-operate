
const path = require('path');
const webpack = require('webpack');

const rxjsExternals = require('webpack-rxjs-externals');


module.exports = {

    context: __dirname + '/source',
    cache: true,
    entry: { 'webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts'] },
    devtool: 'source-map',
    plugins: [
        new webpack.DefinePlugin({
            // DISABLE_ASSERTIONS: JSON.stringify(options.mode === 'development'),
            DISABLE_ASSERTIONS: JSON.stringify(false),
            // Log verbosity levels: Debug = 3, Info = 2, Warning = 1, Error = 0 
            LOG_VERBOSITY_THRESHOLD: JSON.stringify(options.mode === 'development' ? 3 : 2),
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
