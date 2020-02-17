const path = require('path');
const webpack = require('webpack');

module.exports = {

    context: __dirname + '/demos',
    cache: false,
    entry: {
        'cornell-box': ['cornell-box/cornellbox.ts'],
        'cubescape': ['cubescape/cubescape.ts'],
        'gltf-renderer': ['gltf-renderer/gltfrenderer.ts'],
        'thesis-renderer': ['thesis-renderer/thesisrenderer.ts'],
        'point-cloud': ['point-cloud/point-cloud.ts']
    },
    devtool: 'source-map',
    output: {
        path: __dirname + '/build/demos',
        filename: '[name].js',
        library: undefined,
        libraryTarget: 'umd'
    },
    externals: {
        'webgl-operate': 'gloperate'
    },
    resolve: {
        modules: [__dirname + '/node_modules', __dirname + '/demos', __dirname + '/source'],
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                include: /(demos|dist)/,
                exclude: /(source|test|examples|website|node_modules)/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            declaration: false,
                            noUnusedLocals: true,
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
