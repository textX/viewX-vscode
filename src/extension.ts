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
// import socket.io client (must be imported like this in typescript)
import * as io from "socket.io-client"
// import socket server (communication proxy)
import * as socketserver from "./socket-server"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("Congratulations, your extension 'viewx-vscode' is now active!");

    let disposables = [];
    let viewXExtension = new ViewXExtension();

    // start web server
    viewXExtension.startServer();

    // start socket server
    socketserver.startSocketServer();

    // connect to socket server and join extension room
    const socket = io("http://localhost:3002");
    socket.emit("ext-room");

    socket.on("ext-receive-command", function(command) {
        console.log("extension: command received - " + command);
        viewXExtension.interpretCommand(command);
    });

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
        const settings = viewXExtension.serverConfig.get("isWatchConfiguration") as boolean;
        if (settings) {
            viewXExtension.resumeServer();
            vscode.window.showInformationMessage("Resume the Web Server.");
        }
    });

    // When file is saved, reload browser.
    vscode.workspace.onDidSaveTextDocument((e) => {
        console.log("doc save!");
        // re-generate preview html file when model file is saved (apply changes)
        console.log("active model: " + viewXExtension.activeViewXModel)
        if (viewXExtension.activeViewXModel !== undefined) {
            let activeModelUri: vscode.Uri = vscode.window.activeTextEditor.document.uri;
            console.log(viewXExtension.previewColumn);
            console.log(activeModelUri.path);
            console.log(viewXExtension.lastPreviewedFileUri.path);
            if (viewXExtension.previewColumn > 0 && activeModelUri.path === viewXExtension.lastPreviewedFileUri.path) {
                viewXExtension.generatePreviewHtmlForModelAsync(activeModelUri, () => {
                    console.log("callback reload!");
                    Server.reload("preview.html");
                });
            }
        }
        // and then reload the web server to apply changes in preview
        // Server.reload("\preview.html");
        // setTimeout(() => {
        //     console.log("posle 3 sec, reload!")
        //     Server.reload("preview.html");
        // }, 3000);
    });

    // unset active viewXModel unless if preview is shown
    vscode.window.onDidChangeActiveTextEditor(editor => {
        console.log("changed editor");
        console.log(editor);
        viewXExtension.lastNumberOfOpenedDocuments = vscode.workspace.textDocuments.length;
        console.log("currently opened: " + viewXExtension.lastNumberOfOpenedDocuments);
        // if (editor !== undefined && editor.document.fileName === "preview.html") {
        //     if (vscode.window.visibleTextEditors.length < viewXExtension.lastNumberOfColumns) {
        //         viewXExtension.previewColumn = 0;
        //         console.log("preview closed!");
        //     }
        // }
        // if (editor !== undefined && editor.document.fileName !== "preview.html") {
        //     viewXExtension.activeViewXModel = undefined;
        //     console.log("unset active");
        // }
    });

    vscode.workspace.onDidCloseTextDocument(e => {
        // this is currently a VS Code bug
        // https://github.com/Microsoft/vscode/issues/33728
        if (e !== undefined && e.isClosed && e.uri.path === "/preview.html") {
            viewXExtension.previewColumn = 0;
        }
        viewXExtension.lastNumberOfOpenedDocuments = vscode.workspace.textDocuments.length;
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
                        pythonPath: `${viewXExtension.viewXVEnvPath}/Scripts/python`,
                        // pythonPath: "C:/Users/dkupco/VEnvs/viewx/Scripts/python", // DEV
                        args: [projectPath, projectName]
                    };

                    let pyInterpreter = `${viewXExtension.extensionPath}/src/python/viewx_init_project.py`;
                    // let pyInterpreter = "C:/Users/dkupco/Documents/GitHub/viewX-vscode/src/python/viewx_init_project.py"; // DEV

                    pythonShell.run(pyInterpreter, options, function (err, results) {
                        // if (err) throw err;
                        // results is an array consisting of messages collected during execution
                        let projectFolder = vscode.Uri.file(`${projectPath}/${projectName}`);
                        if ((results[0] as string).trim() === "success") { // "success" is returned by the .py script
                            vscode.commands.executeCommand("vscode.openFolder", projectFolder, true);
                        }
                    });
                });
            }
        });
    }));

    disposables.push(vscode.commands.registerCommand("viewx.previewModel", () => {

        let activeModelUri: vscode.Uri = vscode.window.activeTextEditor.document.uri;
        let fileName: string = Utility.getFileNameFromFileUriPath(activeModelUri.path);
        let viewXModel: string = viewXExtension.findMatchingViewXModel(fileName);

        if (viewXModel === undefined) {
            vscode.window.showErrorMessage("There is no found viewX model that matches current file!");
            return;
            // open vxconfig.json and add matching for current file name in the future
            // vscode.workspace.openTextDocument(testPreview).then(document => {
            //     console.log("opened: " + testPreview.fsPath);
            //     vscode.window.showTextDocument(document);
            // });
        }


        viewXExtension.generatePreviewHtmlForModelAsync(activeModelUri, () => {
            if (viewXExtension.previewColumn > 0) {
                Server.reload("preview.html");
            }
            else {
                viewXExtension.openModelPreview();
            }
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
        viewXExtension.resumeServer();
        vscode.window.showInformationMessage("Resume the Web Server.");
    }));

    disposables.push(vscode.commands.registerCommand("viewx.sendCommand", () => {
        let cursorPosition = vscode.window.activeTextEditor.selection.start;
        let lineBeginning = new vscode.Position(cursorPosition.line, 0);
        let offset = vscode.window.activeTextEditor.document.offsetAt(lineBeginning);
        socket.emit("ext-send-command", `fit|offset=${offset}`);
        vscode.window.showInformationMessage("Command sent: " + `fit|offset=${offset}`);
    }));

    // subscribe all commands
    disposables.forEach(disposable => {
        context.subscriptions.push(disposable);
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    Server.stop();
}

class ViewXExtension {
    // fixed values
    public extensionPath: string;
    public viewXVEnvPath: string;
    public extensionConfig: vscode.WorkspaceConfiguration;
    public serverConfig: vscode.WorkspaceConfiguration;

    // changeable values
    public viewXProjectConfig: ViewXConfig;
    public activeViewXModel: string;
    public lastPreviewedFileUri: vscode.Uri;
    public previewColumn: number = 0;
    public lastNumberOfOpenedDocuments: number = 0;

    constructor() {
        this.extensionConfig = vscode.workspace.getConfiguration("viewX");
        this.serverConfig = vscode.workspace.getConfiguration("viewX.previewServer");
        this.extensionPath = vscode.extensions.getExtension(this.extensionConfig.get("fullExtensionName") as string).extensionPath;
        this.viewXVEnvPath = process.env[this.extensionConfig.get("envVariableName") as string];

        console.log("extension path: " + this.extensionPath);
        console.log("viewXVEnv: " + this.viewXVEnvPath);

        // if workspace is loaded, read viewX project configuration file
        let workspacePath = vscode.workspace.rootPath;
        console.log("workspacePath: " + workspacePath);
        if (workspacePath !== undefined) {
            // require external node module for loading json
            const loadJsonFile = require("load-json-file");
            try {
                // need to read config file synchronously, because we can end up using it while it has not been read yet
                this.viewXProjectConfig = loadJsonFile.sync(`${workspacePath}/vxconfig.json`);
                console.log("ucitao config json");
            // need to catch the error in order to continue activating the extension
            } catch (error) {
                console.log(error);
            }
        }

    }

    public findMatchingViewXModel(fileName: string): string {
        let viewXModel = undefined;
        this.viewXProjectConfig.viewXModels.filterMappings.forEach(map => {
            if(Utility.isFileMatchingFilter(fileName, map.filter)) {
                viewXModel = map.modelName;
                return;
            }
        });
        this.activeViewXModel = viewXModel;
        return viewXModel;
    }

    public generatePreviewHtmlForModelAsync(modelUri: vscode.Uri, callback: Function) {
        let envPythonUri = vscode.Uri.file(`${this.viewXVEnvPath}/Scripts/python`);
        let workspaceUri = vscode.workspace.rootPath;
        console.log("envPythonUri: " + envPythonUri.path);
        console.log("workspaceUri: " + workspaceUri);
        let options = {
            mode: "text",
            pythonPath: envPythonUri.fsPath,
            // pythonOptions: ["-u"],
            // scriptPath: "path/to/my/scripts",
            args: [`${workspaceUri}/${this.activeViewXModel}`, modelUri.fsPath]
        };

        //let pyInterpreter = vscode.Uri.parse("file:///D:/Programiranje/MasterRad/viewx-vscode/src/viewx_interpreter.py");

        let pyInterpreterUri = vscode.Uri.file(`${this.extensionPath}/src/python/viewx_interpreter.py`);

        console.log("viewModel: " + `${workspaceUri}/${this.activeViewXModel}`);
        console.log("model: " + modelUri.fsPath);
        console.log("before uri: " + `${this.extensionPath}/src/python/viewx_interpreter.py`);
        console.log("pyInterpreter: " + pyInterpreterUri.fsPath);

        pythonShell.run(pyInterpreterUri.fsPath, options, function (err, results) {
            // if (err) throw err;
            // results is an array consisting of messages collected during execution
            console.log("results: " + results);
            callback();
        });
        this.lastPreviewedFileUri = modelUri;
    }

    public openModelPreview() {
        // set ViewColumn (VS Code supports up to 3 columns max)
        let viewColumn: vscode.ViewColumn;
        if (vscode.window.activeTextEditor.viewColumn < 3) {
            viewColumn = vscode.window.activeTextEditor.viewColumn + 1;
        } else {
            viewColumn = 1;
        }
        let fileToPreview: vscode.Uri = vscode.window.activeTextEditor.document.uri;
        // finally get URI of the preview file (hosted on web server) and show it
        const previewUri = Utility.getUriOfPreviewHtml();
        console.log("previewUri: " + previewUri);
        vscode.commands.executeCommand("vscode.previewHtml", previewUri, viewColumn, "Preview with WebServer").then(() => {
            this.lastNumberOfOpenedDocuments = vscode.window.visibleTextEditors.length;
            this.previewColumn = viewColumn;
        }, (reason) => {
                vscode.window.showErrorMessage(reason);
        });
    }

    public startServer() {
        Utility.setRandomPort();
        const port = this.serverConfig.get("port") as number;
        const proxy = this.serverConfig.get("proxy") as string;
        const isSync = this.serverConfig.get("sync") as boolean;
        // const rootPath = vscode.workspace.rootPath || Utility.getOpenFilePath(vscode.window.activeTextEditor.document.fileName);
        // instead of workspace path, we now pass root path of the preview.html file (within extension root folder)
        const rootPath = Utility.getOpenFilePath(Utility.getPreviewHtmlFilePath());
        Server.start(rootPath, port, isSync, proxy);
    }

    public resumeServer() {
        Server.stop();
        this.startServer();
    }

    public interpretCommand(command: string) {
        if (command.startsWith("select")) {
            console.log("select command");
            let args = command.split("|");
            let offset = Number(args[1].split("=")[1]);
            let offset_end = Number(args[2].split("=")[1]);

            vscode.window.visibleTextEditors.forEach(editor => {
                // select only if previewed file is visible in some of the editors
                if (editor.document.uri.path === this.lastPreviewedFileUri.path) {
                    let startPosition = editor.document.positionAt(offset);
                    let endPosition = editor.document.positionAt(offset_end);
                    // reverse selection (cursor is at the beginning of the definition)
                    vscode.window.visibleTextEditors[0].selection = new vscode.Selection(endPosition, startPosition);
                    vscode.window.visibleTextEditors[0].revealRange(
                        new vscode.Range(startPosition, endPosition), vscode.TextEditorRevealType.InCenter);
                }
            });
        }
        else {
            console.log("unknown command: " + command);
        }
    }

}