
import { mat4, vec2, vec3 } from 'gl-matrix';

import { assert } from './common';

import { Camera } from './camera';
import { Initializable } from './initializable';
import { Observable } from './observable';


export interface CoordsAccess { (x: GLint, y: GLint, zInNDC?: number, viewProjectionInverse?: mat4): vec3 | undefined; }
export interface IDAccess { (x: GLint, y: GLint): number; }

/**
 * The interface to a callback that is called if the pipeline is invalidated.
 */
export interface InvalidateCallback { (): void; }


export abstract class Navigation extends Initializable {

    protected _element: HTMLElement;

    protected _camera: Camera;
    set camera(camera: Camera) {
        this._camera = camera;
    }

    protected _coordsAccess: CoordsAccess;
    set coordsAccess(coordsAccess: CoordsAccess) {
        this._coordsAccess = coordsAccess;
    }

    protected _idAccess: IDAccess;
    set idAccess(idAccess: IDAccess) {
        this._idAccess = idAccess;
    }

    protected _touchSupported: boolean;
    protected _mouseMoveEventReceived: boolean;
    protected _touchMoveEventReceived: boolean;

    /**
     * The navigation's invalidation callback. This should usually be setup by the canvas and refer to a function in the
     * canvas's controller, e.g., it should trigger an update within the controller.
     */
    private _invalidateCallback: InvalidateCallback;

    primaryEvent = new Observable<number>();
    secondaryEvent = new Observable<number>();
    auxiliaryEvent = new Observable<number>();
    cameraModificationStart = new Observable();

    protected _mouseListenerByType = new Array<[string, { (event: MouseEvent): void }]>(
        ['mouseenter', (event) => this.onMouseEnter(event)],
        ['mouseleave', (event) => this.onMouseLeave(event)],
        ['mousedown', (event) => {
            this._mouseMoveEventReceived = false;
            this.onMouseDown(event);
        }],
        ['mouseup', (event) => {
            this.onMouseUp(event);
            if (!this._mouseMoveEventReceived) {
                this.onClick(event);
            }
        }],
        ['mousemove', (event) => {
            this._mouseMoveEventReceived = true;
            this.onMouseMove(event);
        }],
    );
    protected _wheelListenerByType = new Array<[string, { (event: WheelEvent): void }]>(
        ['wheel', (event) => this.onWheel(event)],
    );
    protected _touchListenerByType = new Array<[string, { (event: TouchEvent): void }]>(
        ['touchstart', (event) => {
            this._touchMoveEventReceived = false;
            this.onTouchStart(event);
        }],
        ['touchend', (event) => {
            this.onTouchEnd(event);
            if (!this._mouseMoveEventReceived) {
                this.onClick(event);
            }
        }],
        ['touchmove', (event) => {
            this._touchMoveEventReceived = true;
            this.onTouchMove(event);
        }],
        ['touchcancel', (event) => this.onTouchCancel(event)],
    );


    onInitialize(element: HTMLCanvasElement, callback: InvalidateCallback) {
        assert(element !== undefined, `navigation expects a valid canvas element on construction`);
        assert(callback !== undefined, `navigation expects a valid multi-frame update callback on construction`);
        this._element = element;

        this._invalidateCallback = callback;

        const event = 'ontouchstart';
        this._touchSupported = event in document.documentElement || event in document.body;

        for (const eventListener of this._mouseListenerByType) {
            this._element.addEventListener(eventListener[0], eventListener[1]);
        }
        for (const eventListener of this._wheelListenerByType) {
            this._element.addEventListener(eventListener[0], eventListener[1]);
        }

        if (this._touchSupported) {
            for (const eventListener of this._touchListenerByType) {
                this._element.addEventListener(eventListener[0], eventListener[1]);
            }
        }
    }

    onUninitialize() {
        for (const eventListener of this._mouseListenerByType) {
            this._element.removeEventListener(eventListener[0], eventListener[1]);
        }
        for (const eventListener of this._wheelListenerByType) {
            this._element.removeEventListener(eventListener[0], eventListener[1]);
        }

        if (this._touchSupported) {
            for (const eventListener of this._touchListenerByType) {
                this._element.removeEventListener(eventListener[0], eventListener[1]);
            }
        }
    }

    /** @callback InvalidateCallback
     *
     * A callback intended to be invoked whenever the specialized navigation changes the camera and a new multi-frame
     * is required.
     */
    protected invalidate(): void {
        this._invalidateCallback();
    }


    protected invokePrimary(event: MouseEvent | TouchEvent): void {
        const offset = this.offsets(event, false);
        const offsetNormalized = this.offsets(event);
        const id = this._idAccess(offsetNormalized[0][0], offsetNormalized[0][1]);
        this.primaryEvent.changed(id === undefined ? -1 : id, offset[0][0], offset[0][1]);
    }
    protected invokeSecondary(event: MouseEvent | TouchEvent): void {
        const offset = this.offsets(event, false);
        const offsetNormalized = this.offsets(event);
        const id = this._idAccess(offsetNormalized[0][0], offsetNormalized[0][1]);
        this.secondaryEvent.changed(id === undefined ? -1 : id, offset[0][0], offset[0][1]);
    }
    protected invokeAuxiliary(event: MouseEvent | TouchEvent): void {
        const offset = this.offsets(event, false);
        const offsetNormalized = this.offsets(event);
        const id = this._idAccess(offsetNormalized[0][0], offsetNormalized[0][1]);
        this.auxiliaryEvent.changed(id === undefined ? -1 : id, offset[0][0], offset[0][1]);
    }

    /**
     * Returns whether or not the primary mouse button (usually left) is currently pressed.
     *
     * @param event Mouse event to check the primary button status of.
     */
    protected isPrimaryButtonDown(event: MouseEvent, exclusive: boolean = false): boolean {
        const which = event.buttons === undefined ? event.which : event.buttons;
        return exclusive ? which === 1 : (which & 1) > 0;
    }

    /**
     * Returns whether or not the secondary mouse button (usually right) is currently pressed.
     *
     * @param event Mouse event to check the secondary button status of.
     */
    protected isSecondaryButtonDown(event: MouseEvent, exclusive: boolean = false): boolean {
        if (event.buttons === undefined) {
            return exclusive ? event.which === 3 : (event.which & 3) > 0;
        }
        return exclusive ? event.buttons === 2 : (event.buttons & 2) > 0;
    }

    /**
     * Returns whether or not the auxiliary mouse button (usually middle or mouse wheel button) is currently pressed.
     *
     * @param event Mouse event to check the auxiliary button status of.
     */
    protected isAuxiliaryButtonDown(event: MouseEvent, exclusive: boolean = false): boolean {
        if (event.buttons === undefined) {
            return exclusive ? event.which === 2 : (event.which & 2) > 0;
        }
        return exclusive ? event.buttons === 4 : (event.buttons & 4) > 0;
    }


    /**
     * Normalize mouse and touch event coordinates for various browsers.
     *
     * @param event - Mouse or touch event.
     * @param normalize - Whether or not to compute normalized mouse and touch coordinates (offsets).
     *
     * @returns Array of normalized x and y offsets (in case of multiple touches).
     */
    offsets(event: MouseEvent | WheelEvent | TouchEvent, normalize: boolean = true): Array<vec2> {
        const offsets = new Array<vec2>();

        if (event instanceof MouseEvent) {
            const e = event as MouseEvent;
            offsets.push(vec2.fromValues(e.clientX, e.clientY));

        } else if (event instanceof WheelEvent) {
            const e = event as WheelEvent;
            offsets.push(vec2.fromValues(e.clientX, e.clientY));

        } else if (event instanceof TouchEvent) {
            const e = event as TouchEvent;
            /* tslint:disable-next-line:prefer-for-of */
            for (let i = 0; i < e.touches.length; ++i) {
                const touch = e.touches[i];
                offsets.push(vec2.fromValues(touch.clientX, touch.clientY));
            }
        }

        const target = event.target || event.currentTarget || event.srcElement;
        const rect = (target as HTMLElement).getBoundingClientRect();

        for (const offset of offsets) {
            offset[0] = Math.floor(offset[0] - rect.left);
            offset[1] = Math.floor(offset[1] - rect.top);
            if (normalize) {
                vec2.scale(offset, offset, window.devicePixelRatio);
            }
        }
        return offsets;
    }

    /**
     * Pointing device is moved onto the element.
     */
    protected abstract onMouseEnter(event: MouseEvent): void;

    /**
     * Pointing device is moved off the element.
     */
    protected abstract onMouseLeave(event: MouseEvent): void;


    /**
     * Pointing device button is pressed on an element.
     */
    protected abstract onMouseDown(event: MouseEvent): void;

    /**
     * Pointing device button is released on an element.
     */
    protected abstract onMouseUp(event: MouseEvent): void;

    /**
     * Pointing device is moved over an element.
     */
    protected abstract onMouseMove(event: MouseEvent): void;

    /**
     *
     */
    protected abstract onClick(event: MouseEvent | TouchEvent): void;

    /**
     *
     */
    protected abstract onDoubleClick(event: MouseEvent): void;

    /**
     * Touch point is placed on the touch surface.
     */
    protected abstract onTouchStart(event: TouchEvent): void;

    /**
     * Touch point is removed from the touch surface.
     */
    protected abstract onTouchEnd(event: TouchEvent): void;

    /**
     * Touch point is moved along the touch surface.
     */
    protected abstract onTouchMove(event: TouchEvent): void;

    /**
     * Touch point has been disrupted in an implementation-specific manner.
     */
    protected abstract onTouchCancel(event: TouchEvent): void;


    /**
     * Wheel button of a pointing device is rotated in any direction.
     */
    protected abstract onWheel(event: WheelEvent): void;

}
