
var canvas;
var context;
var renderer;

window.onload = function () {
    new Clipboard('.btn-clipboard');

    // initialize test canvas
    canvas = new gloperate.Canvas('test-canvas');
    context = canvas.context;
    canvas.controller.multiFrameNumber = 1024;
    canvas.frameScale = [1.0, 1.0];
    renderer = new gloperate.LabelRenderer();
    canvas.renderer = renderer;
};
