
interface FramePrepareCallback { (frame: number, framesForWarmup: number, framesPerRun: number, cycle: number): void; }
interface RunsFinishedCallback { (cycles: number, framesForWarmup: number, framesPerRun: number, results: Array<number>): void; }


export class Benchmark {

    protected _running = false;

    protected _results: Array<number> = new Array<number>();

    protected _frames: number;

    protected _runs: number;
    protected _framesPerCycle: number;
    protected _framesForWarmup: number;

    protected _framePrepare: FramePrepareCallback | undefined = undefined;
    protected _runsFinished: RunsFinishedCallback | undefined = undefined;


    initialize(cycles: number, framesForWarmup: number, framesPerRun: number,
        framePrepare: FramePrepareCallback, runsFinished: RunsFinishedCallback): void {

        if(this._running) {
            console.log('benchmark already in progress');
            return;
        }

        this._framePrepare = framePrepare;
        this._runsFinished = runsFinished;


        this._running = true;

        this._frames = 0;

        this._runs = Math.max(0, cycles);
        this._framesForWarmup = Math.max(0, framesForWarmup);
        this._framesPerCycle = Math.max(1, framesPerRun);

        this._results.length = this._runs;
        this._results.fill(0.0);
    }

    frame(): void {
        
        if (this._running === false) {
            return;
        }
        ++this._frames;

        const frames: number = this._frames - this._framesForWarmup;
        const frame: number =  frames < 0 ? frames : frames % this._framesPerCycle;

        const cycle: number = frames >= 0 ? Math.floor(frames / this._framesPerCycle) : -1;

        if (frames === 1 - this._framesForWarmup) {
            console.log('---- benchmark warmup ------');
        }
        if (frames === 0) {
            console.log('---- benchmark started -----');
        }

        if ((frames % this._framesPerCycle) === 0 && cycle > 0) {
            this._results[cycle - 1] = (performance.now() - this._results[cycle - 1]) / this._framesPerCycle;
            console.log(' --  cycle: ' + cycle.toString().padStart(2, '0') + ', fps: ' + this._results[cycle - 1].toFixed(4).padStart(9, '0'));
        }

        if ((frames % this._framesPerCycle) === 0 && cycle >= 0 && cycle < this._runs) {
            this._results[cycle] = performance.now();
        }


        if (cycle >= this._runs) {

            this._running = false;
            console.log('---- benchmark stopped -----');

            this._framePrepare = undefined;

            this._runsFinished!(this._runs, this._framesForWarmup, this._framesPerCycle, this._results);
            this._runsFinished = undefined;
            
        } else {

            this._framePrepare!(frame, this._framesForWarmup, this._framesPerCycle, cycle);

        }
    }

    get running(): boolean {
        return this._running;
    }

}
