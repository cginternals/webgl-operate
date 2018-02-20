
var canvas;
var context;

$(document).ready(function () {
    new Clipboard('.btn-clipboard');

    // initialize test canvas
    canvas = new gloperate.Canvas('test-canvas');
    context = canvas.context;
    context.gl.clearColor(canvas.clearColor.r, canvas.clearColor.g, canvas.clearColor.b, canvas.clearColor.a);
    context.gl.clear(context.gl.COLOR_BUFFER_BIT);
});
