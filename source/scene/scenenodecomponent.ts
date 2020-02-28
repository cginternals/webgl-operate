

/**
 * This is the base class for components that can be added to a `SceneNode`.
 */
export abstract class SceneNodeComponent {

    /** @see {@link type} */
    protected _type: string;


    constructor(type: string) {
        this._type = type;
    }

    /**
     * The name of this type of component. This can be used by `SceneNode` to filter specific component types.
     */
    get type(): string {
        return this._type;
    }
}
