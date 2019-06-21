
import { Context } from '../context';
import { Initializable } from '../initializable';
import { SceneNode } from './scenenode';


/**
 * This is the base class for all render passes that render scenes.
 * A `SceneNode` must be given, which is the root node that will be rendered.
 * All children of this node will be rendered recursively.
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
     * Setter for the scene of this render pass.
     * @param scene - Scene to be rendered
     */
    set scene(scene: SceneNode | undefined) {
        this._scene = scene;
    }

    /**
     * The scene which will be rendered by this pass.
     */
    get scene(): SceneNode | undefined {
        return this._scene;
    }

}
