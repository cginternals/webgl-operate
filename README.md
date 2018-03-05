<br><a href="https://webgl-operate.org/"><img src="https://raw.githubusercontent.com/cginternals/webgl-operate/master/example/img/webgl-operate-logo.svg?sanitize=true" width="50%"></a>

*webgl-operate* (or *[gloperate](https://github.com/cginternals/gloperate) for WebGL*) is a TypeScript based WebGL rendering framework.


[![Travis](https://img.shields.io/travis/cginternals/webgl-operate/master.svg?style=flat&logo=travis)](https://travis-ci.org/cginternals/webgl-operate)
[![Coveralls](https://img.shields.io/coveralls/github/cginternals/webgl-operate.svg?style=flat)](https://coveralls.io/github/cginternals/webgl-operate)
[![Tokei](https://tokei.rs/b1/github/cginternals/webgl-operate)](https://github.com/Aaronepower/tokei)
[![Tokei](https://tokei.rs/b1/github/cginternals/webgl-operate?category=comments)](https://github.com/Aaronepower/tokei)
[![bitHound](https://img.shields.io/bithound/code/github/cginternals/webgl-operate.svg?style=flat&logo=bithound)](https://www.bithound.io/github/cginternals/webgl-operate)
[![bitHound](https://img.shields.io/bithound/dependencies/github/cginternals/webgl-operate.svg?style=flat&logo=bithound)](https://www.bithound.io/github/cginternals/webgl-operate/master/dependencies/npm)
[![bitHound](https://img.shields.io/bithound/devDependencies/github/cginternals/webgl-operate.svg?style=flat&logo=bithound)](https://www.bithound.io/github/cginternals/webgl-operate/master/dependencies/npm)

[![npm Version](https://img.shields.io/npm/v/webgl-operate.svg?style=flat)](https://www.npmjs.com/package/webgl-operate)
[![Examples](https://img.shields.io/badge/examples-online-blue.svg?style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMC41IDEzLjciPjxwYXRoIGQ9Ik0xMS41IDYuOGwtMy43IDYuNEwuNS41aDE0LjdsLTEuMyAyLjFINC4yTDcuOCA5bDIuNS00LjN6bTcuMyA0LjNsMS4yIDIuMWgtOS43TDE3LjYuNWwxLjIgMi4xLTQuOSA4LjV6IiBmaWxsPSIjZmZmIi8%2BPC9zdmc%2B)](https://www.webgl-operate.org)
[![Documentation](https://img.shields.io/badge/documentation-online-blue.svg?style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMC41IDEzLjciPjxwYXRoIGQ9Ik0xMS41IDYuOGwtMy43IDYuNEwuNS41aDE0LjdsLTEuMyAyLjFINC4yTDcuOCA5bDIuNS00LjN6bTcuMyA0LjNsMS4yIDIuMWgtOS43TDE3LjYuNWwxLjIgMi4xLTQuOSA4LjV6IiBmaWxsPSIjZmZmIi8%2BPC9zdmc%2B)](https://www.webgl-operate.org/doc)

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
<script src="https://cdn.jsdelivr.net/npm/webgl-operate@0.1.6/dist/webgl-operate.min.js"></script>
```


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
| `example`        | examples demonstrating webgl-operate features | 
| `test`           | tests of sources located in `source` |


## NPM Configuration and Project Setup

This package setup distinguishes between *develop*, *deploy*, and *publish* related scripts: 

* **deployment** is covered by the script `deploy` and is intended to build bundles, examples, documentation, test-results etc. It is intended for non-npm deployment and triggeres a sequence of development scripts.
* **publishing** is covered by the script `prepublish`and is intended to be triggered automatically by `npm publish`. It is intended for npm deployment and triggers a sequence of custom as well as other develpment scripts.
* **development** scripts (all except `deploy` and `prepublish`) are intended for actual development of webgl-operate.

`package.json` specifies the following scripts that can be run by `npm run-script <command>`. 

| command          | description |
|------------------|-------------|
| `build`          | build and pack library with core, debug, and viewer facilities [webpack and TypeScript](https://webpack.js.org/guides/webpack-and-typescript/) |
| `build-watch`    | `build` command in watch (for modifications) mode |
| `build-all`      | build both minified and slim (no viewer and debug) libraries to `dist` |
| `build-lib`      | transpile sources and declarations for distribution via npm |
| `example`        | build example html pages to `dist` |
| `example-watch`  | `example` command in watch (for modifications) mode |
| `check`          | code quality check [TSLint Rules](https://palantir.github.io/tslint/rules/): `tslint.json` |
| `doc`            | build html documentation in `dist/docs` using [TypeDoc](https://github.com/TypeStrong/typedoc) |
| `test`           | run unit tests using [mocha](https://github.com/mochajs/mocha) and [chai](https://github.com/chaijs/chai) |
| `deploy-lite`    | lite distribution deployment triggering only build and examples |
| `deploy-watch`   | `deploy-lite` command in watch (for modifications) mode |
| **`deploy`**     | full distribution deployment triggering `check`, `test`, `build-all`, `doc`, and `example` |
| **`prepublishOnly`** | run `build-all` and `build-lib` |

The above commands can be triggered directly from within a console (e.g., from within the Visual Studio Code terminal) or by using visual studio tasks. When first working on webgl-operate, use `npm install` to install dependencies.
Use `npm run-script build` to build the library and `npm run-script example` to build the examples (or `deploy-lite` to trigger `build` and `example` in a single step). The built examples are located in the `dist` directory.

* For **deployment** `npm update` and subsequent `npm run-script deploy` should be run.
* For **publishing** the package to npm login to npm via `npm login`, then update the package version using `npm version {major,minor,patch}`, and, finally, run `npm publish`.

## Visual Studio Code configuration

"[Visual Studio Code](https://code.visualstudio.com/) is a code editor redefined and optimized for building and debugging modern web and cloud applications." 
Please not that the workspace configuration `.vscode/settings.json` has automatic format on save enabled.

#### tasks

All the above scripts, namely `build, build-watch, build-all, check, deploy-lite, deploy-watch, deploy, doc, example, example-watch` as well as `test` can be triggered from within Visual Studio Code.
The intended workflow is to bind a key (e.g., ctrl+alt+t) to open the task selection and trigger the desired task.
The tasks are configured in `.vscode/tasks.json`.


## Related Work

* [ES6 Specification](http://www.ecma-international.org/ecma-262/6.0/)
* [ES6 Modules](http://www.2ality.com/2014/09/es6-modules-final.html)
* [WebGL Stats](http://webglstats.com/)
* [Webpack](https://webpack.js.org/configuration/)
* [TypeScript](https://www.typescriptlang.org/docs/tutorial.html)
* [TypeScript Coding Guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)
