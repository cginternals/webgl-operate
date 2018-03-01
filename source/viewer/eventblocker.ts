
interface HTMLEventListener { (event: Event): boolean; }


namespace viewer {

    /**
     * Auxiliary class for blocking and unblocking events on a HTML element. Example for blocking the contextmenu:
     * ```
     * blocker = new gloperate.EventBlocker(element);
     * blocker.block('contextmenu');
     * ```
     */
    export class EventBlocker {

        /**
         * Lookup table for blocked events and their listener.
         */
        private _blockListenerByEvent = new Map<string, HTMLEventListener>();

        /**
         * Element associated to this blocker.
         */
        protected _element: HTMLElement;

        /**
         * Creates an event blocker instance associated to a specific HTML element.
         * @param element - Element that is to be associated with this blocker for block und unblock.
         * @param events - Optional events that are blocked immediately.
         */
        constructor(element: HTMLElement, events?: Array<string>) {
            this._element = element;
            if (events === undefined) {
                return;
            }
            for (const event of events) {
                this.block(event);
            }
        }

        /**
         * Blocks a specific event by adding a listener the prevents the default and stops propagation.
         * @param eventIdentifier - Event identifier that is to be blocked, e.g., 'contextmenu'.
         */
        block(eventIdentifier: string): void {
            if (this._blockListenerByEvent.has(eventIdentifier)) {
                return;
            }
            this._blockListenerByEvent.set(eventIdentifier,
                (event): boolean => {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                });
            this._element.addEventListener(eventIdentifier,
                this._blockListenerByEvent.get(eventIdentifier) as HTMLEventListener);
        }

        /**
         * Unblocks a previously blocked event by removing the blocker/listener.
         * @param eventIdentifier - Event identifier that is to be unblocked, e.g., 'contextmenu'.
         */
        unblock(eventIdentifier: string): void {
            if (!this._blockListenerByEvent.has(eventIdentifier)) {
                return;
            }
            this._element.removeEventListener(eventIdentifier,
                this._blockListenerByEvent.get(eventIdentifier) as HTMLEventListener);
            this._blockListenerByEvent.delete(eventIdentifier);
        }

    }

}

export = viewer;
