!function(e,n){if("object"==typeof exports&&"object"==typeof module)module.exports=n(require("gloperate"));else if("function"==typeof define&&define.amd)define(["gloperate"],n);else{var i="object"==typeof exports?n(require("gloperate")):n(e.gloperate);for(var t in i)("object"==typeof exports?exports:e)[t]=i[t]}}(self,(function(e){return(()=>{"use strict";var n={558:(e,n,i)=>{Object.defineProperty(n,"__esModule",{value:!0}),n.Example=void 0;const t=i(160);class r extends t.Initializable{showSpinner(){document.getElementsByClassName("spinner").item(0).style.display="inline"}hideSpinner(){document.getElementsByClassName("spinner").item(0).style.display="none"}expose(){window.canvas=this.canvas,window.context=this.canvas.context,window.controller=this.canvas.controller,window.renderer=this.renderer}initialize(e){const n=this.onInitialize(e);return this.renderer.loadingStatus$.subscribe((e=>{e===t.LoadingStatus.Finished?this.hideSpinner():e===t.LoadingStatus.Started&&this.showSpinner()})),this.expose(),n}uninitialize(){this.onUninitialize()}enableFullscreenOnCtrlClick(){const e=this.canvas.element;e.addEventListener("click",(n=>{n.ctrlKey&&t.viewer.Fullscreen.toggle(e)}))}}n.Example=r},160:n=>{n.exports=e}},i={};function t(e){var r=i[e];if(void 0!==r)return r.exports;var a=i[e]={exports:{}};return n[e](a,a.exports,t),a.exports}var r={};return(()=>{var e=r;Object.defineProperty(e,"__esModule",{value:!0}),e.CanvasSizeExample=void 0;const n=t(160),i=t(558);class a extends n.Renderer{constructor(){super(...arguments),this._extensions=!1}onInitialize(e,i){this._defaultFBO=new n.DefaultFramebuffer(this._context,"DefaultFBO"),this._defaultFBO.initialize(),this._defaultFBO.bind();const t=this._context.gl;this._ndcTriangle=new n.NdcFillingTriangle(this._context,"NdcFillingTriangle"),this._ndcTriangle.initialize();const r=new n.Shader(this._context,t.VERTEX_SHADER,"ndcvertices (in-line)");r.initialize(a.SHADER_SOURCE_VERT);const s=new n.Shader(this._context,t.FRAGMENT_SHADER,"pattern (in-line)");return s.initialize(a.SHADER_SOURCE_FRAG),this._program=new n.Program(this._context,"CanvasSizeProgram"),this._program.initialize([r,s],!1),this._program.attribute("a_vertex",this._ndcTriangle.vertexLocation),this._program.link(),this.finishLoading(),!0}onUninitialize(){super.uninitialize(),this._ndcTriangle.uninitialize(),this._program.uninitialize(),this._defaultFBO.uninitialize()}onDiscarded(){this._altered.alter("canvasSize"),this._altered.alter("clearColor"),this._altered.alter("frameSize")}onUpdate(){return this._altered.any}onPrepare(){this._altered.clearColor&&this._defaultFBO.clearColor(this._clearColor),this._altered.reset()}onFrame(){const e=this._context.gl;e.viewport(0,0,this._canvasSize[0],this._canvasSize[1]),this._defaultFBO.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT,!1,!1),this._program.bind(),this._ndcTriangle.bind(),this._ndcTriangle.draw(),this._ndcTriangle.unbind()}}a.SHADER_SOURCE_VERT="precision lowp float;\n\n#if __VERSION__ == 100\n    attribute vec2 a_vertex;\n#else\n    in vec2 a_vertex;\n    #define varying out\n#endif\n\nvarying vec2 v_uv;\n\nvoid main(void)\n{\n    v_uv = a_vertex * 0.5 + 0.5;\n    gl_Position = vec4(a_vertex, 0.0, 1.0);\n}\n",a.SHADER_SOURCE_FRAG="precision highp float;\n\n#if __VERSION__ == 100\n    #define fragColor gl_FragColor\n#else\n    layout(location = 0) out vec4 fragColor;\n    #define varying in\n#endif\n\nvarying vec2 v_uv;\n\nconst float CELL_WIDTH = 1.0 / 64.0;\n\nvoid main(void)\n{\n    vec3 x3 = vec3(gl_FragCoord.x) + vec3(0.0, 1.0, 2.0);\n    vec3 y3 = vec3(gl_FragCoord.y) + vec3(0.0, 1.0, 2.0);\n\n    vec3 x = step(mod(x3, vec3(3.0)), vec3(1.0));\n    vec3 y = step(mod(y3, vec3(3.0)), vec3(1.0));\n\n    float cell = step(mod(gl_FragCoord.x * CELL_WIDTH + floor(gl_FragCoord.y * CELL_WIDTH), 2.0), 1.0);\n    fragColor = vec4(mix(x, y, cell), 1.0);\n}\n";class s extends i.Example{onInitialize(e){return this._canvas=new n.Canvas(e,{antialias:!1}),this._canvas.controller.multiFrameNumber=1,this._canvas.framePrecision=n.Wizard.Precision.byte,this._canvas.frameScale=[1,1],this._renderer=new a,this._canvas.renderer=this._renderer,!0}onUninitialize(){this._canvas.dispose(),this._renderer.uninitialize()}get canvas(){return this._canvas}get renderer(){return this._renderer}}e.CanvasSizeExample=s})(),r})()}));
//# sourceMappingURL=canvassize-example.js.map