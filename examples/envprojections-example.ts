
import { vec3 } from 'gl-matrix';

import {
    Camera,
    Canvas,
    Context,
    DefaultFramebuffer,
    EnvironmentRenderingPass,
    EnvironmentTextureType,
    EventProvider,
    Framebuffer,
    Invalidate,
    Navigation,
    Renderer,
    Texture2D,
    TextureCube,
    Wizard,
} from 'webgl-operate';

import { Example } from './example';

// tslint:disable:max-classes-per-file

class EnvironmentProjectionRenderer extends Renderer {

    protected _defaultFBO: Framebuffer;

    protected _environmentRenderingPass: EnvironmentRenderingPass;

    protected _cubeMap: TextureCube;
    protected _equiRectangularMap: Texture2D;
    protected _sphereMap: Texture2D;
    protected _polarMaps: Array<Texture2D>;

    protected _camera: Camera;
    protected _navigation: Navigation;


    protected onInitialize(context: Context, callback: Invalidate, eventProvider: EventProvider): boolean {

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        this.fetchTextures();

        // Initialize camera
        if (this._camera === undefined) {
            this._camera = new Camera();
            this._camera.eye = vec3.fromValues(0.0, 0.5, -1.0);
            this._camera.center = vec3.fromValues(0.0, 0.4, 0.0);
            this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._camera.near = 0.1;
            this._camera.far = 4.0;
        }

        this._navigation = new Navigation(callback, eventProvider);
        this._navigation.camera = this._camera;

        this._environmentRenderingPass = new EnvironmentRenderingPass(this._context);
        this._environmentRenderingPass.initialize();
        this._environmentRenderingPass.camera = this._camera;

        return true;
    }

    protected onUninitialize(): void {
        this._cubeMap.uninitialize();
        this._equiRectangularMap.uninitialize();
        this._sphereMap.uninitialize();

        for (const map of this._polarMaps) {
            map.uninitialize();
        }
    }

    protected onDiscarded(): void {
        this._altered.alter('canvasSize');
    }

    protected onUpdate(): boolean {
        this._navigation.update();
        return this._altered.any || this._camera.altered;
    }

    protected onPrepare(): void {
        if (this._altered.canvasSize) {
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }
        this._altered.reset();
    }

    protected onFrame(/*frameNumber: number*/): void {
        if (this.isLoading) {
            return;
        }

        const gl = this._context.gl;

        gl.viewport(0, 0, this._canvasSize[0], this._canvasSize[1]);

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        const b = 1.0;
        const w = (this._frameSize[0] - (4.0 - 1.0) * b) / 4.0;
        const h = this._frameSize[1];

        gl.enable(gl.SCISSOR_TEST);

        // Sphere Map
        gl.scissor((w + b) * 0.0, 0, w, h);
        this._environmentRenderingPass.environmentTexture = this._sphereMap;
        this._environmentRenderingPass.environmentTextureType = EnvironmentTextureType.SphereMap;
        this._environmentRenderingPass.frame();

        // Equirectangular Map
        gl.scissor((w + b) * 1.0, 0, w, h);
        this._environmentRenderingPass.environmentTexture = this._equiRectangularMap;
        this._environmentRenderingPass.environmentTextureType = EnvironmentTextureType.EquirectangularMap;
        this._environmentRenderingPass.frame();

        // Cube map
        gl.scissor((w + b) * 2.0, 0, w, h);
        this._environmentRenderingPass.environmentTexture = this._cubeMap;
        this._environmentRenderingPass.environmentTextureType = EnvironmentTextureType.CubeMap;
        this._environmentRenderingPass.frame();

        gl.scissor((w + b) * 3.0, 0, w, h);
        this._environmentRenderingPass.environmentTexture = this._polarMaps[0];
        this._environmentRenderingPass.environmentTexture2 = this._polarMaps[1];
        this._environmentRenderingPass.environmentTextureType = EnvironmentTextureType.PolarMap;
        this._environmentRenderingPass.frame();

        gl.disable(gl.SCISSOR_TEST);
    }

    protected onSwap(): void {
        this.invalidate();
    }

    protected setupTexture2D(texture: Texture2D): void {
        const gl = this._context.gl;

        texture.wrap(gl.REPEAT, gl.REPEAT, true, false);
        texture.filter(gl.NEAREST, gl.NEAREST, false, true);

        this.invalidate(true);
    }

    protected fetchTextures(): void {
        const gl = this._context.gl;

        const promises = new Array();

        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGB, Wizard.Precision.byte);

        this._cubeMap = new TextureCube(this._context);
        this._cubeMap.initialize(592, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        this._cubeMap.fetch({
            positiveX: '/examples/data/cube-map-px.jpg', negativeX: '/examples/data/cube-map-nx.jpg',
            positiveY: '/examples/data/cube-map-py.jpg', negativeY: '/examples/data/cube-map-ny.jpg',
            positiveZ: '/examples/data/cube-map-pz.jpg', negativeZ: '/examples/data/cube-map-nz.jpg',
        }).then(() => {
            const gl = this._context.gl;
            this._cubeMap.filter(gl.NEAREST, gl.NEAREST, true, true);

            this.invalidate(true);
        });


        this._equiRectangularMap = new Texture2D(this._context);
        this._equiRectangularMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._equiRectangularMap.fetch('/examples/data/equirectangular-map.jpg').then(() => {
                this.setupTexture2D(this._equiRectangularMap);
            }));


        this._sphereMap = new Texture2D(this._context);
        this._sphereMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._sphereMap.fetch('/examples/data/sphere-map-ny.jpg').then(() => {
                this.setupTexture2D(this._sphereMap);
            }));


        this._polarMaps = new Array(2);
        this._polarMaps[0] = new Texture2D(this._context);
        this._polarMaps[0].initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._polarMaps[0].fetch('/examples/data/paraboloid-map-py.jpg').then(() => {
                this.setupTexture2D(this._polarMaps[0]);
            }));


        this._polarMaps[1] = new Texture2D(this._context);
        this._polarMaps[1].initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        promises.push(
            this._polarMaps[1].fetch('/examples/data/paraboloid-map-ny.jpg').then(() => {
                this.setupTexture2D(this._polarMaps[1]);
            }));

        Promise.all(promises).then(() => {
            this.finishLoading();
        });
    }
}

export class EnvironmentProjectionExample extends Example {

    private _canvas: Canvas;
    private _renderer: EnvironmentProjectionRenderer;

    onInitialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new EnvironmentProjectionRenderer();
        this._canvas.renderer = this._renderer;

        return true;
    }

    onUninitialize(): void {
        this._canvas.dispose();
        (this._renderer as Renderer).uninitialize();
    }

    get canvas(): Canvas {
        return this._canvas;
    }

    get renderer(): EnvironmentProjectionRenderer {
        return this._renderer;
    }

}
