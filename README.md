[![MIT licensed](https://img.shields.io/cocoapods/l/AFNetworking.svg)](https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/LICENSE)
[![Typescript version](https://img.shields.io/badge/typescript-2.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Python version](https://img.shields.io/badge/python-3.5-orange.svg)](https://www.python.org/)
[![Marketplace](https://img.shields.io/badge/VSCode_Marketplace-viewX-e2165e.svg?)](https://marketplace.visualstudio.com/items?itemName=dkupco.viewX)
[![textX tools](https://img.shields.io/badge/textX--dev--community-textX_tools-00823e.svg?logo=github)](https://github.com/textX-tools)

![viewX logo][logo]

A Visual Studio Code extension that allows graph based visualization of a code/model written in a DSL created using textX meta-language.

---

**IMPORTANT:** For 0.1 to 0.2 version migration (needed to be cross-platform functional):
- Reinstall the extension and follow the installation steps (or run the setup script) again  
or
- Update the extension and run only the step for creating the python symlink manually - [_3) b) last step_](#pysymlink)

---

### This extension contains 3 main parts:

- VS Code extension _(Typescript)_
- Interpreter of viewX model and custom DSL concrete model, generators of model preview and viewX project template structure _(Python)_
- Preview of model graph and socket server for interaction between extension and graph, each using _**Cytoscape&#46;js**_ and _**Socket&#46;io**_ libraries respectively _(Javascript)_

## Quick start:

### 1) Prerequisites:

- Install Python 3.x version by following the [instructions](https://wiki.python.org/moin/BeginnersGuide/Download)
- Make sure that **_python_** and **_pip_** has been added to the **_HOME_** environment variable by running the following commands:
```
    python -V
    pip -V
```
- Install Python [_virtualenv_](https://virtualenv.pypa.io/en/stable/) module using pip:
```
    pip install virtualenv
```

**IMPORTANT:** It is possible that you will have both Python 2.x and 3.x versions already installed on UNIX system. It is OK to install virtualenv using ```pip``` (for Python 2.x) or just installing the package directly and making sure that ```virtualenv``` is added to the PATH. Just make sure that you have ```python3``` script added to the PATH and the script will create virtual environment for the Python 3.x version with pip and other tools automatically.

### 2) Install viewX extension:

- Install viewX extension from the [VS Code Extension Marketplace](https://marketplace.visualstudio.com/items?itemName=dkupco.viewX) or by searching for _**viewX**_ extension from VS Code editor
- Restart Visual Studio Code editor

### 3) Setup viewX python virtual environment:
#### a) Script:

- Go to the VS Code extensions default installation directory
- Open viewX extension directory and from _'setup_scripts'_ directory, run a _'viewX_setup'_ script appropriate for your operating system. Parameters needed for the script are _-path_ (path for the environment to be created) and _-name_ (name of the virtual environment). Optionaly you can define _-reqFile_ (path to the requirements file), by default the python_requirements.txt file is been used from extension's root folder. Examples:
    - Windows 10 (Powershell) - _(default extension path: 'C:\Users\\\<username\>\\.vscode\extensions')_:

    **IMPORTANT:** Before running the Powershell script make sure first that developer mode is enabled by openning **_Settings -> Update & Security -> For developers_** and under **_Use developer features_** select **_Developer mode_**.  
    ```
        .\viewX_setup.ps1 -path "some\parent\folder" -name "env_name" [-reqFile "path\to\requirements\file"]
    ```
    - Linux / macOS - _(default extension path: '~\\.vscode\extensions')_:
    
    Add the execution priviledge to the script by running:
    ```
        chmod +x ./viewX_setup.sh
    ```
    Then execute the setup script:
    ```
        ./viewX_setup.sh --path="some/parent/folder" --name="env_name" [--reqFile="path/to/requirements/file"]
    ```
#### b) Manually:

- Create Python virtual environment
- Create _**viewXVEnv**_ environment variable and set Python virtual environment's root path as it's value
- Copy _python_requirements.txt_ file to the created Python virtual environment
- Install Python dependencies by running following command in a console:

    - Windows 10 (Powershell):
    ```
        & $Env:viewXVEnv\Scripts\pip install -r $Env:viewXVEnv/python_requirements.txt
    ```
    - Linux / macOS:
    ```
        $viewXVEnv/Scripts/pip install -r $viewXVEnv/python_requirements.txt
    ```
- <a name="pysymlink"></a> Create a **_python_** symlink in virtual environment's root folder pointing to python script (make sure it is 3.x version) within virtual environment (e.g. Windows: _python -> .\Scripts\python.exe_, Linux: _python -> ./bin/python_)

    - Windows 10 (Powershell):
    
    **IMPORTANT:** Check first that developer mode is enabled by openning **_Settings -> Update & Security -> For developers_** and under **_Use developer features_** select **_Developer mode_**.  
    Then open Powershell and run following command:
    ```
        cmd /c mklink "$Env:viewXVEnv\python.exe" "$Env:viewXVEnv\Scripts\python.exe"
    ```
    - Linux / macOS:
    ```
        sudo ln -srf "$viewXVEnv/bin/python" "$viewXVEnv/python"
    ```

... and you're good to go! :)

## Basic usage flow:

1. When extension is installed and loaded, press _```ctrl+alt+v i```_ keyboard shortcut to initialize viewX project. If workspace is loaded, you can right-click on some folder from the tree view and select _```viewX: Initialize Project```_ command. This way the selected folder will be used as destination for your viewX project and only the project name will be prompted.
2. Insert project path (if keyboard shortcuts are used) and then project name. It will create the folder structure and initialize valid viewX project template which include configuration file, DSL example in textX, 2 DSL model examples and 1 viewX model example. This will help a user to have a better understanding of how viewX project should look like and to:
    - Write a custom DSL using textX
    - Develop models in his own custom DSL
    - Define a way of visualizing his models using viewX
3. Visualize your model in a graph-like preview based on the defined visualization rules by pressing press _```ctrl+alt+v p```_ keyboard shortcut or by rigth clicking the active document and selecting the _```viewX: Preview model on side panel```_ command from the context menu. It will appear only on documents that match the filter defined in _vxconfig.json_ file in loaded workspace.
4. You can make basic interactions with the graph on the preview (navigation, panning, zooming, selection, moving nodes etc.). Saved changes to the currently previewed concrete model are immediately applied to the graph (if the model is valid after saving).

## Extension in use:

Let's say we want to visualize a Martin Fowler's state machine example similarly to the way it is visualized in this [textX demo](https://www.youtube.com/watch?v=HI14jk0JIR0) (about the details of this model and textX metamodel please watch the demo video).

This is where viewX extension comes into play. There are 2 complementary ways we can go to accomplish this:
- Use viewX DSL only to describe graph structure and apply valid Cytoscape.js styling within viewX model style section _(example: vx_examples/state_machine/dot_like_css.vx)_
- Use viewX DSL to define both the structure and the styling of the graph _(example: vx_examples/state_machine/dot_like.vx)_

Using any of these two completely different examples results in a graph to be displayed in the same way:

![viewX demo example][demo]

Depending on the complexity of the textX model and the user's preferences, one can define viewX model in a way anywhere between these two examples.

## Some of the main tools and libraries used:

- This extension is intended to provide useful features during development using textX framework, so it heavily depends on _**textX**_. TextX is a meta-language which allows user to create his own DSL language defined by textX grammar rules. For more information about textX please check [documentation](http://www.igordejanovic.net/textX/) or [GitHub repository](https://github.com/igordejanovic/textX).

- Since textX is implemented in _**Python**_, it is also used to perform user's DSL concrete model and viewX visualization interpretation as well as generation of preview script. You can find more information on [Python homepage](https://www.python.org/).

- Since model interpetation logic is done on python side, it needs to be called somehow from extension within Node.js process. For that purpose a _**python-shell**_ Node module has been used. It allows us to easily make an asynchronous call to a python script from Javascript code, pass arguments during that call and receive data that can be sent from python script during execution. Code can be found on [module's Github repository](https://github.com/extrabacon/python-shell).

- Preview logic is a regular Javascript code within _preview.html_ file which uses _**Cytoscape&#46;js**_ Javascript library for graph visualization. For more details about this library please visit [Cytoscape.js homepage](http://js.cytoscape.org/).

- The graph preview is based on web server hosting the _preview.html_ file and _**BrowserSync**_ server instance which synchronizes connected browser clients with hosted preview file if any changes are detected. The idea for this solution was made thanks to Yuichi Nukiyama and his [repository](https://github.com/YuichiNukiyama/vscode-preview-server) for HTML live preview VS Code extension. The base code was taken from his extension and reimplemented in a way suitable for viewX extension so big thanks to Yuichi.

- To enable communication between extension and graph preview file, and vice versa, a _**Socket&#46;io**_ Javascript library is used. This library is used for creating a socket based server listening on a port and distributing commands between graph preview browser clients and extension itself. More on this library and how it can be used can be found here [Socket.io homepage](https://socket.io/).

- Since many editor instances can be run separately, it necessary to support multiple Socket.io server instances to allow communication between multiple extension instances independently. For that a [_**portscanner**_](https://www.npmjs.com/package/portscanner) module is used to check which ports are taken and to retrieve available ports to be used by Socket.io servers.

- For loading viewX project JSON configuration file _(.vxconfig.json)_ from project's workspace we use [_**load-json-file**_](https://www.npmjs.com/package/load-json-file) module.

## Notes:

- If you have any issues, bugs, feature requests, suggestions or comments you want to report or share please create an issue on the [issues page](https://github.com/danielkupco/viewX-vscode/issues).

- If you find time and will to contribute to this repository feel free to send a pull request.

- For supported features and changesets by versions please check the [CHANGELOG.md](https://github.com/danielkupco/viewX-vscode/blob/master/CHANGELOG.md) file.

- For grammar, syntax and features overview supported by viewX language please check the [documentation](https://danielkupco.github.io/viewX-vscode/).

- Tested on the following operating systems:
    - Windows 10 (x64)
    - Linux - Ubuntu 16.04 (x64)
    - Linux - ElementaryOS Freya (x64)

## License:

Author: _Daniel Kupčo_

Licensed under [MIT](https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/LICENSE) license.

All referenced libraries , code parts and ideas used from other repositories are licensed under MIT license as well.

[logo]: https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/images/viewX-logo.png "viewX logo"
[demo]: https://raw.githubusercontent.com/danielkupco/viewX-vscode/master/images/demo-example.png "viewX logo"