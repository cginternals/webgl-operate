
var canvas;
var context;
var renderer;

$(document).ready(function () {
    new Clipboard('.btn-clipboard');

    // initialize test canvas
    canvas = new gloperate.Canvas('test-canvas');
    context = canvas.context;
    renderer = new gloperate.debug.TestRenderer();
    canvas.renderer = renderer;
});
