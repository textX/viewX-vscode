![viewX logo][logo]

# viewX-vscode

[![MIT licensed](https://img.shields.io/cocoapods/l/AFNetworking.svg)](https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/LICENSE)
[![Typescript version](https://img.shields.io/badge/typescript-2.4-blue.svg)](https://www.typescriptlang.org/)
[![Python version](https://img.shields.io/badge/python-3.5-orange.svg)](https://www.python.org/)

A Visual Studio Code extension that allows graph based  visualization of a code/model written in a DSL created using textX meta-language.

### This extension contains 3 main parts:

- VS Code extension _(Typescript)_
- viewX model and custom DSL concrete model interpretation, generation of model preview _(Python)_
- Cytoscape.js graph engine and binding extension to graph events _(Javascript)_

## Quick start:
---

### Prerequisites:
- Install Python 3.x
- Install Python global dependencies using pip:
    - virtualenv==15.1.0

### Setup (manually):
- Install viewX-vscode extension
- Create Python virtual environment
- Create <**viewXVEnv**> environment variable and Python set virtual environment's root path as it's value

### Setup (script):
- TODO

## Basic usage flow:
---

1. User writes DSL using textX and model(s) in his own DSL.
2. User defines a way how to visualize his model(s) using another DSL, viewX.
3. User is now able to preview the graph of his model(s) based on the defined visualization rules and allowed to make basic interactions with graph on the preview.
4. User makes changes his to model(s) which reflect onto graph.

## Usage examples:
---
- TODO

## Dependencies
---
- This extension heavily depends on [_**textX**_](https://github.com/igordejanovic/textX) DSL, developed and maintained by Igor Dejanović. TextX is a meta-language which allows user to create his own DSL language defined by textX grammar rules. You can find more on textX [here](http://www.igordejanovic.net/textX/).

- Since textX is implemented in _**Python**_, it is also used to perform user's DSL concrete model and viewX vizualization interpretation as well as generation of preview script. More information can be found on [Python homepage](https://www.python.org/).

- Preview is a regular _.html_ script which uses _**Cytoscape.js**_ Javascript library for graph analyzis and vizualization. For more details about this library please visit [Cytoscape.js homepage](http://js.cytoscape.org/)

## License
---
Author: _Daniel Kupčo_.

Licensed under the [MIT](https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/LICENSE) License.


[logo]: https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/images/viewX-logo.png "viewX logo"