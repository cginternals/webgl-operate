
var path = require('path');
var webpack = require('webpack');

var createExportObject = require('./webpack.export.js');

module.exports = [
    createExportObject('webgl-operate', false)];
