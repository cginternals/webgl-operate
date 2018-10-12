
export * from './webgl-operate.slim';


// /* ADVANCED facilities */

import * as root_properties from './properties';
export import properties = root_properties;

import * as root_fetch from './fetch';
export import fetch = root_fetch;

import * as root_raymath from './raymath';
export import ray_math = root_raymath;

export { FontFace } from './fontface';
export { FontLoader } from './fontloader';
export { GlyphVertex, GlyphVertices } from './glyphvertices';
export { Label } from './label';
export { Position2DLabel } from './position2dlabel';
export { Position3DLabel } from './position3dlabel';
export { LabelGeometry } from './labelgeometry';
export { Text } from './text';
export { Typesetter } from './typesetter';

// /* DEBUG facilities */

import * as debug_TestNavigation from './debug/testnavigation';
import * as debug_TestRenderer from './debug/testrenderer';

export namespace debug {
    export import TestRenderer = debug_TestRenderer.TestRenderer;
    export import TestNavigation = debug_TestNavigation.TestNavigation;
}


/* VIEWER facilities */

import * as viewer_EventBlocker from './viewer/eventblocker';
import * as viewer_Fullscreen from './viewer/fullscreen';

export namespace viewer {
    export import EventBlocker = viewer_EventBlocker.EventBlocker;
    export import Fullscreen = viewer_Fullscreen.Fullscreen;
}


/* DEVELOPMENT facilities (should be none when publishing) */
