window.onload = function () {
    let canvas = new gloperate.Canvas('about-canvas');
    let title = document.title;
    document.write(`<pre>${canvas.context.aboutString()}</pre>`);
    document.title = title;
}
