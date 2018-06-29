
import { assert } from '../auxiliaries';


namespace viewer {

    /**
     * Utility class providing simplified access to the clients fullscreen API. The toggle can be used to toggle
     * fullscreen for a HTML element while managing the execution of custom toggle code.
     *
     * ```
     * canvas.element.addEventListener('click', function() { gloperate.viewer.Fullscreen.toggle(canvas.element); });
     * ```
     *
     * Use `:fullscreen` (or `:-moz-full-screen`, `:-webkit-full-screen`, and `:-ms-full-screen`) selectors in order to
     * configure fullscreen specific style. Alternatively, an additional class, e.g., `fullscreen`, could be toggled
     * via callaback.
     */
    export class Fullscreen {

        /**
         * Cached fullscreenchange event function of the clients specific fullscreen API.
         */
        protected static _event: string;

        /**
         * Callback that is to be triggered within the remove event listener.
         */
        protected static _callback: (() => void) | undefined;

        /**
         * Backup of the element's initial width and height.
         */
        protected static _size: [string, string] = ['0', '0'];

        /**
         * Cached exit call of the clients specific fullscreen API.
         */
        protected static _exit: () => void;

        /**
         * Cached request call of the clients specific fullscreen API.
         */
        protected static _request: (element: HTMLElement) => void;

        /**
         * Cached element call returning the fullscreen element specific to the clients fullscreen API.
         */
        protected static _element: () => HTMLElement;

        /**
         * Event listener used to add the remove event listener using on indirection, that is, the first fullscreen
         * event triggered after a request is ignored. This is important for triggering the fullscreen callback before
         * the request is completed. The listener adds the removeListener and removes itself as listener.
         */
        protected static addEventListener: EventListener = (): void => {
            window.removeEventListener(Fullscreen._event, Fullscreen.addEventListener);
            window.addEventListener(Fullscreen._event, Fullscreen.removeEventListener);
        }

        /**
         * Event listener that is used to account for implicit fullscreen exit events, e.g., user explicitly uses a GUI
         * element for entering fullscreen, but uses ESC to exit fullscreen. The listener triggers the callback provided
         * on toggle and removes itself as listener.
         */
        protected static removeEventListener: EventListener = (): void => {
            if (Fullscreen._callback) {
                Fullscreen._callback();
                Fullscreen._callback = undefined;
            }
            window.removeEventListener(Fullscreen._event, Fullscreen.removeEventListener);
        }

        /**
         * Query and cache the client specific fullscreen API.
         */
        protected static queryAndCacheAPI(): void {
            if (Fullscreen._exit !== undefined) {
                return;
            }

            /**
             * Shadow global document declaration with an untyped one. This is done in order to use vendor specific
             * properties without a compile error.
             */
            const document = window.document as any;

            // Query the API to use.
            const exits = [
                document.exitFullScreen,
                document.msExitFullscreen,
                document.mozCancelFullScreen, // notice the capital S for Screen
                document.webkitExitFullscreen,
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
                    Fullscreen._exit = () => document.exitFullScreen();
                    Fullscreen._request = (element: HTMLElement) => element.requestFullscreen();
                    Fullscreen._element = () => document.fullscreenElement;
                    Fullscreen._event = 'fullscreenchange';
                    break;

                case 1: // microsoft
                    Fullscreen._exit = () => document.msExitFullscreen();
                    Fullscreen._request = (element: HTMLElement) => (element as any).msRequestFullscreen();
                    Fullscreen._element = () => document.msFullscreenElement;
                    Fullscreen._event = 'msfullscreenchange';
                    break;

                case 2: // mozilla
                    Fullscreen._exit = () => document.mozCancelFullScreen();
                    Fullscreen._request = (element: HTMLElement) => (element as any).mozRequestFullScreen();
                    Fullscreen._element = () => document.mozFullScreenElement;
                    Fullscreen._event = 'mozfullscreenchange';
                    break;

                case 3: // webkit
                    Fullscreen._exit = () => document.webkitExitFullscreen();
                    Fullscreen._request = (element: HTMLElement) => (element as any).webkitRequestFullscreen();
                    Fullscreen._element = () => document.webkitFullscreenElement;
                    Fullscreen._event = 'webkitfullscreenchange';
                    break;

                default:
                    assert(false,
                        `none of the following fullscreen apis was found: native, ms, moz, or webkit`);
            }
        }


        /**
         * Returns whether or not a fullscreen element exists, indicating if fullscreen is active or not.
         */
        static active(): boolean {
            /* tslint:disable-next-line:no-null-keyword */
            return Fullscreen._element() !== undefined && Fullscreen._element() !== null;
        }

        /**
         * Requests or exits fullscreen mode for a given element. If the element is already in fullscreen, fullscreen
         * mode is exited. Else, fullscreen mode is requested. The function considers various platform specific
         * fullscreen interfaces, i.e., native, ms, moz, and webkit.
         * @param element - Element to toggle fullscreen state of.
         */
        static toggle(element: HTMLElement, callback?: () => void): void {
            if (element === undefined) {
                return;
            }
            Fullscreen.queryAndCacheAPI();

            const isFullscreen = Fullscreen.active();

            if (!isFullscreen) {
                /* Backup exact size of the element for restore when exiting fullscreen. */
                const style = getComputedStyle(element);
                Fullscreen._size[0] = style.width as string;
                Fullscreen._size[1] = style.height as string;
            }

            /**
             * The toggle callback is to be triggered first, always. Some browsers do not trigger a reflow when
             * requesting or exiting fullscreen and simultaneously toggling some HTML element classes.
             */
            if (callback) {
                callback();
            }

            if (!isFullscreen) {
                /**
                 * Requesting fullscreen and adding the addEL event listener to the fullscreenchange always triggers the
                 * event listener on fullscreen request or exit. addEL then removes itself and adds the event listener,
                 * which in turn triggers the given callback and also removes itself as listener. This is a solid way to
                 * assure single callback execution per toggle.
                 */
                Fullscreen._callback = callback;
                window.addEventListener(Fullscreen._event, Fullscreen.addEventListener);

            } else {
                /**
                 * If the toggle for exiting fullscreen was made explicitly (not by the browser or indirectly) the
                 * event listener is removed here since the callback was already called (above).
                 */
                Fullscreen._callback = undefined;
                window.removeEventListener(Fullscreen._event, Fullscreen.removeEventListener);

                element.style.width = Fullscreen._size[0];
                element.style.height = Fullscreen._size[1];
            }

            isFullscreen ? Fullscreen._exit() : Fullscreen._request(element);
        }

    }

}

export = viewer;
