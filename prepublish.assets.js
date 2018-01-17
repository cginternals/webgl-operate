/**
 * This custom script is used to copy all assets from source to lib distribution. Please not that this is only required
 * for publishing this module as npm package. For distribution, webpack bundles all required assets.
 */

// const watch = process.argv.indexOf('--watch') > 1;

const fs = require('fs');
const glob = require("glob")
const path = require('path');

const baseDir = './source';
const distDir = './lib';

const assets = ['**/*.{json,glsl,frag,vert}'];

function build() {

    assets.forEach(asset => {

        glob(asset, { cwd: baseDir, strict: true }, function (error, files) {
            files.forEach(file => {
                const src = path.join(baseDir, file);
                const dst = path.join(distDir, file);
                if (!fs.existsSync(path.dirname(dst))) {
                    fs.mkdirSync(path.dirname(dst));
                }
                fs.createReadStream(src).pipe(fs.createWriteStream(dst));
                console.log('emitted:', dst);
            });
        })
    });

}

// if (watch) {
//     const watcher = fs.watch(baseDir, { recursive: true }, build());
//     watcher.close();
// } else {
build();
// }

