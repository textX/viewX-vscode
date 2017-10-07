![viewX logo][logo]

# viewX-vscode

[![MIT licensed](https://img.shields.io/cocoapods/l/AFNetworking.svg)](https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/LICENSE)
[![Typescript version](https://img.shields.io/badge/typescript-2.4-blue.svg)](https://www.typescriptlang.org/)
[![Python version](https://img.shields.io/badge/python-3.5-orange.svg)](https://www.python.org/)

A Visual Studio Code extension that allows graph based  visualization of a code/model written in a DSL created using textX meta-language.

### This extension contains 3 main parts:

- VS Code extension _(Typescript)_
- Interpreter of viewX model and custom DSL concrete model, generators of model preview and viewX project template structure _(Python)_
- Graph preview logic and socket server for interaction between extension and graph, each using Cytoscape.js and socket.io libraries respectively  _(Javascript)_

## Quick start:

### Prerequisites:
- Install Python 3.x version by following the [instructions](https://wiki.python.org/moin/BeginnersGuide/Download)
- Make sure that Python has been added to the **_HOME_** environment variable by running the following commands:
```
    python -V
    pip -V
```
- Install Python [_virtualenv_](https://virtualenv.pypa.io/en/stable/) module using pip:
```
    pip install virtualenv
```

### Setup (script):
- TODO

### Setup (manually):
- Install viewX-vscode extension
- Create Python virtual environment
- Create _**viewXVEnv**_ environment variable and set Python virtual environment's root path as it's value
- Copy _python_requirements.txt_ file to the created Python virtual environment
- Run following command to install Python dependencies:

Windows:
```
    %viewXVEnv%/Scripts/pip install -r %viewXVEnv%/python_requirements.txt
```
Linux:
```
    $viewXVEnv/Scripts/pip install -r $viewXVEnv/python_requirements.txt
```

## Basic usage flow:
1. When extension is installed and loaded, press _```ctrl+alt+v i```_ keyboard shortcut to initialize viewX project. If workspace is loaded, you can right-click on some folder from the tree view and select _```viewX: Initialize Project```_ command. This way the selected folder will be used as destination for your viewX project and only the project name will be prompted.
2. Insert project path (if keyboard shortcuts are used) and then project name. It will create the folder structure and initialize valid viewX project template which include configuration file, DSL example in textX, 2 DSL model examples and 1 viewX model example. This will help a user to have a better understanding of how viewX project should look like and to:
    - Write a custom DSL using textX
    - Develop models in his own custom DSL
    - Define a way of visualizing his models using viewX
3. Visualize your model in a graph-like preview based on the defined visualization rules by pressing press _```ctrl+alt+v p```_ keyboard shortcut or by rigth clicking the active document and selecting the _```viewX: Preview model on side panel```_ command from the context menu. It will appear only on documents that match the filter defined in _vxconfig.json_ file in loaded workspace.
4. You can make basic interactions with the graph on the preview (navigation, panning, zooming, selection, moving nodes etc.). Saved changes to the currently previewed concrete model are immediately applied to the graph (if the model is valid after saving).

## Dependencies
- This extension is intended to provide useful features during development using textX framework, so it heavily depends on _**textX**_. TextX is a meta-language which allows user to create his own DSL language defined by textX grammar rules. For more information about textX please check [documentation](http://www.igordejanovic.net/textX/) or [GitHub repository](https://github.com/igordejanovic/textX).

- Since textX is implemented in _**Python**_, it is also used to perform user's DSL concrete model and viewX vizualization interpretation as well as generation of preview script. You can find more information on [Python homepage](https://www.python.org/).

- Preview is a regular _.html_ script which uses _**Cytoscape.js**_ Javascript library for graph vizualization. For more details about this library please visit [Cytoscape.js homepage](http://js.cytoscape.org/).

- To enable communication between extension and graph preview file, and vice versa, a _**Socket.io**_ Javascript library is used. This library is used for creating a socket based server listening on a port and distributing commands between graph preview browser clients and extension itself. More on this library and how it can be used can be found here [Socket.io homepage](http://js.cytoscape.org/).

## License
Author: _Daniel Kupčo_

Licensed under the [MIT](https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/LICENSE) License.


[logo]: https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/images/viewX-logo.png "viewX logo"