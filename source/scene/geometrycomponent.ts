
import { SceneNodeComponent } from './scenenodecomponent';

import { Geometry } from '../geometry';
import { Material } from './material';

/**
 * This component specifies the geometry contained in a `SceneNode`.
 * Multiple of these components can be present in a single `SceneNode`.
 */
export class GeometryComponent extends SceneNodeComponent {

    protected _geometry: Geometry;
    protected _material: Material;

    constructor() {
        super('GeometryComponent');
    }

    set geometry(geometry: Geometry) {
        this._geometry = geometry;
    }

    get geometry(): Geometry {
        return this._geometry;
    }

    set material(material: Material) {
        this._material = material;
    }

    get material(): Material {
        return this._material;
    }
}
