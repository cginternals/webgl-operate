
const path = require('path');
const webpack = require('webpack');

module.exports = {
    context: __dirname + '/source',

    cache: true,
    devtool: 'source-map',
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            minimize: true,
            sourceMap: true,
            include: /\.min\.js$/,
        })
    ],

    entry: {
        'webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts']
    },
    output: {
        path: __dirname + '/dist',
        filename: '[name].js',
        library: 'gloperate',
        libraryTarget: 'umd'

    },
    resolve: {
        modules: [__dirname + '/node_modules', __dirname + '/source'],
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                include: /source/,
                exclude: /(example|node_modules)/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            noUnusedLocals: false,
                            removeComments: true
                        }
                    }
                }
            },
            {
                test: /(\.glsl|\.vert|\.frag)$/,
                include: /source\/shaders/,
                use: { loader: 'webpack-glsl-loader' },
            }]
    },
};
