"use strict"
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"
// import pythonShell module for executing python scripts
import * as pythonShell from "python-shell"
// import modules for web server preview
import { BrowserContentProvider } from "./browserContentProvider";
import { Server } from "./server";
import { Utility } from "./utility";
// import viewX configuration module
import { ViewXConfig } from "./viewXConfig"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("Congratulations, your extension 'viewx-vscode' is now active!");

    let disposables = [];
    let viewXExtension = new ViewXExtension();

    // start web server
    startServer();

    // provider settings.
    const provider = new BrowserContentProvider();
    const registration = vscode.workspace.registerTextDocumentContentProvider("http", provider);

    // update preview on document change event
    // vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
    //     if (e.document === vscode.window.activeTextEditor.document) {
    //         const previewUri = Utility.getUriOfActiveEditor();
    //         provider.update(previewUri);
    //     }
    // });

    // When configuration is changed, resume web server.
    vscode.workspace.onDidChangeConfiguration(() => {
        const settings = vscode.workspace.getConfiguration("previewServer").get("isWatchConfiguration") as boolean;
        if (settings) {
            resumeServer();
            vscode.window.showInformationMessage("Resume the Web Server.");
        }
    });

    // When file is saved, reload browser.
    vscode.workspace.onDidSaveTextDocument((e) => {
        // re-generate preview html file when model file is saved (apply changes)
        if (viewXExtension.activeViewXModel !== undefined) {
            let activeModelUri: vscode.Uri = vscode.window.activeTextEditor.document.uri;
            viewXExtension.generatePreviewHtmlForModel(activeModelUri);
        }
        // and then reload the web server to apply changes in preview
        Server.reload(e.fileName);
    });

    // unset active viewXModel
    vscode.window.onDidChangeActiveTextEditor(editor => {
        viewXExtension.activeViewXModel = undefined;
    });

    disposables.push(vscode.commands.registerCommand("viewx.initProject", () => {
        vscode.window.showInputBox({
            prompt: "Please insert a path where you want to setup a ViewX project",
            placeHolder: "Path to the project",
            ignoreFocusOut: true
        }).then(result => {
            if (result !== undefined) {
                let projectPath = result;
                vscode.window.showInputBox({
                    prompt: "Please insert a name of the ViewX project",
                    placeHolder: "Name of the project",
                    ignoreFocusOut: true
                }).then(result => {
                    let projectName = result;
                    let options = {
                        mode: "text",
                        pythonPath: `${viewXExtension.viewXVEnv}/Scripts/python`,
                        // pythonPath: "C:/Users/dkupco/VEnvs/viewx/Scripts/python", // DEV
                        args: [projectPath, projectName]
                    };

                    let pyInterpreter = `${viewXExtension.extensionPath}/src/python/viewx_init_project.py`;
                    // let pyInterpreter = "C:/Users/dkupco/Documents/GitHub/viewX-vscode/src/python/viewx_init_project.py"; // DEV

                    pythonShell.run(pyInterpreter, options, function (err, result) {
                        // if (err) throw err;
                        // result is an array consisting of messages collected during execution
                        let projectFolder = vscode.Uri.parse(`${projectPath}/${projectName}`);
                        if ((result[0] as string).trim() === "success") {
                            vscode.commands.executeCommand("vscode.openFolder", projectFolder, true);
                        }
                    });
                });
            }
        });
    }));

    disposables.push(vscode.commands.registerCommand("viewx.previewModel", () => {

        let activeModelUri: vscode.Uri = vscode.window.activeTextEditor.document.uri;
        let fileName: string = Utility.getFileNameFromFileUri(activeModelUri);
        let viewXModel: string = viewXExtension.findMatchingViewXModel(fileName);

        if (viewXModel === undefined) {
            vscode.window.showErrorMessage("There is no found viewX model that matches current file!");
            return;
            // open vxconfig.json and add mathing for current file name in the future
            // vscode.workspace.openTextDocument(testPreview).then(document => {
            //     console.log("opened: " + testPreview.fsPath);
            //     vscode.window.showTextDocument(document);
            // });
        }

        viewXExtension.generatePreviewHtmlForModel(activeModelUri);

        // set ViewColumn (VS Code supports up to 3 columns max)
        let viewColumn: vscode.ViewColumn;
        if (vscode.window.activeTextEditor.viewColumn < 3) {
            viewColumn = vscode.window.activeTextEditor.viewColumn + 1;
        } else {
            viewColumn = 1;
        }

        // finally get URI of the preview file (hosted on web server) and show it
        const previewUri = Utility.getUriOfPreviewHtml();
        console.log("previewUri: " + previewUri);
        return vscode.commands.executeCommand("vscode.previewHtml", previewUri, viewColumn, "Preview with WebServer").then(() => {
        }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    }));

    disposables.push(vscode.commands.registerCommand("viewx.launchBrowser", () => {
        const uri = Utility.getUriOfPreviewHtml();
        return vscode.commands.executeCommand("vscode.open", uri);
    }));

    disposables.push(vscode.commands.registerCommand("viewx.stopServer", () => {
        Server.stop();
        vscode.window.showInformationMessage("Stop the Web Server successfully.");
    }));

    disposables.push(vscode.commands.registerCommand("viewx.resumeServer", () => {
        resumeServer();
        vscode.window.showInformationMessage("Resume the Web Server.");
    }));

    // subscribe all commands
    disposables.forEach(disposable => {
        context.subscriptions.push(disposable);
    });
}

function startServer() {
    Utility.setRandomPort();
    const options = vscode.workspace.getConfiguration("previewServer");
    const port = options.get("port") as number;
    const proxy = options.get("proxy") as string;
    const isSync = options.get("sync") as boolean;
    // const rootPath = vscode.workspace.rootPath || Utility.getOpenFilePath(vscode.window.activeTextEditor.document.fileName);
    // instead of workspace path, we now pass root path of the preview.html file (within extension root folder)
    const rootPath = Utility.getOpenFilePath(Utility.getFilePathOfPreviewHtml());
    Server.start(rootPath, port, isSync, proxy);
}

function resumeServer() {
    Server.stop();
    startServer();
}

// this method is called when your extension is deactivated
export function deactivate() {
    Server.stop();
}

class ViewXExtension {
    public activeViewXModel: string;
    public extensionPath: string;
    public viewXVEnv: string;
    public viewXConfig: ViewXConfig;

    constructor() {
        const options = vscode.workspace.getConfiguration("viewX");
        this.extensionPath = vscode.extensions.getExtension(options.get("fullExtensionName") as string).extensionPath;
        this.viewXVEnv = process.env[options.get("envVariableName") as string];

        console.log("extension path: " + this.extensionPath);
        console.log("viewXVEnv: " + this.viewXVEnv);

        // if workspace is loaded, read viewX project configuration file
        let workspacePath = vscode.workspace.rootPath;
        console.log("workspacePath: " + workspacePath);
        if (workspacePath !== undefined) {
            // require external node module for loading json
            const loadJsonFile = require("load-json-file");
            try {
                // need to read config file synchronously, because we can end up using it while it has not been read yet
                this.viewXConfig = loadJsonFile.sync(`${workspacePath}/vxconfig.json`);
                console.log("ucitao config json");
            // need to catch the error in order to continue activating the extension
            } catch (error) {
                console.log(error);
            }
        }

    }

    public findMatchingViewXModel(fileName: string): string {
        let viewXModel = undefined;
        this.viewXConfig.viewXModels.filterMappings.forEach(map => {
            if(Utility.isFileMatchingFilter(fileName, map.filter)) {
                viewXModel = map.modelName;
                return;
            }
        });
        this.activeViewXModel = viewXModel;
        return viewXModel;
    }

    public generatePreviewHtmlForModel(modelUri: vscode.Uri) {
        let envPythonUri = vscode.Uri.parse(`${this.viewXVEnv}/Scripts/python`);
        let workspaceUri = vscode.Uri.parse(vscode.workspace.rootPath);
        let options = {
            mode: "text",
            pythonPath: `${envPythonUri.scheme}:${envPythonUri.path}`,
            // pythonOptions: ["-u"],
            // scriptPath: "path/to/my/scripts",
            args: [`${workspaceUri.scheme}:${workspaceUri.path}/${this.activeViewXModel}`, `${modelUri.scheme}:${modelUri.path}`]
        };

        //let pyInterpreter = vscode.Uri.parse("file:///D:/Programiranje/MasterRad/viewx-vscode/src/viewx_interpreter.py");
        let pyInterpreterUri = vscode.Uri.parse(`${this.extensionPath}/src/viewx_interpreter.py`);

        console.log("viewModel: " + `${workspaceUri.scheme}:${workspaceUri.path}/${this.activeViewXModel}`);
        console.log("model: " + `${modelUri.scheme}:${modelUri.path}`);
        console.log("pyInterpreter: " + `${pyInterpreterUri.scheme}:${pyInterpreterUri.path}`);

        pythonShell.run(`${pyInterpreterUri.scheme}:${pyInterpreterUri.path}`, options, function (err, results) {
            // if (err) throw err;
            // results is an array consisting of messages collected during execution
            console.log("results: " + results);
        });
    }
}