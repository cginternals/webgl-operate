
import * as debug_TestNavigation from './testnavigation';
import * as debug_TestRenderer from './testrenderer';

export namespace debug {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export import TestRenderer = debug_TestRenderer.TestRenderer;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export import TestNavigation = debug_TestNavigation.TestNavigation;
}
