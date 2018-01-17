const path = require('path');
const webpack = require('webpack');


function createModuleExportObject(target, minimize) {

    var plugins = new Array();
    if (minimize) {
        plugins.push(new webpack.optimize.UglifyJsPlugin({ sourceMap: true }));
    }

    var targetExt = minimize ? '.min.js' : '.js';

    return {
        name: target + targetExt,
        context: __dirname + '/source',

        cache: true,
        devtool: 'sourcemap',
        plugins: plugins,

        entry: {
            main: ['./require.ts', './polyfill.ts', './' + target + '.ts']
        },
        output: {
            path: __dirname + '/dist',
            filename: target + targetExt,
            library: 'gloperate',
        },
        resolve: {
            modules: [__dirname + '/node_modules', __dirname + '/source'],
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    include: /source/,
                    exclude: /(example|node_modules)/,
                    use: { loader: 'ts-loader' }
                },
                {
                    test: /(\.glsl|\.vert|\.frag)$/,
                    include: /source\/shaders/,
                    use: { loader: 'webpack-glsl-loader' },
                }]
        },
    };
};

module.exports = {
    moduleObject: createModuleExportObject
};
