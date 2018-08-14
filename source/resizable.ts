
import { assert, logIf, LogLevel } from './auxiliaries';
import { GLsizei2 } from './tuples';


/**
 * Mixin that incorporates resize event handling. The mixin depends on the global window resize event and forwards any
 * resize event to every existing instance of this class (global tracking).
 */
export abstract class Resizable {

    /**
     * Event identifier for resize event (single point of definition).
     */
    private static readonly EVENT_IDENTIFIER = 'resize';

    /**
     * Array for referencing all instances of resizable.
     */
    private static instances: Array<Resizable> = [];

    /**
     * Resize event availability (cached value).
     */
    private static eventSupported = false;


    /**
     * This function is called when the window is resized (and the event listener was successfully registered). The
     * event is forwarded to each registered resizable object.
     */
    protected static resize(): void {
        assert(Resizable.instances.length > 0, `resize event received without a single resizable registered`);
        Resizable.instances.forEach((item) => item.onResize());
    }

    /* istanbul ignore next */
    /**
     * Retrieves the native width and height of a given element in device pixel (size on screen in physical pixels). If
     * the element is not found, or either window or its device pixel ratio are not defined, a default vec2 is returned.
     * @param element - DOM element to get the width and height in (native) pixel from.
     * @returns - Size of the element in native screen pixels.
     */
    static elementSize(element: HTMLElement): GLsizei2 {
        if (element === undefined || window === undefined || typeof window.devicePixelRatio !== 'number') {
            return [0, 0];
        }

        const scale = window.devicePixelRatio;
        const style = getComputedStyle(element);
        const size: GLsizei2 = [parseInt(style.width as string, 10), parseInt(style.height as string, 10)];

        size[0] = Math.round(size[0] * scale);
        size[1] = Math.round(size[1] * scale);

        return size;
    }


    /**
     * Every instance of resizable is registered in the global list of resizable instances. The first instance, however,
     * triggers the registration of the global window resize event listener.
     */
    constructor() {
        if (Resizable.instances.length === 0) { // initialize once
            const event = `on${Resizable.EVENT_IDENTIFIER}`;
            /* istanbul ignore next */
            Resizable.eventSupported = document && (event in document.documentElement || event in document.body);

            logIf(!Resizable.eventSupported, LogLevel.Warning, `resize event not supported`);
        }
        /* istanbul ignore next */
        if (Resizable.instances.length === 0 && Resizable.eventSupported) {
            window.addEventListener(Resizable.EVENT_IDENTIFIER, this._resizeEventListener);
        }
        Resizable.instances.push(this);
    }

    /* istanbul ignore next */
    protected _resizeEventListener = () => Resizable.resize();

    /**
     * Unregister this instance from the global list of resizable instances. On destruction of the last instance, the
     * resize event handle is removed. Please note that destruction needs to be invoked explicitly.
     */
    protected dispose(): void {
        const i = Resizable.instances.indexOf(this);
        assert(i !== -1, `invalid reference counting of resizable instances`);

        Resizable.instances.splice(i, 1);

        /* istanbul ignore next */
        if (Resizable.instances.length === 0 && Resizable.eventSupported) {
            window.removeEventListener(Resizable.EVENT_IDENTIFIER, this._resizeEventListener);
        }
    }


    /**
     * This function is invoked when a resize event happened.
     */
    protected abstract onResize(): void;

}
