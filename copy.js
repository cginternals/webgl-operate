
const fs = require('fs');
const glob = require("glob");
const path = require('path');

function copy(base, dest, assets) {

    assets.forEach(asset => {

        glob(asset, { cwd: base, strict: true }, function (error, files) {
            files.forEach(file => {
                const src = path.join(base, file);
                const dst = path.join(dest, file);
                if (!fs.existsSync(path.dirname(dst))) {
                    fs.mkdirSync(path.dirname(dst));
                }
                if(fs.existsSync(dst) && fs.statSync(dst).mtime >= fs.statSync(src).mtime) {
                    return;
                }
                fs.createReadStream(src).pipe(fs.createWriteStream(dst));
                console.log('emitted:', dst);
            });
        });
    });
}

module.exports = copy;
