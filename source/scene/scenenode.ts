

import { mat4 } from 'gl-matrix';

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

    /** @see {@link transform} */
    protected _transform: mat4;

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
     * Read-only access to ... @todo comment
     */
    get name(): string {
        return this._name;
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
    get transform(): mat4 {
        return this._transform;
    }

    /**
     * Sets the transformation of the scene node.
     * @param transform - Transformation relative to parent node.
     */
    set transform(transform: mat4) {
        this._transform = transform;
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
