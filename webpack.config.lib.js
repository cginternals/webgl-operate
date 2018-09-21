
module.exports = (env, options) => {

    const config = require('./webpack.config');

    config.cache = false;
    config.output.path = __dirname + '/lib';
    config.entry = {
        'webgl-operate': ['require.ts', 'webgl-operate.ts']
    };

    config.module.rules[0].use.options.compilerOptions.noUnusedLocals = true;
    config.module.rules[0].use.options.compilerOptions.declaration = true;
    config.module.rules[0].use.options.compilerOptions.removeComments = false;

    config.output.library = undefined;
    config.output.libraryTarget = 'commonjs2';

    // DISABLE_ASSERTIONS: JSON.stringify(options.mode === 'development'),
    config.plugins[0].definitions.DISABLE_ASSERTIONS = JSON.stringify(false);
    // Log verbosity levels: debug = 3, info = 2, warn = 1, error = 0
    config.plugins[0].definitions.LOG_VERBOSITY_THRESHOLD = JSON.stringify(options.mode === 'development' ? 3 : 2);

    return config;
};
