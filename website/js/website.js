
var canvas;
var context;
var renderer;

window.onload = function () {
    new Clipboard('.btn-clipboard');

    // initialize test canvas
    canvas = new gloperate.Canvas('test-canvas');
    context = canvas.context;

    aboutCode = window.document.getElementById('context-about');
    aboutCode.innerText = context.aboutString();

    canvas.controller.multiFrameNumber = 1024;
    canvas.frameScale = [0.2, 0.2];
    renderer = new gloperate.debug.TestRenderer();
    canvas.renderer = renderer;
};
