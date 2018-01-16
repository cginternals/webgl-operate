<br><a href="https://webgl-operate.org/"><img src="https://raw.githubusercontent.com/cginternals/webgl-operate/master/example/img/webgl-operate-logo.svg?sanitize=true" width="50%"></a>

*webgl-operate* (or *[gloperate](https://github.com/cginternals/gloperate) for WebGL*) is a TypeScript based WebGL rendering framework.


[![Travis](https://img.shields.io/travis/cginternals/webgl-operate.svg?style=flat-square)](https://travis-ci.org/cginternals/webgl-operate)
[![Coveralls](https://img.shields.io/coveralls/github/cginternals/webgl-operate.svg?style=flat-square)](https://coveralls.io/github/cginternals/webgl-operate)
[![bitHound](https://img.shields.io/bithound/code/github/cginternals/webgl-operate.svg?style=flat-square)](https://www.bithound.io/github/cginternals/webgl-operate)
[![bitHound](https://img.shields.io/bithound/dependencies/github/cginternals/webgl-operate.svg?style=flat-square)](https://www.bithound.io/github/cginternals/webgl-operate/master/dependencies/npm)
[![bitHound](https://img.shields.io/bithound/devDependencies/github/cginternals/webgl-operate.svg?style=flat-square)](https://www.bithound.io/github/cginternals/webgl-operate/master/dependencies/npm)

[![npm Version](https://img.shields.io/npm/v/webgl-operate.svg?style=flat-square)](https://www.npmjs.com/package/webgl-operate)
[![Examples](https://img.shields.io/badge/examples-online-blue.svg?style=flat-square)](https://www.webgl-operate.org)
[![Documentation](https://img.shields.io/badge/documentation-online-blue.svg?style=flat-square)](https://www.webgl-operate.org/doc)

## How to Install

```sh
npm install --save-dev webgl-operate
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
| `source`         | 'public' interface of webgl-operate |
| `source/assets`  | rendering assets used such as sampling patterns, masquerade presets, or meshes | 
| `source/core`    | provides all rendering, controlling, and webgl related, non specialized classes | 
| `source/kernels` | contains pre-computed sampling patterns used for, e.g., multi-frame sampling | 
| `source/shaders` | on build, shaders are packed into the dist as well (and includes are resolved) |
| `source/stages`  | specialized rendering stages |
| `source/debug`   | optional: various tools for run-time debugging |
| `source/viewer`  | optional: generic viewer overlay and controller for webgl-operate based rendering |
| `examples`       | examples demonstrating webgl-operate features | 
| `test`           | tests of sources located in `sources` |


## NPM Configuration and Project Setup

`package.json` specifies various scripts that can be run by `npm run-script <command>`.

| command | description |
|---------|-------------|
| `build`          | build and pack library with core, debug, and viewer facilities [webpack and TypeScript](https://webpack.js.org/guides/webpack-and-typescript/) |
| `build-all`      | build and pack both minified and slim (no viewer and debug) libraries |
| `examples`       | build example html pages to `dist` |
| `check`          | code quality check [TSLint Rules](https://palantir.github.io/tslint/rules/): `tslint.json` |
| `doc`            | build html documentation in `dist/docs` using [TypeDoc](https://github.com/TypeStrong/typedoc) |
| `test`           | run unit tests using [mocha](https://github.com/mochajs/mocha) and [chai](https://github.com/chaijs/chai) |
| `deploy`         | full distribution deployment triggering check, test, build-all, doc, and examples |
| `deploy-lite`    | lite distribution deployment triggering only build and examples |

The above commands can be triggered directly from within a console of course (e.g., from within the Visual Studio Code terminal).

When first working on webgl-operate, use `npm install` to install dependencies.
Use `npm run-script build` to build the library and `npm run-script examples` to build the examples.
The built examples are located in the `dist` folder.


## Deployment 

For deployment adhere to the following sequence:

* first `npm update` should be run,
* second `npm deploy` should be run.


## Visual Studio Code configuration

"[Visual Studio Code](https://code.visualstudio.com/) is a code editor redefined and optimized for building and debugging modern web and cloud applications." 
Please not that the workspace configuration `.vscode/settings.json` has automatic format on save enabled.

#### tasks

All the above scripts, namely `build, build-all, check, deploy, deploy-lite, doc, examples, examples-watch` as well as `test` can be triggered from within Visual Studio Code.
The intended workflow is to bind a key (e.g., ctrl+alt+t) to open the task selection and trigger the desired task.
The tasks are configured in `.vscode/tasks.json`.

#### launch

Two launch configurations for debugging from within Visual Studio Code are configured in `.vscode/launch.json` and requires `msjsdiag.debugger-for-chrome` plugin:

* The `Launch` configuration opens the `dist/index.html` in a Chrome tab.
* The `Attach` configuration attaches to an existing Chrome tab having the `dist/index.html` opened and enables debugging from within Visual Studio Code.


## Related Work

* [ES6 Specification](http://www.ecma-international.org/ecma-262/6.0/)
* [ES6 Modules](http://www.2ality.com/2014/09/es6-modules-final.html)
* [WebGL Stats](http://webglstats.com/)
* [Webpack 2.2](https://webpack.js.org/configuration/)
* [TypeScript](https://www.typescriptlang.org/docs/tutorial.html)
* [TypeScript Coding Guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)
