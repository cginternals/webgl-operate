

module.exports = (env, options) => {

    const config = require('./webpack.config');

    config.cache = false;
    config.output.path = __dirname + '/dist';
    config.entry = {
        'webgl-operate': ['require.ts', 'polyfill.ts', 'webgl-operate.ts'],
        'webgl-operate.slim': ['require.ts', 'polyfill.ts', 'webgl-operate.slim.ts'],
    };

    config.module.rules[0].use.options.compilerOptions.noUnusedLocals = true;
    config.module.rules[0].use.options.compilerOptions.declaration = false;
    config.module.rules[0].use.options.compilerOptions.removeComments = true;

    // config.output.library = 'gloperate';
    // config.output.libraryTarget = 'umd';

    if (options.mode == 'production') {
        config.plugins[0].definitions = {
            DISABLE_ASSERTIONS: JSON.stringify(true),
            LOG_VERBOSITY_THRESHOLD: JSON.stringify(0),
        };
    }

    return config;
};
