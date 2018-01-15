
var path = require('path');
var webpack = require('webpack');

function createExportObject(target, minimize) {

    var uglify = minimize ? [new webpack.optimize.UglifyJsPlugin({ sourceMap: true })] : [];
    var targetExt = minimize ? '.min.js' : '.js';

    return {
        context: __dirname + '/source/',
        cache: true,
        entry: {
            main: ['./require.ts', './polyfill.ts', './' + target + '.ts']
        },

        output: {
            path: __dirname + '/dist/js',
            filename: target + targetExt,
            library: 'gloperate',
        },

        name: target + targetExt,

        resolve: {
            modules: ['node_modules', 'source'],
            extensions: ['.ts', '.js']
        },

        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    include: /source/,
                    exclude: /(node_modules|source\-todo)/,
                    use: { loader: 'ts-loader' }
                },
                {
                    test: /(\.glsl|\.vert|\.frag)$/,
                    use: { loader: 'webpack-glsl-loader' },
                }]
        },

        devtool: 'sourcemap',

        plugins: uglify
    };
};

module.exports = createExportObject;
