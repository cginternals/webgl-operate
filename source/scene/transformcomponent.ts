
import { SceneNodeComponent } from './scenenodecomponent';

import { mat4 } from 'gl-matrix';

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
