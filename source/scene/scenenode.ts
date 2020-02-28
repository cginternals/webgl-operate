

import { SceneNodeComponent } from './scenenodecomponent';


/**
 * This class describes a node in a scene hierarchy. To render a scene, a renderer can traverse the hierarchy
 * of SceneNodes, while recursively applying the transformations specfied by each node.
 * Every node contains components that describe the contents of the node, e.g. the contained geometry or the
 * applied transformation.
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
     * Constucts a new scene node
     * @param name - The name of the new node
     */
    constructor(name: string) {
        this._name = name;
        this._parent = undefined;
    }


    /**
     * Traverses the node hierarchy starting at this node and applies the given callback to each node.
     * @param callback - Function that will be called for each node in the tree.
     */
    traverse(callback: SceneNode.NodeCallback): void {
        callback(this);

        /* Forwarding traversal. */
        for (const child of this._nodes) {
            child.traverse(callback);
        }
    }


    /**
     * Add a child node to this node.
     * @param node - The child that will be added
     */
    addNode(node: SceneNode): SceneNode {
        node._parent = this;
        this._nodes.push(node);

        return node;
    }

    /**
     * Add a component to this node.
     * @param component - Component to add
     */
    addComponent(component: SceneNodeComponent): SceneNodeComponent {
        this._components.push(component);

        return component;
    }

    /**
     * Find all components of a specfic type that are registered on this node.
     * @param type - @todo Name of component type to search for
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
     * Returns whether this is the root node, i.e. it has no parent.
     */
    get isRoot(): boolean {
        return this._parent === undefined;
    }

}


export namespace SceneNode {

    export interface NodeCallback { (node: SceneNode): void; }

}
