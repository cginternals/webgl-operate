[![Version](https://img.shields.io/github/package-json/v/cginternals/webgl-operate.svg?style=flat-square)](https://github.com/cginternals/webgl-operate/releases)
[![Travis](https://img.shields.io/travis/cginternals/webgl-operate.svg?style=flat-square)](https://travis-ci.org/cginternals/webgl-operate)
[![Coveralls](https://img.shields.io/coveralls/github/cginternals/webgl-operate.svg?style=flat-square)](https://coveralls.io/github/cginternals/webgl-operate)
[![Examples](https://img.shields.io/badge/examples-online-blue.svg?style=flat-square)](https://www.webgl-operate.org)
[![Documentation](https://img.shields.io/badge/documentation-online-blue.svg?style=flat-square)](https://www.webgl-operate.org/doc)

# webgl-operate
A TypeScript based WebGL rendering framework.

## Getting Started

The multi-frame canvas can be integrated into HTML5 as follows:
```
<canvas id="multiframe">
    <!-- fallback -->
    Your browser does <strong>not support</strong> the <code>&lt;canvas&gt;</code> element.
</canvas>
```

This canvas can then be setup by associating the canvas element with a multi-frame canvas and attaching a pipeline using JavaScript as follows:
```
TODO
```

## Dependencies

*webgl-operate* has the following non-dev dependencies:

* [```gl-matrix```](http://glmatrix.net/) is a Javascript matrix and vector library for high performance WebGL apps (MIT license).


## Source Structure

| directory | description |
|-----------|-------------|
| ```source```         | 'public' interface of webgl-operate: classes required for integrating this library into an app, e.g., canvas, specialized pipelines |
| ```source/assets```  | rendering assets used such as sampling patterns or meshes. | 
| ```source/core```    | provides mainly the multi-frame rendering workflow and all rendering related, non specialized classes. | 
| ```source/kernels``` | this directory contains pre-computed sampling patterns used for multi-frame sampling. | 
| ```source/shaders``` | this directory contains shaders. On build, the shaders are packed into the dist as well (and includes are resolved). |
| ```source/stages```  | all specialized rendering stages for use-case specific rendering are located here. |
| ```examples```       | multiple examples demonstrating various features of webgl-operate | 
| ```test```           | in this directory all tests are located. |


## NPM configuration

Various scripts are defined in ```package.json``` and can be run by ```npm run <command>```.

| command | description |
|-------------|-------------|
| ```build```        | build and pack non-minified library with core, debug and viewer facilities [webpack and TypeScript](https://webpack.js.org/guides/webpack-and-typescript/) |
| ```build-all```    | build and pack both minified and non-minified library |
| ```check```        | code quality check [TSLint Rules](https://palantir.github.io/tslint/rules/) : ```tslint.json``` |
| ```examples```       | build example html pages |
| ```examples-watch``` | build example html pages and watch for changes for continuous build |
| ```doc```          | generates the documentation in docs using [TypeDoc](https://github.com/TypeStrong/typedoc) |
| ```test```         | run unit tests using mocha (https://github.com/mochajs/mocha) and chai (https://github.com/chaijs/chai) |
| ```deploy```       | distribution deployment (build, examples) |
| ```deploy-full```       | full distribution deployment (check, test, build-all, doc, and examples) |

The above commands can be triggered directly from within a console of course (e.g., from within the Visual Studio Code terminal).


## Project Setup

When first working on webgl-operate, use ```npm install``` to install dependencies.
Use ```npm run build``` to build the library and ```npm run examples``` to build the examples.
The built examples are located in the ```dist``` folder.


## Deployment 

For deployment adhere to the following sequence:

* first ```npm update``` should be run,
* second ```npm deploy``` should be run.


## Visual Studio Code configuration

"[Visual Studio Code](https://code.visualstudio.com/) is a code editor redefined and optimized for building and debugging modern web and cloud applications." 
Please not that the workspace configuration ```.vscode/settings.json``` has automatic format on save enabled.

#### tasks

All the above scripts, namely ```build, build-min, check, check-watch, doc, test, test-watch, deploy``` as well as ```update``` (```npm update```) can be triggered from within Visual Studio Code.
The intended workflow is to bind a key (e.g., ctrl+alt+t) to open the task selection and trigger the desired task.
The tasks are configured in ```.vscode/tasks.json```.

#### launch

Two launch configurations for debugging from within Visual Studio Code are configured in ```.vscode/launch.json``` and requires ```msjsdiag.debugger-for-chrome``` plugin:

* The ```Launch``` configuration opens the ```dist/index.html``` in a Chrome tab.
* The ```Attach``` configuration attaches to an existing Chrome tab having the ```dist/index.html``` opened and enables debugging from within Visual Studio Code.


## Related Work

* [ES6 Specification](http://www.ecma-international.org/ecma-262/6.0/)
* [ES6 Modules](http://www.2ality.com/2014/09/es6-modules-final.html)
* [WebGL Stats](http://webglstats.com/)
* [Webpack 2.2](https://webpack.js.org/configuration/)
* [TypeScript](https://www.typescriptlang.org/docs/tutorial.html)
* [TypeScript Coding Guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)
