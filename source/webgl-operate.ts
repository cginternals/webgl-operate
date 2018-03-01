
export * from './webgl-operate.slim';

/* DEBUG facilities */

import * as debug_TestRenderer from './debug/testrenderer';

export namespace debug {
    export import TestRenderer = debug_TestRenderer.TestRenderer;
}


/* VIEWER facilities */

import * as viewer_EventBlocker from './viewer/eventblocker';
import * as viewer_Fullscreen from './viewer/fullscreen';

export namespace viewer {
    export import EventBlocker = viewer_EventBlocker.EventBlocker;
    export import Fullscreen = viewer_Fullscreen.Fullscreen;
}


/* DEVELOPMENT facilities (should be none when publishing) */
