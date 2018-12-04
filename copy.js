
const fs = require('fs');
const glob = require('glob');
const path = require('path');

function copy(base, dest, assets, ignore, force) {

    assets.forEach(asset => {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        var files = glob.sync(asset, { cwd: base, strict: true });
        files.forEach(file => {
            if (ignore.indexOf(file) > -1) {
                return;
            }

            const src = path.join(base, file);
            const dst = path.join(dest, file);

            if (!fs.existsSync(path.dirname(dst))) {
                fs.mkdirSync(path.dirname(dst));
            }

            if (force === false && fs.existsSync(dst) && fs.statSync(dst).mtime >= fs.statSync(src).mtime) {
                return;
            }

            if (!fs.lstatSync(src).isDirectory()) {
                fs.copyFileSync(src, dst);

                console.log('emitted:', dst);
            }
        });
    });

}

module.exports = copy;
