
import { auxiliaries } from 'webgl-operate';

import { vec3 } from 'gl-matrix';

import { Scene } from './scene';
import { ShadowKernel } from './shadowkernel';

// tslint:disable:max-classes-per-file

export class Sample {
    public factor: number;

    constructor(factor: number) {
        this.factor = factor;
    }
}

export class DiffuseEnvironmentSample extends Sample { }

export class SpecularEnvironmentSample extends Sample { }

export class LightSample extends Sample {
    public lightIndex: number;
    public eye: vec3;

    constructor(factor: number, lightIndex: number, eye: vec3) {
        super(factor);

        this.lightIndex = lightIndex;
        this.eye = eye;
    }
}

export class SampleManager {

    protected _currentFrame: number;
    protected _scene: Scene;

    protected _multiframeNumber: number;
    protected _lightSampleCount: number;
    protected _environmentSampleCount: number;

    protected _lightQueue: Array<Sample>;
    protected _environmentQueue: Array<Sample>;
    protected _perFrameSamples: Array<Array<Sample>>;

    constructor(scene: Scene, multiframeNumber: number, lightSampleCount: number, environmentSampleCount: number) {
        this._currentFrame = 0;
        this._scene = scene;
        this._multiframeNumber = multiframeNumber;
        this._lightSampleCount = lightSampleCount;
        this._environmentSampleCount = environmentSampleCount;

        auxiliaries.assert(lightSampleCount * this._scene.diskLights.length <= multiframeNumber,
            'Total number of light samples can not be higher than multiframe count.');

        this._lightQueue = new Array<Sample>();
        this._environmentQueue = new Array<Sample>();
        this.generateSampleQueue();
    }

    protected allEmpty(arrays: any[]): boolean {
        let result = true;

        for (const array of arrays) {
            if (array.length > 0) {
                result = false;
                break;
            }
        }

        return result;
    }

    protected mergeArrays(arrays: any[]): Array<Sample> {
        const result = new Array();

        while (!this.allEmpty(arrays)) {
            for (const array of arrays) {
                if (array.length > 0) {
                    result.push(array.shift());
                }
            }
        }

        return result;
    }

    protected distributeSamples(
        samples: Array<Sample>, destination: Array<Array<Sample>>, startIndex: number, endIndex: number): void {

        const numIndices = endIndex - startIndex;
        const framesPerSample = numIndices / samples.length;

        let currentIndex = startIndex;
        for (const sample of samples) {
            const sampleIndex = Math.floor(currentIndex);
            auxiliaries.assert(sampleIndex < destination.length,
                `Index ${sampleIndex} is out of bounds while distributing light samples.`);
            destination[sampleIndex].push(sample);
            currentIndex += framesPerSample;
        }
    }

    protected generateSampleQueue(): void {

        const diffuseSampleCount = Math.round(this._environmentSampleCount / 2);
        const diffuseFactor = this._multiframeNumber / diffuseSampleCount;
        const specularSampleCount = this._environmentSampleCount - diffuseSampleCount;
        const specularFactor = this._multiframeNumber / specularSampleCount;
        const lightFactor = this._multiframeNumber / this._lightSampleCount;

        const diffuseSamples = [];
        const specularSamples = [];

        for (let i = 0; i < diffuseSampleCount; ++i) {
            diffuseSamples.push(new DiffuseEnvironmentSample(diffuseFactor));
        }

        for (let i = 0; i < specularSampleCount; ++i) {
            specularSamples.push(new SpecularEnvironmentSample(specularFactor));
        }

        this._environmentQueue = this.mergeArrays([diffuseSamples, specularSamples]);

        const lightArrays = [];
        let lightIndex = 0;
        for (const light of this._scene.diskLights) {
            const shadowKernel = new ShadowKernel(this._lightSampleCount, light);
            const lightSamples = [];
            for (let i = 0; i < this._lightSampleCount; ++i) {
                const eye = shadowKernel.get(i);
                lightSamples.push(
                    new LightSample(lightFactor, lightIndex, vec3.fromValues(eye[0], eye[1], eye[2])));
            }
            lightArrays.push(lightSamples);
            lightIndex++;
        }

        this._lightQueue = this.mergeArrays(lightArrays);

        /**
         * Distribute light samples over the frames of the multi-frame.
         */
        this._perFrameSamples = [];
        for (let i = 0; i < this._multiframeNumber; ++i) {
            this._perFrameSamples.push([]);
        }

        this.distributeSamples(
            this._lightQueue,
            this._perFrameSamples,
            Math.round(0.3 * this._multiframeNumber),
            this._multiframeNumber - 1);

        this.distributeSamples(
            this._environmentQueue,
            this._perFrameSamples,
            0,
            this._multiframeNumber - 1);
    }

    getNextFrameSamples(): Array<Sample> {
        auxiliaries.assert(this._currentFrame < this._multiframeNumber,
            'Samples can only be generated during a multiframe.');

        const samples = this._perFrameSamples[this._currentFrame];

        this._currentFrame++;
        return samples;
    }
}
