
var path = require('path');
var webpack = require('webpack');
var base = require('./webpack.base.js');

module.exports = [
  base.moduleObject('webgl-operate', false, true),
  base.moduleObject('webgl-operate', true, false),
  base.moduleObject('webgl-operate.slim', false, false),
  base.moduleObject('webgl-operate.slim', true, false)];
