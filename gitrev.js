
var git = require('git-rev')
var fs = require('fs')

git.long(function (git_long) {
  fs.writeFileSync('_data/gitrev.yml', 'revision : ' + git_long);
});
