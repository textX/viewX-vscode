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

### Prerequisites:
- Install Python 3.x version by following the [instructions](https://wiki.python.org/moin/BeginnersGuide/Download)
- Make sure that Python has been added to the **HOME** environment variable by running the following commands:
    - python -V
    - pip -V
- Install Python _virtualenv_ module using pip:
    - pip install virtualenv ([More info](https://virtualenv.pypa.io/en/stable/))

### Setup (manually):
- Install viewX-vscode extension
- Create Python virtual environment
- Create <**viewXVEnv**> environment variable and set Python virtual environment's root path as it's value
- Copy _python_requirements.txt_ file to the created Python virtual environment
- Run following command to install Python dependencies:
    - %viewXVEnv%/Scripts/pip install -r %viewXVEnv%/python_requirements.txt _(Windows)_
    - TODO _(Linux)_

### Setup (script):
- TODO

## Basic usage flow:

1. Write a DSL using textX and model(s) in your own DSL.
2. Define a way of visualizing your model(s) using viewX (another DSL defined by textX).
3. Visualize your model(s) in a graph-like preview based on the defined visualization rules. You can make basic interactions with the graph on the preview (navigation, panning, zooming, selection, moving nodes etc.)
4. Saved changes to the currently previewed concrete model are immediately applied to the graph (if the model is valid after saving).

## Dependencies
- This extension heavily depends on _**textX**_ which is developed and maintained by Igor Dejanović. TextX is a meta-language which allows user to create his own DSL language defined by textX grammar rules. For more information about textX please check [documentation](http://www.igordejanovic.net/textX/) or [GitHub repository](https://github.com/igordejanovic/textX).

- Since textX is implemented in _**Python**_, it is also used to perform user's DSL concrete model and viewX vizualization interpretation as well as generation of preview script. You can find more information on [Python homepage](https://www.python.org/).

- Preview is a regular _.html_ script which uses _**Cytoscape.js**_ Javascript library for graph vizualization. For more details about this library please visit [Cytoscape.js homepage](http://js.cytoscape.org/).

## License
Author: _Daniel Kupčo_

Licensed under the [MIT](https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/LICENSE) License.


[logo]: https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/images/viewX-logo.png "viewX logo"