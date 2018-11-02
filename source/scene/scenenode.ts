

import { SceneNodeComponent } from './scenenodecomponent';


/**
 * @todo add description
 */
export class SceneNode {

    /** @see {@link parent} */
    protected _parent: SceneNode | undefined;

    /** @see {@link nodes} */
    protected _nodes = new Array<SceneNode>();

    /** @see {@link component} */
    protected _components = new Array<SceneNodeComponent>();


    /**
     * @todo comment
     * @param parent - @todo comment
     */
    constructor(parent: SceneNode | undefined) {
        this._parent = parent;
    }


    /**
     * @todo comment
     */
    traverse(callback: SceneNode.NodeCallback): void {
        callback(this);

        /* Forwarding traversal. */
        for (const child of this._nodes) {
            child.traverse(callback);
        }
    }


    /**
     * @todo comment
     * @param node - @todo comment
     */
    addNode(node: SceneNode): void {
        this._nodes.push(node);
    }

    /**
     * @todo comment
     * @param component - @todo comment
     */
    addComponent(component: SceneNodeComponent): void {
        this._components.push(component);
    }

    /**
     * @todo comment
     * @param type - @todo comment
     */
    componentsOfType(type: string): Array<SceneNodeComponent> {
        return this._components.filter((component: SceneNodeComponent) => type === component.type);
    }


    /**
     * Read-only access to ... @todo comment
     */
    get parent(): SceneNode | undefined {
        return this._parent;
    }

    /**
     * Read-only access to ... @todo comment
     */
    get nodes(): Array<SceneNode> | undefined {
        return this._nodes;
    }

    /**
     * Read-only access to ... @todo comment
     */
    get components(): Array<SceneNodeComponent> {
        return this._components;
    }


    /**
     * @todo comment
     */
    get isLeaf(): boolean {
        return this._nodes.length === 0;
    }

    /**
     * @todo comment
     */
    get isRoot(): boolean {
        return this._parent === undefined;
    }

}


export namespace SceneNode {

    export interface NodeCallback { (node: SceneNode): void; }

}
