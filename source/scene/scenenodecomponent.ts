

/**
 * @todo add description
 */
export class SceneNodeComponent {

    /** @see {@link type} */
    protected _type: string;


    constructor(type: string) {
        this._type = type;

        /** @todo ... */
    }


    /**
     * @todo comment
     */
    get type(): string {
        return this._type;
    }

}
