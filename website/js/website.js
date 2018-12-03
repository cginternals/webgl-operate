
var canvas;
var context;
var renderer;

function clipboard() {
    new Clipboard('.btn-clipboard');
}

function demo(demo, element) {
    demo.initialize(element)

    canvas = demo.canvas;
    context = demo.canvas.context;
    renderer = demo.renderer;
}

function about() {
    aboutCode = window.document.getElementById('context-about');
    aboutCode.innerText = context.aboutString();
}
