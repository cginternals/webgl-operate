
import { SceneNodeComponent } from './scenenodecomponent';

import { mat4 } from 'gl-matrix';

/**
 * This component specified the transformation that a `SceneNode` applies in the scene hierarchy.
 * Renderers should check if this component exists on a given node and apply the transformation in this case.
 * Otherwise no transformation should be applied by a node.
 */
export class TransformComponent extends SceneNodeComponent {

    protected _transform: mat4;

    constructor(transform: mat4) {
        super('TransformComponent');

        this._transform = transform;
    }

    get transform(): mat4 {
        return this._transform;
    }
}
