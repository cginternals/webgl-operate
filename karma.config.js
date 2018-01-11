
var karma = require('./karma.base.config.js');

karma.watch = false;
karma.singleRun = true;


karma.reporters.push('junit');
karma.junitReporter = {
    outputDir: 'dist/test-results/'
};

karma.coverageReporter = {
    dir: 'dist/test-results/',
    reporters: [
        // reporters not supporting the `file` property 
        /* { type: 'html', subdir: 'coverage' }, // bug https://github.com/webpack-contrib/istanbul-instrumenter-loader/issues/34 */
        { type: 'cobertura', subdir: '.', file: 'coverage.xml' },
        { type: 'text', subdir: '.', file: 'coverage.txt' },
        { type: 'text-summary' }, /** this outputs to console (no file given) */
        { type: 'text-summary', subdir: '.', file: 'coverage-summary.txt', includeAllSources: true }
    ]
};

module.exports = function (config) { config.set(karma); };
