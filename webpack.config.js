
const path = require('path');
const webpack = require('webpack');

module.exports = {
    context: __dirname + '/src',

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
        filename: '[name].js'
    },
    resolve: {
        modules: [__dirname + '/node_modules', __dirname + '/src'],
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                include: /src/,
                exclude: /(example|node_modules)/,
                use: { loader: 'ts-loader' }
            },
            {
                test: /(\.glsl|\.vert|\.frag)$/,
                include: /src\/shaders/,
                use: { loader: 'webpack-glsl-loader' },
            }]
    },
};
