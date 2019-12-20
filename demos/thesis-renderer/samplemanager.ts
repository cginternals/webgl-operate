
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
    }

    getNextFrameSamples(): Array<Sample> {
        auxiliaries.assert(this._currentFrame < this._multiframeNumber,
            'Samples can only be generated during a multiframe.');

        const samples = new Array<Sample>();

        // In first frame always just evaluate environment lighting
        if (this._currentFrame === 0) {
            samples.push(this._environmentQueue.shift()!);
            samples.push(this._environmentQueue.shift()!);
            this._currentFrame++;
            return samples;
        }

        const remainingFrames = this._multiframeNumber - this._currentFrame;
        const lightSamplesPerFrame = Math.round(this._lightQueue.length / remainingFrames);
        const environmentSamplesPerFrame = Math.round(this._environmentQueue.length / remainingFrames);

        auxiliaries.assert(lightSamplesPerFrame <= 1,
            'There can not be more than one sample per frame left in the queue.');

        // Gather the front samples of the queues
        for (let i = 0; i < lightSamplesPerFrame; ++i) {
            if (this._lightQueue.length === 0) {
                continue;
            }
            samples.push(this._lightQueue.shift()!);
        }

        for (let i = 0; i < environmentSamplesPerFrame; ++i) {
            if (this._environmentQueue.length === 0) {
                continue;
            }
            samples.push(this._environmentQueue.shift()!);
        }

        if (samples.length === 0) {
            if (Math.random() > 0.5) {
                if (this._environmentQueue.length > 0) {
                    samples.push(this._environmentQueue.shift()!);
                }
            } else {
                if (this._lightQueue.length > 0) {
                    samples.push(this._lightQueue.shift()!);
                }
            }
        }

        this._currentFrame++;
        return samples;
    }
}
