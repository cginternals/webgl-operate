
const path = require('path');

module.exports = {

    context: __dirname + '/demos',
    cache: false,
    entry: {
        'cornell-box': ['./cornell-box/cornellbox.ts'],
        'cubescape': ['./cubescape/cubescape.ts'],
        'gltf-renderer': ['./gltf-renderer/gltfrenderer.ts'],
        'progressive-lighting': ['./progressive-lighting/progressive-lighting.ts'],
        'eye-tracking': ['./eye-tracking/eyetracking.ts'],
        'point-cloud': ['./point-cloud/point-cloud.ts']
    },
    devtool: 'source-map',
    output: {
        path: __dirname + '/build/demos',
        filename: '[name].js',
        library: undefined,
        libraryTarget: 'umd'
    },
    resolve: {
        modules: ['node_modules', path.resolve(__dirname, "..")],
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
