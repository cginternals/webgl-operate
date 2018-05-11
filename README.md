<br><a href="https://webgl-operate.org/"><img src="https://raw.githubusercontent.com/cginternals/webgl-operate/master/website/img/webgl-operate-logo.svg?sanitize=true" width="50%"></a>

*webgl-operate* (or *[gloperate](https://github.com/cginternals/gloperate) for WebGL*) is a TypeScript based WebGL rendering framework.

[![npm Version](https://img.shields.io/npm/v/webgl-operate.svg?style=flat)](https://www.npmjs.com/package/webgl-operate)
[![Examples](https://img.shields.io/badge/examples-online-blue.svg?style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMC41IDEzLjciPjxwYXRoIGQ9Ik0xMS41IDYuOGwtMy43IDYuNEwuNS41aDE0LjdsLTEuMyAyLjFINC4yTDcuOCA5bDIuNS00LjN6bTcuMyA0LjNsMS4yIDIuMWgtOS43TDE3LjYuNWwxLjIgMi4xLTQuOSA4LjV6IiBmaWxsPSIjZmZmIi8%2BPC9zdmc%2B)](https://www.webgl-operate.org)
[![Documentation](https://img.shields.io/badge/documentation-online-blue.svg?style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMC41IDEzLjciPjxwYXRoIGQ9Ik0xMS41IDYuOGwtMy43IDYuNEwuNS41aDE0LjdsLTEuMyAyLjFINC4yTDcuOCA5bDIuNS00LjN6bTcuMyA0LjNsMS4yIDIuMWgtOS43TDE3LjYuNWwxLjIgMi4xLTQuOSA4LjV6IiBmaWxsPSIjZmZmIi8%2BPC9zdmc%2B)](https://www.webgl-operate.org/doc)
[![Travis](https://img.shields.io/travis/cginternals/webgl-operate/master.svg?style=flat&logo=travis)](https://travis-ci.org/cginternals/webgl-operate)
[![Coveralls](https://img.shields.io/coveralls/github/cginternals/webgl-operate.svg?style=flat)](https://coveralls.io/github/cginternals/webgl-operate)
[![Tokei](https://tokei.rs/b1/github/cginternals/webgl-operate)](https://github.com/Aaronepower/tokei)
[![Tokei](https://tokei.rs/b1/github/cginternals/webgl-operate?category=comments)](https://github.com/Aaronepower/tokei)

*webgl-operate* encapsulates WebGL and provides various rendering capabilities such as common rendering controllers for single-frame and multi-frame rendering, raycasting, or progressive path-tracing as well as a multitude of common rendering processes and shaders. 
In contrast to most other rendering engines, neither a specific rendering approach/pipeline or style is favored nor a specific use-case is assumed. 
Instead, it features a basis for arbitrary rendering implementations and facilitates common rendering processes in an atomic manner.
It can be used for, e.g., complex charting, volume rendering, point-cloud rendering, product visualization, learning webgl, raymarching or pathtracing, rendering implicit or procedural geometry, as well as modern rendering of 3D models and complex scenes. 

## How to Install

*webgl-operate* can be used both as npm module (TypeScript or JavaScript) and linked JavaScript bundle:

```sh
npm install --save-dev webgl-operate
```

```
<script src="https://cdn.jsdelivr.net/npm/webgl-operate@0.2.5/dist/webgl-operate.min.js"></script>
```

## Features

#### 0.1.0 Features
Cross-browser Compatible, Desktop and Mobile, Object-oriented WebGL2 Facade, Object-oriented WebGL2 Facade, WebGL and WebGL2 Backend, Extension Querying and Masquerade, Professional Customer Support, Professional Integration Service
 
#### 0.2.0 Features
Progressive Rendering Controller, Programs and Shaders with Includes, GPU Allocation Registry, Dynamic Resolution, Frame Buffers,  Vertex Buffers, Vertex Arrays, 2D Textures, Drawables, Observable Rendering Stats, Camera and Camera Controllers

#### 0.3.0 planned Features
3D Textures, Default Viewer UI/Overlay, Volume Rendering Basics, Adaptive Resolution, Post-processing Library, LUT Color Grading, ...

#### 0.4.0 planned Features
Text Rendering, Ray Tracing Utils, Progressive Path Tracing Utils, ...


## Getting Started

The canvas can be integrated into HTML5 as follows:
```
<canvas id="multiframe">
    <!-- fallback -->
    Your browser does <strong>not support</strong> the <code>&lt;canvas&gt;</code> element.
</canvas>
```

This canvas can then be setup by associating the canvas element with a single-frame or multi-frame controller and attaching a renderer using JavaScript as follows:
```
ToDo
```

## Dependencies

*webgl-operate* has currently no non-dev dependencies.


## Source Structure

| directory | description |
|-----------|-------------|
| `source`         | most of webgl-operate's rendering and operational logic |
| `source/data`    | contains, e.g., pre-built sampling patterns or other data | 
| `source/shaders` | on build, shaders are packed into the dist as well (and includes are resolved) |
| `source/debug`   | optional: various tools for run-time debugging |
| `source/viewer`  | optional: generic viewer overlay and controller for webgl-operate based rendering |
| `website`        | website demonstrating webgl-operate features (referencing examples) | 
| `test`           | tests of sources located in `source` |


## NPM Configuration and Project Setup

`package.json` specifies the following scripts that can be run by `npm run-script <command>`. 

| command          | description |
|------------------|-------------|
| `build`          | build for local development to `./build`, creates a bundle with all facilities and a test website |
| `start`          | starts a local start on port 4000 on the `./build` directory |
| `start-watch`    | runs `build` tasks concurrently in watch mode and starts `start` |
| `build-dist`     | transpile sources and declarations to `./dist` for distribution via, e.g., CDN |
| `build-lib`      | transpile sources and declarations to `./lib/` for distribution via npm |
| `cleanup`        | removes all build directories, i.e., `./build`, `./dist`, and `./lib` |
| `lint`           | code quality lint [TSLint Rules](https://palantir.github.io/tslint/rules/): `tslint.json` |
| `doc`            | build html documentation in `dist/docs` using [TypeDoc](https://github.com/TypeStrong/typedoc) |
| `test`           | run unit tests using [mocha](https://github.com/mochajs/mocha) and [chai](https://github.com/chaijs/chai) |

The above commands can be triggered directly from within a console (e.g., from within the Visual Studio Code terminal) or by using visual studio tasks. When first working on webgl-operate, use `npm install` to install dependencies.
For development use `npm run-script build` and, e.g., `npm run-script start` to access the test website locally.

* For **deployment** `npm update` and subsequent `npm run-script prepack` should be run.
* For **publishing** the package to npm login to npm via `npm login`, then update the package version using `npm version {major,minor,patch}`, and, finally, run `npm publish`.

Please note that deployment of documentation and examples is managed by CG Internals manually for now.


## Visual Studio Code configuration

"[Visual Studio Code](https://code.visualstudio.com/) is a code editor redefined and optimized for building and debugging modern web and cloud applications." 
Please not that the workspace configuration `.vscode/settings.json` has automatic format on save enabled.

#### tasks

All the above scripts, namely `build, build-lib, build-dist, lint, cleanup, start, start-watch, doc`, as well as `test` can be triggered from within Visual Studio Code.
The intended workflow is to bind a key (e.g., ctrl+alt+t) to open the task selection and trigger the desired task.
The tasks are configured in `.vscode/tasks.json`.


## Related Work

* [ES6 Specification](http://www.ecma-international.org/ecma-262/6.0/)
* [ES6 Modules](http://www.2ality.com/2014/09/es6-modules-final.html)
* [WebGL Stats](http://webglstats.com/)
* [Webpack](https://webpack.js.org/configuration/)
* [TypeScript](https://www.typescriptlang.org/docs/tutorial.html)
* [TypeScript Coding Guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)
