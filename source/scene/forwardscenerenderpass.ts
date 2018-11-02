
import { assert } from '../auxiliaries';
import { GLfloat2 } from '../tuples';

import { Camera } from '../camera';
import { ChangeLookup } from '../changelookup';
import { Context } from '../context';
import { Framebuffer } from '../framebuffer';
import { Initializable } from '../initializable';

import { SceneRenderPass } from './scenerenderpass';


/**
 * @todo add description
 */
export class ForwardSceneRenderPass extends SceneRenderPass {

    /**
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        camera: false,
    });

    /** @see {@link target} */
    protected _target: Framebuffer;

    /** @see {@link camera} */
    protected _camera: Camera;

    /** @see {@link ndcOffset} */
    protected _ndcOffset: GLfloat2;


    /**
     * Creates a ...
     * @param context - @todo comment
     */
    constructor(context: Context) {
        super();
        this._context = context;

        /** @todo */
    }


    @Initializable.initialize()
    initialize(): boolean {
        const gl = this._context.gl;

        /** @todo create shaders, programs, fbos, etc. - checkout label render pass for example */

        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void {

        /** @todo create shaders, programs, fbos, etc. - checkout label render pass for example */

    }


    /**
     * @todo comment
     */
    prepare(): void {

        /** @todo prepare for immediate (probably multiple) frame invocations (mostly useful in multi-frame sampling) */

    }


    /**
     * @param override - If enabled, everything will be updated, regardless of tracked alterations.
     */
    @Initializable.assert_initialized()
    update(override: boolean = false): void {
        const gl = this._context.gl;

        /** @todo  checkout label render pass update for reference */

        // this._scene ... from SceneNodeRenderer ...

    }

    /**
     * @todo comment
     */
    @Initializable.assert_initialized()
    frame(): void {
        assert(this._target && this._target.valid, `valid target expected`);
        if (this._scene === undefined) {
            return;
        }

        const gl = this._context.gl;

        const size = this._target.size;
        gl.viewport(0, 0, size[0], size[1]);

        gl.enable(gl.DEPTH_TEST);

        /** @todo implement ... */

        this._target.clear(gl.COLOR_BUFFER_BIT, true, false);


        gl.disable(gl.DEPTH_TEST);
    }


    /**
     * Sets the framebuffer the quads are rendered to.
     * @param target - Framebuffer to render into.
     */
    set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    /**
     * The NDC offset is used for vertex displacement within subpixel space for anti-aliasing over
     * multiple intermediate frames (multi-frame sampling).
     * @param offset - Subpixel offset used for vertex displacement (multi-frame anti-aliasing).
     */
    set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    /**
     * The camera's viewProjection is used for 3D label placement calculation.
     */
    set camera(camera: Camera) {
        this.assertInitialized();
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
        this._altered.alter('camera');
    }

}
