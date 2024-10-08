
import { auxiliaries } from './auxiliaries';
import assert = auxiliaries.assert;

import { Context } from './context';
import { Framebuffer } from './framebuffer';
import { GaussFilter } from './gaussfilter';
import { Initializable } from './initializable';
import { Renderbuffer } from './renderbuffer';
import { Texture2D } from './texture2d';
import { Wizard } from './wizard';

import { tuples } from './tuples';


export class ShadowPass extends Initializable {

    protected _context: Context;

    protected _shadowType: ShadowPass.ShadowMappingType;
    protected _shadowMapSize: tuples.GLsizei2;
    protected _blurredShadowMapSize: tuples.GLsizei2;

    protected _shadowMapFBO: Framebuffer;
    protected _shadowMapTexture: Texture2D;
    protected _shadowMapRenderbuffer: Renderbuffer;

    protected _gaussFilter: GaussFilter;
    protected _gaussFilterKernelSize: GLsizei = 21;

    protected _intermediateBlurFBO: Framebuffer;
    protected _intermediateBlurTexture: Texture2D;
    protected _blurFBO: Framebuffer;
    protected _blurTexture: Texture2D;

    constructor(context: Context) {
        super();
        this._context = context;
    }

    get shadowMapFBO(): Framebuffer {
        return this._shadowMapFBO;
    }

    get shadowMapTexture(): Texture2D {
        if (this.hasBlur) {
            return this._blurTexture;
        }
        return this._shadowMapTexture;
    }

    get hasBlur(): boolean {
        return this._shadowType !== ShadowPass.ShadowMappingType.HardLinear;
    }

    get blurSize(): GLsizei {
        return this._gaussFilterKernelSize;
    }

    set blurSize(blurSize: GLsizei) {
        if (blurSize === this._gaussFilterKernelSize) {
            return;
        }

        if (this._gaussFilter !== undefined) {
            this._gaussFilter.kernelSize = blurSize;
            this._gaussFilter.standardDeviation = blurSize / 6.0;
        }
        this._gaussFilterKernelSize = blurSize;
    }

    @Initializable.assert_initialized()
    resize(size: tuples.GLsizei2, bind: boolean = true, unbind: boolean = true): void {
        assert(size[0] > 0 && size[1] > 0, 'Size has to be > 0.');
        this._shadowMapSize = size;
        this._shadowMapFBO.resize(this._shadowMapSize[0], this._shadowMapSize[1], bind, unbind);
    }

    @Initializable.assert_initialized()
    resizeBlurTexture(size: tuples.GLsizei2, bind: boolean = true, unbind: boolean = true): void {
        assert(size[0] > 0 && size[1] > 0, 'Size has to be > 0.');
        this._blurredShadowMapSize = size;
        this._intermediateBlurFBO.resize(this._blurredShadowMapSize[0], this._blurredShadowMapSize[1], bind, unbind);
        this._blurFBO.resize(this._blurredShadowMapSize[0], this._blurredShadowMapSize[1], bind, unbind);
    }

    @Initializable.initialize()
    initialize(shadowType: ShadowPass.ShadowMappingType,
        shadowMapSize: tuples.GLsizei2,
        blurredShadowMapSize?: tuples.GLsizei2): boolean {

        assert(shadowMapSize[0] > 0 && shadowMapSize[1] > 0, 'Size has to be > 0.');

        this._shadowType = shadowType;
        this._shadowMapSize = shadowMapSize;

        if (blurredShadowMapSize !== undefined) {
            this._blurredShadowMapSize = blurredShadowMapSize;
        } else {
            this._blurredShadowMapSize = this._shadowMapSize;
        }

        const gl = this._context.gl as WebGLRenderingContext;
        const gl2facade = this._context.gl2facade;

        let format: GLenum = gl.RGBA;
        if (this._context.isWebGL2) {
            const gl2 = this._context.gl as WebGL2RenderingContext;
            switch (this._shadowType) {
                case ShadowPass.ShadowMappingType.HardLinear:
                case ShadowPass.ShadowMappingType.HardExponential:
                    format = gl2.RED;
                    break;
                case ShadowPass.ShadowMappingType.SoftLinear:
                    format = gl2.RG;
                    break;
                case ShadowPass.ShadowMappingType.SoftExponential:
                    format = gl2.RGBA;
                    break;
                default:
                    assert(false, 'Unexpected value for shadowType');
            }
        }

        const [internalFormat, type] = Wizard.queryInternalTextureFormat(this._context, format, Wizard.Precision.float);
        if (this._shadowType !== ShadowPass.ShadowMappingType.HardLinear && type !== gl.FLOAT) {
            auxiliaries.log(auxiliaries.LogLevel.Warning, 'floating point textures are not supported, falling back to HardLinear');
            this._shadowType = ShadowPass.ShadowMappingType.HardLinear;
        }

        let filter: number = gl.LINEAR;
        if (type === gl.FLOAT && !this._context.supportsTextureFloatLinear) {
            filter = gl.NEAREST;
        }
        if (type === gl2facade.HALF_FLOAT && !this._context.supportsTextureHalfFloatLinear) {
            filter = gl.NEAREST;
        }

        // Setup shadow map
        this._shadowMapTexture = new Texture2D(this._context);
        this._shadowMapTexture.initialize(this._shadowMapSize[0], this._shadowMapSize[1],
            internalFormat, format, gl.FLOAT);
        this._shadowMapTexture.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        this._shadowMapTexture.filter(filter, filter);

        this._shadowMapRenderbuffer = new Renderbuffer(this._context);
        this._shadowMapRenderbuffer.initialize(this._shadowMapSize[0], this._shadowMapSize[1], gl.DEPTH_COMPONENT16);

        this._shadowMapFBO = new Framebuffer(this._context);
        this._shadowMapFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._shadowMapTexture]
            , [gl.DEPTH_ATTACHMENT, this._shadowMapRenderbuffer]]);
        this._shadowMapFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
        this._shadowMapFBO.clearDepth(1.0);

        if (this.hasBlur) {
            // Setup GaussFilter
            this._gaussFilter = new GaussFilter(this._context);
            this._gaussFilter.kernelSize = this._gaussFilterKernelSize;
            this._gaussFilter.standardDeviation = this._gaussFilterKernelSize / 6.0;
            this._gaussFilter.initialize();

            // Setup intermediate blur
            this._intermediateBlurTexture = new Texture2D(this._context, 'IntermediateBlurTexture');
            this._intermediateBlurTexture.initialize(
                this._blurredShadowMapSize[0],
                this._blurredShadowMapSize[1],
                internalFormat, format, gl.FLOAT);
            this._intermediateBlurTexture.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
            this._intermediateBlurTexture.filter(filter, filter);

            this._intermediateBlurFBO = new Framebuffer(this._context, 'IntermediateBlurFramebuffer');
            this._intermediateBlurFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._intermediateBlurTexture]]);
            this._intermediateBlurFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
            this._intermediateBlurFBO.clearDepth(1.0);

            // Setup final blur
            this._blurTexture = new Texture2D(this._context, 'BlurTexture');
            this._blurTexture.initialize(
                this._blurredShadowMapSize[0],
                this._blurredShadowMapSize[1],
                internalFormat, format, gl.FLOAT);
            this._blurTexture.wrap(gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
            this._blurTexture.filter(filter, filter);

            this._blurFBO = new Framebuffer(this._context, 'BlurFramebuffer');
            this._blurFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._blurTexture]]);
            this._blurFBO.clearColor([1.0, 1.0, 1.0, 1.0]);
            this._blurFBO.clearDepth(1.0);
        }

        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void {
        this._shadowMapFBO.uninitialize();
        this._shadowMapRenderbuffer.uninitialize();
        this._shadowMapTexture.uninitialize();

        if (this.hasBlur) {
            this._intermediateBlurFBO.uninitialize();
            this._intermediateBlurTexture.uninitialize();

            this._blurFBO.uninitialize();
            this._blurTexture.uninitialize();

            this._gaussFilter.uninitialize();
        }
    }

    @Initializable.assert_initialized()
    frame(callback: () => void): void {
        const gl = this._context.gl;

        gl.viewport(0, 0, this._shadowMapSize[0], this._shadowMapSize[1]);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        this._shadowMapFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        callback();

        gl.disable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        if (this.hasBlur) {
            // Blur the variance shadow map in two passes
            gl.viewport(0, 0, this._intermediateBlurFBO.width, this._intermediateBlurFBO.height);
            this._intermediateBlurFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
            this._gaussFilter.filter(this._shadowMapTexture, GaussFilter.Direction.Horizontal);

            gl.viewport(0, 0, this._blurFBO.width, this._blurFBO.height);
            this._blurFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);
            this._gaussFilter.filter(this._intermediateBlurTexture, GaussFilter.Direction.Vertical);
        }
    }
}

export namespace ShadowPass {

    export enum ShadowMappingType {
        HardLinear = 0,
        SoftLinear = 1,
        HardExponential = 2,
        SoftExponential = 3,
    }

}
