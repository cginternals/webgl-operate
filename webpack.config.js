
var path = require('path');
var webpack = require('webpack');
var base = require('./webpack.base.js');

module.exports = [
    base.moduleObject('webgl-operate', false)];
