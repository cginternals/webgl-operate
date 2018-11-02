
import * as debug_LabelRenderer from './labelrenderer';
import * as debug_SceneRenderer from './scenerenderer';
import * as debug_TestNavigation from './testnavigation';
import * as debug_TestRenderer from './testrenderer';

export namespace debug {
    export import LabelRenderer = debug_LabelRenderer.LabelRenderer;
    export import SceneRenderer = debug_SceneRenderer.SceneRenderer;
    export import TestRenderer = debug_TestRenderer.TestRenderer;
    export import TestNavigation = debug_TestNavigation.TestNavigation;
}
