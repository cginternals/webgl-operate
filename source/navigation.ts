
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';

import { Camera } from './camera';
import { Initializable } from './initializable';



export abstract class Navigation extends Initializable {

    protected _element: HTMLElement;

    /** @see {@link camera} */
    protected _camera: Camera;


    /**
     * The camera that is to be modified in response to various events.
     */
    set camera(camera: Camera) {
        this._camera = camera;
    }

}
