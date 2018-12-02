
var canvas;
var context;
var renderer;

window.onload = function () {
    new Clipboard('.btn-clipboard');

    const demo = new CubescapeDemo();
    demo.initialize('showcase')

    canvas = demo.canvas;
    context = demo.canvas.context;
    renderer = demo.renderer;

    aboutCode = window.document.getElementById('context-about');
    aboutCode.innerText = context.aboutString();
};
