
import { EventHandler } from '../eventhandler';
import { MouseEventProvider } from '../mouseeventprovider';
import { Invalidate } from '../renderer';


export class TestNavigation {

    protected _eventHandler: EventHandler;

    protected _altered = false;


    constructor(invalidate: Invalidate, mouseEventProvider: MouseEventProvider) {
        this._eventHandler = new EventHandler(invalidate, mouseEventProvider);
        this._eventHandler.pushMouseEnterHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseEnter(latests, previous));
        this._eventHandler.pushMouseLeaveHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseLeave(latests, previous));
    }

    protected onMouseEnter(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        this._altered = false;
    }

    protected onMouseLeave(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        this._altered = true;
    }

    update() {
        this._eventHandler.update();
    }

    reset() {
        this._altered = false;
    }

    get altered(): boolean {
        return this._altered;
    }

}
