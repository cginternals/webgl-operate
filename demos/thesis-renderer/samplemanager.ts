
import { auxiliaries } from 'webgl-operate';

import { vec3 } from 'gl-matrix';

import { Scene } from './scene';
import { ShadowKernel } from './shadowkernel';

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

        auxiliaries.assert(lightSampleCount * this._scene.diskLights.length <= multiframeNumber, 'Total number of light samples can not be higher than multiframe count.');

        this._lightQueue = new Array<Sample>();
        this._environmentQueue = new Array<Sample>();
        this.generateSampleQueue();
    }

    protected generateSampleQueue(): void {
        // since there are two types of samples wo multiply by two
        const environmentFactor = 2.0 * this._multiframeNumber / this._environmentSampleCount;
        const lightFactor = this._multiframeNumber / this._lightSampleCount;

        for (let i = 0; i < this._environmentSampleCount; ++i) {
            this._environmentQueue.push(new DiffuseEnvironmentSample(environmentFactor));
            this._environmentQueue.push(new SpecularEnvironmentSample(environmentFactor));
        }

        let lightIndex = 0;
        for (const light of this._scene.diskLights) {
            const shadowKernel = new ShadowKernel(this._lightSampleCount, light);
            for (let i = 0; i < this._lightSampleCount; ++i) {
                const eye = shadowKernel.get(i);
                this._lightQueue.push(new LightSample(lightFactor, lightIndex, vec3.fromValues(eye[0], eye[1], eye[2])));
            }
            lightIndex++;
        }
    }

    getNextFrameSamples(): Array<Sample> {
        auxiliaries.assert(this._currentFrame < this._multiframeNumber, 'Samples can only be generated during a multiframe.');

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

        auxiliaries.assert(lightSamplesPerFrame <= 1, 'There can not be more than one sample per frame left in the queue.');

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
            }
            else {
                if (this._lightQueue.length > 0) {
                    samples.push(this._lightQueue.shift()!);
                }
            }
        }

        this._currentFrame++;
        return samples;
    }
}
