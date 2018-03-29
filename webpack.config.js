
const path = require('path');
const webpack = require('webpack');

module.exports = {

    context: __dirname + '/source',
    cache: true,
    devtool: 'source-map',
    plugins: [],
    entry: {
        'webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts']
    },
    output: {
        path: __dirname + '/build',
        filename: '[name].js',
        library: 'gloperate',
        libraryTarget: 'umd'

    },
    externals: {
        'rxjs': 'Rx'
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
                exclude: /(source\/shaders|website|node_modules)/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
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
