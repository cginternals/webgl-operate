
import { vec3 } from 'gl-matrix';

import { auxiliaries } from 'webgl-operate';

import {
    Camera,
    Context,
    Canvas,
    DefaultFramebuffer,
    Framebuffer,
    Navigation,
    NdcFillingTriangle,
    Program,
    Renderer,
    Shader,
    MouseEventProvider,
    Texture2D,
    TextureCube,
    Wizard,
    Invalidate,
} from 'webgl-operate';

import { Example } from './example';

// tslint:disable:max-classes-per-file

class EnvironmentProjectionRenderer extends Renderer {

    protected SHADER_SOURCE_VERT =
        `
        precision highp float;

        #if __VERSION__ == 100
            attribute vec2 a_vertex;
        #else
            in vec2 a_vertex;
            #define varying out
        #endif

        uniform mat4 u_viewProjectionInverse;

        varying vec2 v_uv;
        varying vec4 v_ray;

        void main(void)
        {
            v_uv = a_vertex * 0.5 + 0.5;
            v_ray = u_viewProjectionInverse * vec4(a_vertex, 1.0, 1.0);

            gl_Position = vec4(a_vertex.xy, 1.0, 1.0);
        }
        `;

    protected SHADER_SOURCE_FRAG =
        `
        precision highp float;
        precision highp int;

        #if __VERSION__ == 100
            #define fragColor gl_FragColor
        #else
            layout(location = 0) out vec4 fragColor;
            #define varying in
        #endif

        uniform ivec2 u_viewport;
        uniform float u_time;

        uniform int u_mode;

        uniform samplerCube u_cubemap;
        uniform sampler2D u_equirectmap;
        uniform sampler2D u_spheremap;
        uniform sampler2D u_polarmap[2];

        varying vec2 v_uv;
        varying vec4 v_ray;

        const float aspect = 1.0 / 1.0;

        const float PI = 3.141592653589793;
        const float OneOver2PI = 0.1591549430918953357688837633725;
        const float OneOverPI  = 0.3183098861837906715377675267450;

        void main(void)
        {
            vec2 uv = v_uv;

            // fragColor = vec4(vec3(uv.s, uv.t, float(u_mode) * 0.25), 1.0);
            fragColor = vec4(v_ray.xyz * 0.5 + 0.5, 1.0);

            // fragColor = vec4(uv, 0.0, 1.0);
            vec3 ray = normalize(v_ray.xyz);

            // vec3 dx = dFdx(ray);
            // vec3 dy = dFdy(ray);

            // fragColor = texture(u_cubemap, ray);

            // // fragColor = vec4(vec3((abs(dx.x) + abs(dx.y) + abs(dx.z)
            // //     + abs(dy.x) + abs(dy.y) + abs(dy.z)) * 100.0), 1.0);
            // return;

            if(u_mode == 0) {

                fragColor = texture(u_cubemap, vec3(ray));

            } else if (u_mode == 1) {

                float v = acos(ray.y) * OneOverPI;
                //ray.zx = ray.xz;
                //ray.xz = ray.zx;
                //ray.z *= -1.0;
                //ray.x *= -1.0;

                float m = atan(ray.x, ray.z);
                uv = vec2(m * OneOver2PI + 0.5, v);

                fragColor = texture(u_equirectmap, uv);

            } else if (u_mode == 2) {
                // ray.y *= -1.0;
                ray = ray.xzy;
                ray.z += +1.0;
                uv = 0.5 + 0.5 * ray.xy / length(ray);

                fragColor = texture(u_spheremap, uv);

            } else if (u_mode == 3) {

                //ray = ray.zyx;
                ray.y *= -1.0;

                float m = 1.0 + abs(asin(ray.y) * 2.0 / PI);
                uv = 0.5 + 0.5 * ray.xz / m;

                fragColor = mix(texture(u_polarmap[0], uv),
                                texture(u_polarmap[1], vec2(1.0, -1.0) * uv),
                                step(0.0, ray.y));

            }
        }
    `;

    protected _defaultFBO: Framebuffer;

    protected _ndcTriangle: NdcFillingTriangle;
    protected _program: Program;

    protected _cubeMap: TextureCube;
    protected _equiRectangularMap: Texture2D;
    protected _sphereMap: Texture2D;
    protected _polarMaps: Array<Texture2D>;

    protected _camera: Camera;
    protected _navigation: Navigation;

    protected _uViewProjection: WebGLUniformLocation;
    protected _uViewProjectionInverse: WebGLUniformLocation;

    protected _uViewport: WebGLUniformLocation;
    protected _uTime: WebGLUniformLocation;
    protected _uMode: WebGLUniformLocation;

    protected onInitialize(context: Context,
        callback: Invalidate,
        mouseEventProvider: MouseEventProvider | undefined): boolean {

        if (mouseEventProvider === undefined) {
            auxiliaries.log(auxiliaries.LogLevel.Error, 'MouseEventProvider was not supplied.');
            return false;
        }

        this._defaultFBO = new DefaultFramebuffer(this._context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._defaultFBO.bind();

        const gl = this._context.gl;

        this._ndcTriangle = new NdcFillingTriangle(this._context, 'NdcFillingTriangle');
        this._ndcTriangle.initialize();

        this.fetchTextures();

        // Initialize program and uniforms
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'ndcvertices (in-line)');
        vert.initialize(this.SHADER_SOURCE_VERT);

        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'env-projections (in-line)');
        frag.initialize(this.SHADER_SOURCE_FRAG);

        this._program = new Program(this._context, 'EnvProjectionsProgram');
        this._program.initialize([vert, frag], false);

        this._program.attribute('a_vertex', this._ndcTriangle.vertexLocation);
        this._program.link();

        this._program.bind();
        gl.uniform1i(this._program.uniform('u_cubemap'), 0);
        gl.uniform1i(this._program.uniform('u_equirectmap'), 1);
        gl.uniform1i(this._program.uniform('u_spheremap'), 2);
        gl.uniform1iv(this._program.uniform('u_polarmap'), [3, 4]);

        this._uViewProjection = this._program.uniform('u_viewProjection');
        this._uViewProjectionInverse = this._program.uniform('u_viewProjectionInverse');
        this._uViewport = this._program.uniform('u_viewport');
        this._uTime = this._program.uniform('u_time');
        this._uMode = this._program.uniform('u_mode');

        // Initialize camera
        this._camera = new Camera();
        this._camera.eye = vec3.fromValues(0.0, +0.5, +1.0);
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.near = 0.1;
        this._camera.far = 4.0;

        this._navigation = new Navigation(callback, mouseEventProvider!);
        this._navigation.camera = this._camera;

        gl.uniform2iv(this._uViewport, this._canvasSize);

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
        const gl = this._context.gl;

        gl.viewport(0, 0, this._canvasSize[0], this._canvasSize[1]);

        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        this._cubeMap.bind(gl.TEXTURE0);
        this._equiRectangularMap.bind(gl.TEXTURE1);
        this._sphereMap.bind(gl.TEXTURE2);
        this._polarMaps[0].bind(gl.TEXTURE3);
        this._polarMaps[1].bind(gl.TEXTURE4);
        this._program.bind();

        gl.uniform2iv(this._uViewport, this._canvasSize);
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniformMatrix4fv(this._uViewProjectionInverse, gl.GL_FALSE, this._camera.viewProjectionInverse);

        let t = ((new Date()).getTime() % 10000000) * 0.001;
        gl.uniform1f(this._uTime, t);

        this._ndcTriangle.bind();

        const b = 1.0;
        const w = (this._frameSize[0] - (4.0 - 1.0) * b) / 4.0;
        const h = this._frameSize[1];

        gl.enable(gl.SCISSOR_TEST);

        gl.scissor((w + b) * 0.0, 0, w, h);
        gl.uniform1i(this._uMode, 0);
        this._ndcTriangle.draw();

        gl.scissor((w + b) * 1.0, 0, w, h);
        gl.uniform1i(this._uMode, 1);
        this._ndcTriangle.draw();

        gl.scissor((w + b) * 2.0, 0, w, h);
        gl.uniform1i(this._uMode, 2);
        this._ndcTriangle.draw();

        gl.scissor((w + b) * 3.0, 0, w, h);
        gl.uniform1i(this._uMode, 3);
        this._ndcTriangle.draw();

        gl.disable(gl.SCISSOR_TEST);


        this._ndcTriangle.unbind();

        this._program.unbind();
    }

    protected onSwap(): void {
        this.invalidate();
    }

    protected setupTexture2D(texture: Texture2D, unit: number): void {
        const gl = this._context.gl;

        texture.bind(unit);
        // gl.generateMipmap(gl.TEXTURE_2D);

        texture.wrap(gl.REPEAT, gl.REPEAT, false, false);
        texture.filter(gl.NEAREST, gl.NEAREST, false, false);
        this.invalidate(true);
    }

    protected fetchTextures(): void {
        const gl = this._context.gl;

        const internalFormatAndType = Wizard.queryInternalTextureFormat(
            this._context, gl.RGB, Wizard.Precision.byte);


        this._cubeMap = new TextureCube(this._context);
        this._cubeMap.initialize(512, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        this._cubeMap.load({
            positiveX: 'data/cube-map-px.webp', negativeX: 'data/cube-map-nx.webp',
            positiveY: 'data/cube-map-py.webp', negativeY: 'data/cube-map-ny.webp',
            positiveZ: 'data/cube-map-pz.webp', negativeZ: 'data/cube-map-nz.webp',
        }).then(() => {
            const gl = this._context.gl;
            this._cubeMap.filter(gl.NEAREST, gl.NEAREST, true, true);

            this.invalidate(true);
        });


        this._equiRectangularMap = new Texture2D(this._context);
        this._equiRectangularMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        this._equiRectangularMap.fetch('data/equirectangular-map.webp').then(() => {
            this.setupTexture2D(this._equiRectangularMap, gl.TEXTURE1);
        });


        this._sphereMap = new Texture2D(this._context);
        this._sphereMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        this._sphereMap.fetch('data/sphere-map-py.webp').then(() => {
            this.setupTexture2D(this._sphereMap, gl.TEXTURE2);
        });


        this._polarMaps = new Array(2);
        this._polarMaps[0] = new Texture2D(this._context);
        this._polarMaps[0].initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        this._polarMaps[0].fetch('data/paraboloid-map-py.webp').then(() => {
            this.setupTexture2D(this._polarMaps[0], gl.TEXTURE3);
        });


        this._polarMaps[1] = new Texture2D(this._context);
        this._polarMaps[1].initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        this._polarMaps[1].fetch('data/paraboloid-map-ny.webp').then(() => {
            this.setupTexture2D(this._polarMaps[1], gl.TEXTURE4);
        });
    }
}

export class EnvironmentProjectionExample extends Example {

    private _canvas: Canvas;
    private _renderer: EnvironmentProjectionRenderer;

    initialize(element: HTMLCanvasElement | string): boolean {

        this._canvas = new Canvas(element, { antialias: false });
        this._canvas.controller.multiFrameNumber = 1;
        this._canvas.framePrecision = Wizard.Precision.byte;
        this._canvas.frameScale = [1.0, 1.0];

        this._renderer = new EnvironmentProjectionRenderer();
        this._canvas.renderer = this._renderer;

        return true;
    }

    uninitialize(): void {
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
