
const base = require('./webpack.base.js');
module.exports = [
  base.moduleObject('webgl-operate', false),
  base.moduleObject('webgl-operate', true),
  base.moduleObject('webgl-operate.slim', false),
  base.moduleObject('webgl-operate.slim', true)];
