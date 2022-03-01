const glob = require('glob');
const path = require('path');
const webpack = require('webpack');

// Create named entries for each example.
let entries = {};
for (const entry of glob.sync('./examples/*[!example]*.ts')) {
    entries[path.parse(entry).name] = entry.replace('./examples/', './');
}

module.exports = {

    context: __dirname + '/examples',
    cache: false,
    entry: entries,
    devtool: 'source-map',
    output: {
        path: __dirname + '/build/examples',
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
                include: /(examples|dist)/,
                exclude: /(source|test|demos|website|node_modules)/,
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
