
module.exports = (env, options) => {

    const config = require('./webpack.config');

    config.cache = false;
    config.output.path = __dirname + '/lib';
    config.entry = {
        'webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts']
    };

    config.module.rules[0].use.options.compilerOptions.noUnusedLocals = true;
    config.module.rules[0].use.options.compilerOptions.declaration = true;
    config.module.rules[0].use.options.compilerOptions.removeComments = false;

    config.output.library = undefined;
    config.output.libraryTarget = 'commonjs2';

    return config;
};
