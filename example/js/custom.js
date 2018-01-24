
var canvas;
var context;

$(document).ready(function () {
    new Clipboard('.btn-clipboard');

    // initialize test canvas
    canvas = document.getElementById('test-canvas');
    context = gloperate.Context.request(canvas);
    context.gl.clearColor(0.203, 0.227, 0.250, 1.0);
    context.gl.clear(context.gl.COLOR_BUFFER_BIT);
});
