/**
 * This custom script is used to build/copy example sources for distribution:
 * - copy specific assets such as style sheets or scripts (either 3rd party or custom ones)
 * - compile specific pug templates and render to dist path
 */

// const watch = process.argv.indexOf('--watch') > 1;

const fs = require('fs');
const glob = require("glob")
const path = require('path');
const pug = require('pug');

const baseDir = './example';
const distDir = './dist';

const assets = ['css/*.css', 'js/*.js', 'img/*.{svg,png}'];
const entries = ['index.pug'];


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

    entries.forEach((entry) => {
        const src = path.join(baseDir, entry);
        const dst = path.join(distDir, path.basename(entry, path.extname(entry)) + '.html');
        if (!fs.existsSync(src)) {
            console.log('skipped:', entry);
            return;
        }
        const html = pug.renderFile(src);
        fs.writeFileSync(dst, html);
        console.log('emitted:', dst);
    });
};

// if (watch) {
//     const watcher = fs.watch(baseDir, { recursive: true }, build());
//     watcher.close();
// } else {
build();
// }

