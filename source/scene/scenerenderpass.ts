
import { Context } from '../context';
import { Initializable } from '../initializable';
import { SceneNode } from './scenenode';


/**
 * @todo add description
 */
export abstract class SceneRenderPass extends Initializable {

    /**
     * Context, used to get context information and WebGL API access.
     */
    protected _context: Context;


    /** @see {@link scene} */
    protected _scene: SceneNode | undefined;

    /**
     * @todo comment
     */
    abstract update(): void;

    /**
     * @todo comment
     */
    abstract prepare(): void;

    /**
     * @todo comment
     */
    abstract frame(): void;


    /**
     * @todo comment
     * @param scene - * @todo comment
     */
    set scene(scene: SceneNode | undefined) {
        this._scene = scene;
    }

    /**
     * @todo comment
     */
    get scene(): SceneNode | undefined {
        return this._scene;
    }

}
