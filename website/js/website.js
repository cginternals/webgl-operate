
function clipboard() {
    new Clipboard('.btn-clipboard');
}

function demo(demo, element) {
    demo.initialize(element)
    demo.enableFullscreenOnCtrlClick();
}

function example(example, element) {
    example.initialize(element)
    example.enableFullscreenOnCtrlClick();
}

function about() {
    aboutCode = window.document.getElementById('context-about');
    aboutCode.innerText = context.aboutString();
}
