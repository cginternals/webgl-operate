
var canvas;
var context;
var renderer;

window.onload = function () {
    new Clipboard('.btn-clipboard');

    // initialize test canvas
    canvas = new gloperate.Canvas('showcase', { antialias: true });
    context = canvas.context;

    aboutCode = window.document.getElementById('context-about');
    aboutCode.innerText = context.aboutString();

    canvas.controller.multiFrameNumber = 1;
    canvas.frameScale = [1.0, 1.0];
    renderer = new CubescapeRenderer();
    canvas.renderer = renderer;
};
