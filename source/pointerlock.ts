
import { assert } from './auxiliaries';


/**
 * Utility class providing simplified access to the clients pointer lock API.
 */
export class PointerLock {

    /**
     * Cached fullscreenchange event function of the clients specific fullscreen API.
     */
    protected static _event: string;

    /**
     * Callback that is to be triggered within the remove event listener.
     */
    protected static _callback: (() => void) | undefined;

    /**
     * Cached exit call of the clients specific pointer lock API.
     */
    protected static exit: () => void;

    /**
     * Cached request call of the clients specific pointer API.
     */
    protected static request: (element: HTMLElement) => void;

    /**
     * Cached element call returning the fullscreen element specific to the clients fullscreen API.
     */
    protected static element: () => HTMLElement;

    /**
     * Event listener used to add the remove event listener using on indirection, that is, the first fullscreen
     * event triggered after a request is ignored. This is important for triggering the fullscreen callback before
     * the request is completed. The listener adds the removeListener and removes itself as listener.
     */
    protected static addEventListener: EventListener = (): void => {
        window.removeEventListener(PointerLock._event, PointerLock.addEventListener);
        window.addEventListener(PointerLock._event, PointerLock.removeEventListener);
    }

    /**
     * Event listener that is used to account for implicit fullscreen exit events, e.g., user explicitly uses a GUI
     * element for entering fullscreen, but uses ESC to exit fullscreen. The listener triggers the callback provided
     * on toggle and removes itself as listener.
     */
    protected static removeEventListener: EventListener = (): void => {
        if (PointerLock._callback) {
            PointerLock._callback();
            PointerLock._callback = undefined;
        }
        window.removeEventListener(PointerLock._event, PointerLock.removeEventListener);
    }

    /**
     * Query and cache the client specific pointer lock API.
     */
    protected static queryAndCacheAPI(): void {
        if (PointerLock.exit !== undefined) {
            return;
        }

        /**
         * Shadow global document declaration with an untyped one. This is done in order to use vendor specific
         * properties without a compile error.
         */
        const document = window.document as any;

        // Query the API to use.
        const exits = [
            document.exitPointerLock,
            document.mozExitPointerLock,
            document.webkitExitPointerLock,
            undefined];

        let api = 0;
        for (; api < exits.length; ++api) {
            if (exits[api] === undefined) {
                continue;
            }
            break;
        }

        switch (api) {
            case 0: // native
                PointerLock.exit = () => document.exitPointerLock();
                PointerLock.request = (element: HTMLElement) => element.requestPointerLock();
                PointerLock.element = () => document.pointerLockElement;
                PointerLock._event = 'pointerlockchange';
                break;

            case 1: // mozilla
                PointerLock.exit = () => document.mozCancelPointerLock();
                PointerLock.request = (element: HTMLElement) => (element as any).mozRequestPointerLock();
                PointerLock.element = () => document.mozPointerLockElement;
                PointerLock._event = 'mozpointerlockchange';
                break;

            case 2: // webkit
                PointerLock.exit = () => document.webkitExitPointerLock();
                PointerLock.request = (element: HTMLElement) => (element as any).webkitRequestPointerLock();
                PointerLock.element = () => document.webkitPointerLockElement;
                PointerLock._event = 'webkitpointerlockchange';
                break;

            default:
                assert(false, `none of the following pointer lock apis was found: native, moz, or webkit`);
        }
    }


    /**
     * Returns whether or not a pointer lock element exists, indicating if pointer lock is active or not.
     */
    static active(element?: HTMLElement): boolean {
        /* tslint:disable-next-line:no-null-keyword */
        return (element !== undefined && PointerLock.element() === element) || (element === undefined &&
            PointerLock.element() !== undefined && PointerLock.element() !== null);
    }

    /**
     * Requests or exits pointer lock for a given element. If the element is already in pointer lock, it is unlocked
     * /exited. Else, pointer lock is requested. The function considers various platform specific
     * pointer lock interfaces, i.e., native, moz, and webkit.
     *
     * @param element - Element to toggle pointer lock state of.
     */
    static toggle(element: HTMLElement, callback?: () => void): void {
        if (element === undefined) {
            return;
        }
        PointerLock.queryAndCacheAPI();

        if (PointerLock.active() && PointerLock.element() !== element) {
            PointerLock.exit();
        }

        const isPointerLock = PointerLock.active();

        /**
         * The toggle callback is to be triggered first, always. Some browsers do not trigger a reflow when
         * requesting or exiting fullscreen and simultaneously toggling some HTML element classes.
         */
        if (callback) {
            callback();
        }


        if (!isPointerLock) {
            /**
             * Requesting pointer lock and adding the addEL event listener to the pointer lock change always triggers
             * the event listener on pointer lock request or exit. addEL then removes itself and adds the event
             * listener, which in turn triggers the given callback and also removes itself as listener. This is a more
             * solid way to assure single callback execution per toggle.
             */
            PointerLock._callback = callback;
            window.addEventListener(PointerLock._event, PointerLock.addEventListener);

        } else {
            /**
             * If the toggle for exiting pointer lock was made explicitly (not by the browser or indirectly) the
             * event listener is removed here since the callback was already called (above).
             */
            PointerLock._callback = undefined;
            window.removeEventListener(PointerLock._event, PointerLock.removeEventListener);
        }

        isPointerLock ? PointerLock.exit() : PointerLock.request(element);
    }

}
