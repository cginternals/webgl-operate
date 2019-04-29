

import { SceneNodeComponent } from './scenenodecomponent';


/**
 * @todo add description
 */
export class SceneNode {

    /** @see {@link name} */
    protected _name: string;

    /** @see {@link parent} */
    protected _parent: SceneNode | undefined;

    /** @see {@link nodes} */
    protected _nodes = new Array<SceneNode>();

    /** @see {@link components} */
    protected _components = new Array<SceneNodeComponent>();


    /**
     * @todo comment
     * @param parent - @todo comment
     */
    constructor(name: string) {
        this._name = name;
        this._parent = undefined;
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
    addNode(node: SceneNode): SceneNode {
        node._parent = this;
        this._nodes.push(node);

        return node;
    }

    /**
     * @todo comment
     * @param component - @todo comment
     */
    addComponent(component: SceneNodeComponent): SceneNodeComponent {
        this._components.push(component);

        return component;
    }

    /**
     * @todo comment
     * @param type - @todo comment
     */
    componentsOfType(type: string): Array<SceneNodeComponent> {
        return this._components.filter((component: SceneNodeComponent) => type === component.type);
    }


    /**
     * Read-only access to the name of this node.
     */
    get name(): string {
        return this._name;
    }

    /**
     * Read-only access to the parent node of this node if one exists.
     */
    get parent(): SceneNode | undefined {
        return this._parent;
    }

    /**
     * Read-only access to the child nodes of this node.
     */
    get nodes(): Array<SceneNode> | undefined {
        return this._nodes;
    }

    /**
     * Read-only access to the components attached to this node.
     */
    get components(): Array<SceneNodeComponent> {
        return this._components;
    }


    /**
     * Returns whether this node is a leaf, i.e. there are no child nodes attached to it.
     */
    get isLeaf(): boolean {
        return this._nodes.length === 0;
    }

    /**
     * @todo Returns whether this is the root node, i.e. it has no parent.
     */
    get isRoot(): boolean {
        return this._parent === undefined;
    }

}


export namespace SceneNode {

    export interface NodeCallback { (node: SceneNode): void; }

}
