/**
 * This custom script is used to build/copy website sources for distribution:
 * - copy specific assets such as style sheets or scripts (either 3rd party or custom ones)
 * - compile specific pug templates and render to dist path
 */

const watch = process.argv.indexOf('--watch') > 1;

const fs = require('fs');
const path = require('path');
const pug = require('pug');

const copy = require('./copy.js');

const websiteDir = './website';
const buildDir = './build';

const demosDir = 'demos';
const demos = require(`./${demosDir}/demos.json`);

const examplesDir = 'examples';
const examples = require(`./${examplesDir}/examples.json`);


const assets = [
    [websiteDir, buildDir, ['css/*.css', 'js/*.js', 'img/*.{svg,png,jpg}', 'fonts/*', '*.{svg,png,ico,xml,json}'], [], false],
    // ['./source', buildDir, ['data/{colorbrewer,smithwalt}.json'], [], false],
    ['./node_modules/rxjs/bundles/', `${buildDir}/js`, ['rxjs.umd.min.js', 'rxjs.umd.min.js.map'], [], false],
    // ['./source/data/', `${buildDir}/data`, ['*'], [], false],
    [`./${demosDir}/data/`, `${buildDir}/${demosDir}/data`, ['*'], [], false],
    [`./${examplesDir}/data/`, `${buildDir}/${examplesDir}/data`, ['**'], [], false],
    ['./dist/', `${buildDir}/js`, ['webgl-operate.js*'], [], false],
];


function render(template, target, object, outputDir = '') {
    const src = path.join(websiteDir, template + '.pug');
    const dst = path.join(buildDir, outputDir, target + '.html');
    if (!fs.existsSync(src)) {
        console.log('skipped:', target);
        return;
    }

    const html = pug.renderFile(src, object);
    fs.writeFileSync(dst, html);
    console.log('emitted:', dst);
}


var build_pending = false;

function build() {
    assets.forEach((asset) => copy(asset[0], asset[1], asset[2], asset[3], asset[4]));

    render('index', 'index', { 'demos': demos });
    render('about', 'about');

    demos.forEach((demo) => {
        if (demo.disabled) {
            return;
        }
        render(`./${demosDir}/${demo.target}`, demo.target, { 'demo': demo }, demosDir);
    });

    render('examples', 'index', { 'examples': examples }, examplesDir);

    examples.forEach((example) => {
        if (example.disabled) {
            return;
        }
        render('example', example.target, { 'example': example }, examplesDir);
    });

    build_pending = false;
}


build(); // trigger initial build

function watchdir(paths) {

    const rebuild = function () {
        if (build_pending) {
            return;
        }
        build_pending = true;
        setTimeout(build, 100);
    }

    for (const path of paths) {
        fs.watch(path, { recursive: true }, rebuild);
    }

}

if (watch) {
    watchdir([websiteDir, `./${demosDir}`, `./${examplesDir}`]);
}
