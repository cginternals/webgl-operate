!function(e,a){if("object"==typeof exports&&"object"==typeof module)module.exports=a(require("gloperate"));else if("function"==typeof define&&define.amd)define(["gloperate"],a);else{var t="object"==typeof exports?a(require("gloperate")):a(e.gloperate);for(var i in t)("object"==typeof exports?exports:e)[i]=t[i]}}(self,(e=>(()=>{"use strict";var a={4558:(e,a,t)=>{Object.defineProperty(a,"__esModule",{value:!0}),a.Example=void 0;const i=t(4160);class s extends i.Initializable{showSpinner(){document.getElementsByClassName("spinner").item(0).style.display="inline"}hideSpinner(){document.getElementsByClassName("spinner").item(0).style.display="none"}expose(){window.canvas=this.canvas,window.context=this.canvas.context,window.controller=this.canvas.controller,window.renderer=this.renderer}initialize(e){const a=this.onInitialize(e);return this.renderer.loadingStatus$.subscribe((e=>{e===i.LoadingStatus.Finished?this.hideSpinner():e===i.LoadingStatus.Started&&this.showSpinner()})),this.expose(),a}uninitialize(){this.onUninitialize()}enableFullscreenOnCtrlClick(){const e=this.canvas.element;e.addEventListener("click",(a=>{a.ctrlKey&&i.viewer.Fullscreen.toggle(e)}))}}a.Example=s},4160:a=>{a.exports=e}},t={};function i(e){var s=t[e];if(void 0!==s)return s.exports;var l=t[e]={exports:{}};return a[e](l,l.exports,i),l.exports}var s={};return(()=>{var e=s;Object.defineProperty(e,"__esModule",{value:!0}),e.ColorLerpExample=void 0;const a=i(4160),t=a.auxiliaries.log,l=a.auxiliaries.LogLevel,n=i(4160),r=i(4558);class o extends n.Renderer{constructor(){super(...arguments),this._extensions=!1}onInitialize(e,a){return this._defaultFBO=new n.DefaultFramebuffer(this._context,"DefaultFBO"),this._defaultFBO.initialize(),this._camera=new n.Camera,this._labelPass=new n.LabelRenderPass(e),this._labelPass.initialize(),this._labelPass.camera=this._camera,this._labelPass.target=this._defaultFBO,this._labelPass.depthMask=!1,n.FontFace.fromFile("./data/opensans2048p160d16.fnt",e).then((e=>{for(const a of this._labelPass.labels)a.fontFace=e;this._fontFace=e,this.updateLabels(),this.finishLoading(),this.invalidate()})).catch((e=>t(l.Error,e))),this.setupScene(),!0}onUninitialize(){super.uninitialize(),this._defaultFBO.uninitialize(),this._labelPass.uninitialize()}onUpdate(){for(const e of this._labelPass.labels)if(e.altered||e.color.altered)return!0;return this._altered.any||this._camera.altered}onPrepare(){this._altered.canvasSize&&(this._camera.aspect=this._canvasSize[0]/this._canvasSize[1],this._camera.viewport=this._canvasSize,this.updateLabels()),this._labelPass.update(),this._altered.reset(),this._camera.altered=!1}onDiscarded(){this._altered.alter("canvasSize"),this._altered.alter("clearColor"),this._altered.alter("frameSize"),this._altered.alter("multiFrameNumber")}onFrame(e){const a=this._context.gl;a.viewport(0,0,this._camera.viewport[0],this._camera.viewport[1]),this._defaultFBO.clear(a.COLOR_BUFFER_BIT|a.DEPTH_BUFFER_BIT,!0,!1),this._labelPass.frame()}setupScene(){this._labelLAB=new n.Position2DLabel(new n.Text("| should be violet-ish |"),n.Label.Type.Static),this._labelGenerated1=new n.Position2DLabel(new n.Text("| generated 0 |"),n.Label.Type.Dynamic),this._labelGenerated2=new n.Position2DLabel(new n.Text("| generated 1 |"),n.Label.Type.Dynamic),this._labelGenerated3=new n.Position2DLabel(new n.Text("| generated 2 |"),n.Label.Type.Dynamic),this._labelGenerated4=new n.Position2DLabel(new n.Text("| generated 3 |"),n.Label.Type.Dynamic),this._labelLinear1=new n.Position2DLabel(new n.Text("| linear 0 |"),n.Label.Type.Dynamic),this._labelLinear2=new n.Position2DLabel(new n.Text("| linear 1 |"),n.Label.Type.Dynamic),this._labelLinear3=new n.Position2DLabel(new n.Text("| linear 2 |"),n.Label.Type.Dynamic),this._labelLinear4=new n.Position2DLabel(new n.Text("| linear 3 |"),n.Label.Type.Dynamic),this._labelLinear5=new n.Position2DLabel(new n.Text("| linear 4 |"),n.Label.Type.Dynamic),this._labelLinear6=new n.Position2DLabel(new n.Text("| linear 5 |"),n.Label.Type.Dynamic),this._labelLinear7=new n.Position2DLabel(new n.Text("| linear 6 |"),n.Label.Type.Dynamic),this._labelLinear8=new n.Position2DLabel(new n.Text("| linear 7 |"),n.Label.Type.Dynamic),this._labelNearest1=new n.Position2DLabel(new n.Text("| nearest 0 |"),n.Label.Type.Dynamic),this._labelNearest2=new n.Position2DLabel(new n.Text("| nearest 1 |"),n.Label.Type.Dynamic),this._labelNearest3=new n.Position2DLabel(new n.Text("| nearest 2 |"),n.Label.Type.Dynamic),this._labelNearest4=new n.Position2DLabel(new n.Text("| nearest 3 |"),n.Label.Type.Dynamic),this._labelNearest5=new n.Position2DLabel(new n.Text("| nearest 4 |"),n.Label.Type.Dynamic),this._labelNearest6=new n.Position2DLabel(new n.Text("| nearest 5 |"),n.Label.Type.Dynamic),this._labelNearest7=new n.Position2DLabel(new n.Text("| nearest 6 |"),n.Label.Type.Dynamic),this._labelNearest8=new n.Position2DLabel(new n.Text("| nearest 7 |"),n.Label.Type.Dynamic);const e=[this._labelGenerated1,this._labelGenerated2,this._labelGenerated3,this._labelGenerated4],a=[this._labelLinear1,this._labelLinear2,this._labelLinear3,this._labelLinear4,this._labelLinear5,this._labelLinear6,this._labelLinear7,this._labelLinear8],i=[this._labelNearest1,this._labelNearest2,this._labelNearest3,this._labelNearest4,this._labelNearest5,this._labelNearest6,this._labelNearest7,this._labelNearest8];this._labelPass.labels=[this._labelLAB,...e,...a,...i];for(const e of this._labelPass.labels)e.fontSize=17,e.fontSizeUnit=n.Label.Unit.Pixel;const s=n.ColorScale.fromArray([255,0,0,255,0,0,255,255],n.ColorScale.ArrayType.RGBA,4,[0,1]);for(const e of s.colors)t(l.Info,`generated color: ${e.rgba}`);this._labelLAB.color=s.lerp(.5,n.Color.Space.LAB);let r=0;for(const a of e)r%=4,a.color.fromRGB(...s.colors[r].rgba),r++;r=0;let o=i.length;s.hint=n.ColorScale.InterpolationHint.Nearest;for(const e of i){const a=s.lerp(r/o,n.Color.Space.LAB);t(l.Info,`lerp (nearest): ${r} ${r/o} ${a.rgba}`),e.color=a,r++}r=0,o=a.length,s.hint=n.ColorScale.InterpolationHint.Linear;for(const e of a){const a=s.lerp(r/o,n.Color.Space.LAB);t(l.Info,`lerp (linear): ${r} ${r/o} ${a.rgba}`),e.color=a,r++}}updateLabels(){this.updateLabelsGenerated(),this.updateLabelsLinear(),this.updateLabelsNearest()}updateLabelsGenerated(){if(!this._labelGenerated1.valid)return;const e=this._canvasSize[1]/3.5,a=1.5*e,t=this._canvasSize[0]-32*n.Label.devicePixelRatio();this._labelGenerated1.position=[.5*-t,a-0*e],this._labelGenerated2.position=[.5*-t,a-1*e],this._labelGenerated3.position=[.5*-t,a-2*e],this._labelGenerated4.position=[.5*-t,a-3*e]}updateLabelsLinear(){if(!this._labelLinear1.valid)return;const e=this._canvasSize[1]/8,a=3.5*e,t=this._canvasSize[0]-32*n.Label.devicePixelRatio();this._labelLinear1.position=[.1*-t,a-0*e],this._labelLinear2.position=[.1*-t,a-1*e],this._labelLinear3.position=[.1*-t,a-2*e],this._labelLinear4.position=[.1*-t,a-3*e],this._labelLinear5.position=[.1*-t,a-4*e],this._labelLinear6.position=[.1*-t,a-5*e],this._labelLinear7.position=[.1*-t,a-6*e],this._labelLinear8.position=[.1*-t,a-7*e]}updateLabelsNearest(){if(!this._labelNearest1.valid)return;const e=this._canvasSize[1]/8,a=3.5*e,t=this._canvasSize[0]-32*n.Label.devicePixelRatio();this._labelNearest1.position=[.3*-t,a-0*e],this._labelNearest2.position=[.3*-t,a-1*e],this._labelNearest3.position=[.3*-t,a-2*e],this._labelNearest4.position=[.3*-t,a-3*e],this._labelNearest5.position=[.3*-t,a-4*e],this._labelNearest6.position=[.3*-t,a-5*e],this._labelNearest7.position=[.3*-t,a-6*e],this._labelNearest8.position=[.3*-t,a-7*e]}}class b extends r.Example{onInitialize(e){return this._canvas=new n.Canvas(e,{antialias:!1}),this._canvas.controller.multiFrameNumber=1,this._canvas.framePrecision=n.Wizard.Precision.byte,this._canvas.frameScale=[1,1],this._canvas.clearColor=new n.Color,this._renderer=new o,this._canvas.renderer=this._renderer,!0}onUninitialize(){this._canvas.dispose(),this._renderer.uninitialize()}get canvas(){return this._canvas}get renderer(){return this._renderer}}e.ColorLerpExample=b})(),s})()));
//# sourceMappingURL=colorlerp-example.js.map