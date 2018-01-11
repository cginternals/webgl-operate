
var createExportObject = require('./webpack.export.js');

webpack_config = createExportObject('webgl-operate', false);


module.exports = {
    basePath: '',
    frameworks: [
        'jasmine'/*, 'es6-shim' /* es6 shim required for phantom js */
    ],
    files: [
        'test/**/*.test.ts'
    ],
    preprocessors: {
        'source/**/*.ts': ['coverage'],
        'test/**/*.test.ts': ['webpack', 'sourcemap', 'coverage']
    },

    reporters: ['progress', 'coverage'],

    // browsers: ['PhantomJS'],
    browsers: ['Chrome'],
    concurrency: Infinity,
    port: 9876,
    mime: {
        'text/x-typescript': ['ts']
    },

    webpack: {
        module: webpack_config.module,
        resolve: webpack_config.resolve,
    },

    webpackMiddleware: { quiet: true, stats: { colors: true } },

    coverageReporter: { type: 'in-memory' },
};
