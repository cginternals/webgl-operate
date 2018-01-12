
var path = require('path');
var webpack = require('webpack');

var createExportObject = require('./webpack.export.js');

module.exports = [
  createExportObject('webgl-operate', false),
  createExportObject('webgl-operate', true),
  createExportObject('webgl-operate.slim', false),
  createExportObject('webgl-operate.slim', true)];
