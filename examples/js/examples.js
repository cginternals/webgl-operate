
// webglop.Viewer = function () {
//     this.cards = [];
//     this.links = [];
//     this.output = 0;

//     this.configureDebugOutput();
//     this.configureProgress();

//     this.configureCardToggle('settings');
//     this.configureSettings();
//     this.configureCardToggle('internals');
//     this.configureInternals();

//     var fullscreen = $('section#canvas a[href="#full-screen"]');
//     var fullscreen_icon = $('section#canvas a[href="#full-screen"] i');
//     var canvas_element = $('section#canvas');
//     var viewer = this;

//     fullscreen.click(function () {
//         viewer.setCardVisibility(null, false);
//         webglop.Fullscreen.toggle(canvas_element.get(0), function () {
//             canvas_element.toggleClass('fullscreen');
//             fullscreen_icon.toggleClass('icon-resize-full');
//             fullscreen_icon.toggleClass('icon-resize-small');
//         });
//         return false;
//     });

//     return this;
// }

// webglop.Viewer.prototype.setCardVisibility = function (card, visible) {
//     for (i = 0; i < this.cards.length; ++i) {
//         var display = this.cards[i] == card && visible;
//         this.cards[i].display = display ? 'block' : 'none';
//         display ? this.links[i].addClass('active') : this.links[i].removeClass('active');
//     }
// }

// webglop.Viewer.prototype.configureCardToggle = function (identifier) {
//     var link = $('section#canvas a[href="#' + identifier + '"]');
//     var close = $('section#canvas #' + identifier + ' button.close');
//     var card = $('#' + identifier).get(0).style;

//     var viewer = this;
//     link.click(function () {
//         viewer.setCardVisibility(card, card.display != 'block');
//         return false;
//     });
//     close.click(function () {
//         viewer.setCardVisibility(card, false);
//         return false;
//     });

//     this.cards.push(card);
//     this.links.push(link);
// }

// webglop.Viewer.prototype.configureProgress = function () {
//     var progress_element = $('#canvas-progress i');
//     mfCanvas.controller.frameNumberObservable.subscribe(function (frameNumber, frameDuration, multiFrameNumber) {
//         if (frameNumber < 2 || multiFrameNumber == 1 || multiFrameNumber == frameNumber) {
//             progress_element.addClass('fade');
//             return;
//         }
//         var progress = Math.floor(frameNumber / (multiFrameNumber) * 4);
//         var progress_class = 'icon-progress-' + progress;
//         if (progress_element.hasClass(progress_class)) {
//             return;
//         }
//         progress_element.removeClass();
//         progress_element.addClass(progress_class);
//     });
// }

// webglop.Viewer.prototype.configureSettings = function () {

//     // connect frame scale controls

//     var frameScale_select = $('select#frame-scale-select');
//     var frameScale_resetButton = $('button#frame-scale-reset-button');

//     var frameScale_options = $.map(frameScale_select[0].options, function (option) {
//         return parseFloat(option.value);
//     });

//     var frameScale_changed = function (frameScale) {
//         var scale = [Math.round(frameScale[0] * 1000) * 0.001, Math.round(frameScale[1] * 1000) * 0.001];
//         var custom = scale[0] != scale[1] || $.inArray(scale[0], frameScale_options) < 0;
//         frameScale_select.val(custom ? "null" : scale[0].toFixed(3));
//     };
//     frameScale_changed(mfCanvas.frameScale);

//     mfCanvas.frameScaleObservable.subscribe(frameScale_changed);

//     frameScale_select.change(function () {
//         var scale = parseFloat(frameScale_select.val());
//         mfCanvas.frameScale = [scale, scale];
//     });
//     frameScale_resetButton.click(function () {
//         mfCanvas.frameScale = [1.00, 1.00];
//     });


//     // connect multi-frame number controls

//     var quality_select = $('select#quality-select');
//     var quality_resetButton = $('button#quality-reset-button');

//     var accumformat_options = $.map(quality_select[0].options, function (option) {
//         var values = option.value.split(',');
//         return $.trim(values[1]);
//     });
//     var mfnumber_options = $.map(quality_select[0].options, function (option) {
//         var values = option.value.split(',');
//         return parseInt(values[0]);
//     });

//     var quality_changed = function () {
//         var mfnumber = mfCanvas.controller.multiFrameNumber;
//         var accumformat = mfCanvas.accumulationFormat;
//         var idx = $.inArray(mfnumber, mfnumber_options);
//         var custom = idx < 0 || accumformat_options[idx] !== accumformat;
//         quality_select.val(custom ? "null" : mfnumber + ',' + accumformat);
//     };
//     quality_changed();

//     mfCanvas.controller.multiFrameNumberObservable.subscribe(quality_changed);
//     mfCanvas.accumulationFormatObservable.subscribe(quality_changed);

//     quality_select.change(function () {
//         var idx = this.selectedIndex;
//         mfCanvas.controller.multiFrameNumber = mfnumber_options[idx];
//         mfCanvas.accumulationFormat = accumformat_options[idx];
//     });
//     quality_resetButton.click(function () {
//         mfCanvas.controller.multiFrameNumber = mfnumber_options[1];
//         mfCanvas.accumulationFormat = accumformat_options[1];
//     });
// }

// webglop.Viewer.prototype.configureInternals = function () {

//     // connect frame scale controls

//     var debugOutput_select = $('select#debug-output-select');
//     var debugOutput_resetButton = $('button#debug-output-reset-button');

//     var debug_output = [$('#debug-output-1').get(0).style, $('#debug-output-2').get(0).style, $('#debug-output-3').get(0).style];

//     debugOutput_select.change(function () {
//         this.output = parseInt(debugOutput_select.val());
//         debug_output[0].visibility = this.output > 0 ? 'visible' : 'hidden';
//         debug_output[1].visibility = this.output > 1 ? 'visible' : 'hidden';
//         debug_output[2].visibility = this.output > 2 ? 'visible' : 'hidden';
//     });
//     debugOutput_resetButton.click(function () {
//         debugOutput_select.val('0');
//         debug_output[0].visibility = debug_output[1].visibility = debug_output[2].visibility = 'hidden';
//     });

//     var debugTexture_select = $('select#debug-texture-select');
//     var debugTexture_resetButton = $('button#debug-texture-reset-button');

//     var debugTexture_changed = function (index) {
//         debugTexture_select.val(index.toString());
//     };
//     mfCanvas.pipeline.debugTextureObservable.subscribe(debugTexture_changed);

//     var debuggableTextures = mfCanvas.pipeline.debuggableTextures;
//     for (var i = 0; i < debuggableTextures.length; ++i) {
//         debugTexture_select.append($('<option>', { value: i, text: debuggableTextures[i] }));
//     }
//     debugTexture_select.change(function () {
//         mfCanvas.pipeline.debugTexture = parseInt(debugTexture_select.val());
//     });
//     debugTexture_resetButton.click(function () {
//         mfCanvas.pipeline.debugTexture = -1;
//     });
// }

// webglop.Viewer.prototype.configureDebugOutput = function () {

//     // low-verbosity output 

//     var framesPerSecondElement = $('#canvas-debug-fps').get(0);
//     var avgFrameTimeElement = $('#canvas-debug-avg').get(0);
//     var updFrameTimeElement = $('#canvas-debug-upd').get(0);
//     var minFrameTimeElement = $('#canvas-debug-min').get(0);
//     var maxFrameTimeElement = $('#canvas-debug-max').get(0);
//     var ifCountElement = $('#canvas-debug-ifcount').get(0);
//     var mfCountElement = $('#canvas-debug-mfcount').get(0);

//     mfCanvas.controller.frameNumberObservable.subscribe(function (frameNumber, frameDuration, multiFrameNumber) {
//         if (this.output < 0) {
//             return;
//         }
//         framesPerSecondElement.innerText = mfCanvas.controller.framesPerSecond.toFixed(2);
//         avgFrameTimeElement.innerText = mfCanvas.controller.averageFrameTime.toFixed(2);
//         updFrameTimeElement.innerText = mfCanvas.controller.updateFrameTime.toFixed(2);
//         minFrameTimeElement.innerText = mfCanvas.controller.minimumFrameTime.toFixed(2);
//         maxFrameTimeElement.innerText = mfCanvas.controller.maximumFrameTime.toFixed(2);

//         if (this.output < 1) {
//             return;
//         }
//         ifCountElement.innerText = mfCanvas.controller.intermediateFrameCount.toFixed(0);
//         mfCountElement.innerText = mfCanvas.controller.multiFrameCount.toFixed(0);
//     });

//     // medium-verbosity output

//     $('#canvas-debug-api').get(0).innerText = mfCanvas.context.backendString();

//     var accumFormatElement = $('#canvas-debug-accuracy').get(0);
//     accumFormatElement.innerText = mfCanvas.accumulationFormat;
//     mfCanvas.accumulationFormatObservable.subscribe(function (accumulationFormat) {
//         if (this.output < 1) {
//             return;
//         }
//         accumFormatElement.innerText = mfCanvas.accumulationFormat;
//     });

//     var mfnumberElement = $('#canvas-debug-mfnumber').get(0);
//     mfnumberElement.innerText = mfCanvas.controller.multiFrameNumber.toFixed(0);
//     mfCanvas.controller.multiFrameNumberObservable.subscribe(function (multiFrameNumber) {
//         if (this.output < 1) {
//             return;
//         }
//         mfnumberElement.innerText = multiFrameNumber.toFixed(0);
//     });

//     var frameResolutionElements = [
//         $('#canvas-debug-frame-width').get(0),
//         $('#canvas-debug-frame-height').get(0)];
//     frameResolutionElements[0].innerText = mfCanvas.frameSize[0];
//     frameResolutionElements[1].innerText = mfCanvas.frameSize[1];
//     mfCanvas.frameSizeObservable.subscribe(function (frameSize) {
//         if (this.output < 1) {
//             return;
//         }
//         frameResolutionElements[0].innerText = frameSize[0];
//         frameResolutionElements[1].innerText = frameSize[1];
//     });

//     var canvasResolutionElements = [$('#canvas-debug-canvas-width').get(0), $('#canvas-debug-canvas-height').get(0)];
//     canvasResolutionElements[0].innerText = mfCanvas.size[0];
//     canvasResolutionElements[1].innerText = mfCanvas.size[1];
//     mfCanvas.sizeObservable.subscribe(function (canvasSize) {
//         if (this.output < 1) {
//             return;
//         }
//         canvasResolutionElements[0].innerText = canvasSize[0];
//         canvasResolutionElements[1].innerText = canvasSize[1];
//     });

//     // high-verbosity output 

//     var allocatedElement = $('#canvas-debug-allocated').get(0);
//     allocatedElement.innerText = mfCanvas.context.gpuAllocationRegister.bytesToString();
//     mfCanvas.context.gpuAllocationRegister.bytesObservable.subscribe(function (bytes) {
//         if (this.output < 2) {
//             return;
//         }
//         allocatedElement.innerText = mfCanvas.context.gpuAllocationRegister.bytesToString();
//     });

//     $('#canvas-debug-context-1').get(0).innerText = [
//         mfCanvas.context.alpha ? '1' : '0',
//         mfCanvas.context.premultipliedAlpha ? '1' : '0',
//         mfCanvas.context.depth ? '1' : '0',
//         mfCanvas.context.stencil ? '1' : '0'].join(', ');

//     $('#canvas-debug-context-2').get(0).innerText = [
//         mfCanvas.context.antialias ? '1' : '0',
//         mfCanvas.context.failIfMajorPerformanceCaveat ? '1' : '0',
//         mfCanvas.context.preserveDrawingBuffer ? '1' : '0'].join(', ');
// }
