
import { EventHandler } from './eventhandler';
import { MouseEventProvider } from './mouseeventprovider';
import { Navigation } from './navigation';
import { Invalidate } from './renderer';


export class TrackBallNavigation extends Navigation {

    protected _eventHandler: EventHandler;


    constructor(invalidate: Invalidate, mouseEventProvider: MouseEventProvider) {
        super();

        this._eventHandler = new EventHandler(invalidate, mouseEventProvider);
        this._eventHandler.pushMouseMoveHandler(this.onMouseMove);
        this._eventHandler.pushMouseEnterHandler(this.onMouseEnter);
    }

    protected onMouseMove(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        console.log('# move events:', latests.length, previous.length);
    }

    protected onMouseEnter(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        console.log('# enter events:', latests.length, previous.length);
    }

    update() {
        this._eventHandler.update();
    }

}
