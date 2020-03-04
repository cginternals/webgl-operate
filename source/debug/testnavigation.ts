
/* spellchecker: disable */

import { EventHandler, EventProvider } from '../eventhandler';
import { Invalidate } from '../renderer';

/* spellchecker: enable */


export class TestNavigation {

    protected _eventHandler: EventHandler;

    protected _altered = false;


    constructor(invalidate: Invalidate, eventProvider: EventProvider) {
        this._eventHandler = new EventHandler(invalidate, eventProvider);
        this._eventHandler.pushMouseEnterHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseEnter(latests, previous));
        this._eventHandler.pushMouseLeaveHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseLeave(latests, previous));
    }

    protected onMouseEnter(latests: Array<MouseEvent>, previous: Array<MouseEvent>): void {
        this._altered = false;
    }

    protected onMouseLeave(latests: Array<MouseEvent>, previous: Array<MouseEvent>): void {
        this._altered = true;
    }

    update(): void {
        this._eventHandler.update();
    }

    reset(): void {
        this._altered = false;
    }

    get altered(): boolean {
        return this._altered;
    }

}
