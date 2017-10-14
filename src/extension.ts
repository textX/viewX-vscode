"use strict"
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"
// import pythonShell module for executing python scripts
import * as pythonShell from "python-shell"
// import modules for web server preview
import { BrowserContentProvider } from "./browserContentProvider";
import { PreviewServer } from "./preview-server";
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

    let socketPort: number = viewXExtension.socketServerConfig.get("port") as number;
    let usedPorts: Array<number> = viewXExtension.socketServerConfig.get("usedPorts") as Array<number>;

    // start socket server asynchronously, promise is returned
    socketserver.startSocketServer(socketPort).then(function(usedPort) {
		viewXExtension.activeSocketPort = usedPort;
		if (viewXExtension.activeSocketPort > -1 && !(usedPorts.indexOf(viewXExtension.activeSocketPort) > -1)) {
			usedPorts.push(viewXExtension.activeSocketPort);
			viewXExtension.socketServerConfig.update("usedPorts", usedPorts, true);
		}
	}).catch(function(error) {
		console.log("Failed to start socket server: " + error);
	});

    // connect to socket server and join extension room
    const socket = io(`http://localhost:${socketPort}`);
    socket.emit("ext-room", viewXExtension.socketServerConfig.get("debugMode") as boolean);
    socket.on("ext-receive-command", function(command) {
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
        const settings = viewXExtension.previewServerConfig.get("isWatchConfiguration") as boolean;
        if (settings) {
            viewXExtension.resumePreviewServer();
        }
    });

    vscode.workspace.onDidSaveTextDocument((e) => {
        if (viewXExtension.activeViewXModel !== undefined) {
            let activeModelUri: vscode.Uri = vscode.window.activeTextEditor.document.uri;
            if (viewXExtension.isPreviewActive && activeModelUri.path === viewXExtension.lastPreviewedFileUri.path) {
                // re-generate preview html file when model file is saved (apply changes)
                viewXExtension.generatePreviewHtmlForModelAsync(activeModelUri, () => {
                    // when file is saved, reload browser.
                    viewXExtension.openModelPreview(() => { PreviewServer.reload("preview.html"); });
                });
            }
        }
    });

    vscode.workspace.onDidCloseTextDocument(document => {
        // https://github.com/Microsoft/vscode/issues/33728
        // there is no way to find out if file has been closed
        // it is good that close event is not fired while preview is visible (switched from another view column)
        // so when it is not visible we can set the flag and trigger preview showing again
        // since it will not create another tab if it is not actually closed, it will create new if it is
        if (document !== undefined && document.isClosed && document.uri.path === "/preview.html") {
            viewXExtension.isPreviewActive = false;
        }
    });

    // check whether newly active document can be previewed
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor !== undefined) {
            let activeModelUri: vscode.Uri = editor.document.uri;
            let fileName: string = Utility.getFileNameFromFileUriPath(activeModelUri.path);
            let viewXModel: string = viewXExtension.findMatchingViewXModel(fileName);
            viewXExtension.extensionConfig.update("canPreviewActiveDocument", (viewXModel !== undefined));
        }
    });

    disposables.push(vscode.commands.registerCommand("viewx.initProject", (explorerUri: vscode.Uri) => {
        // check if explorerUri is empty object (keyboard shortcut is used)
        if (Object.keys(explorerUri).length === 0) {
            vscode.window.showInputBox({
                prompt: "Please insert a path where you want to setup a ViewX project",
                placeHolder: "Path to the project",
                ignoreFocusOut: true
            }).then(result => initProject(result));
        }
        else {
            initProject(explorerUri.fsPath);
        }

        function initProject(path: string) {
            let projectPath = path;
            vscode.window.showInputBox({
                prompt: "Please insert a name of the ViewX project",
                placeHolder: "Name of the project",
                ignoreFocusOut: true
            }).then(result => {
                if (result !== undefined) {
                    let projectName = result;
                    let options = {
                        mode: "text",
                        pythonPath: `${viewXExtension.viewXVEnvPath}/Scripts/python`,
                        args: [projectPath, projectName]
                    };

                    let pyInterpreter = `${viewXExtension.extensionPath}/out/python/viewx_init_project.py`;

                    pythonShell.run(pyInterpreter, options, function (err, results) {
                        // if (err) throw err;
                        // results is an array consisting of messages collected during execution
                        let projectFolder = vscode.Uri.file(`${projectPath}/${projectName}`);
                        if (results && results.length > 0 && (results[0] as string).trim() === "success") { // "success" is returned by the .py script
                            vscode.commands.executeCommand("vscode.openFolder", projectFolder, true);
                        }
                    });
                }
            });
        };
    }));

    disposables.push(vscode.commands.registerCommand("viewx.previewModel", () => {
        let activeModelUri: vscode.Uri = vscode.window.activeTextEditor.document.uri;
        let fileName: string = Utility.getFileNameFromFileUriPath(activeModelUri.path);
        let viewXModel: string = viewXExtension.findMatchingViewXModel(fileName);
        if (viewXModel !== undefined) {
            viewXExtension.generatePreviewHtmlForModelAsync(activeModelUri, () => {
                viewXExtension.openModelPreview(() => {
                    PreviewServer.reload("preview.html");
                });
            });
        }
        else {
            vscode.window.showErrorMessage("There is no found viewX model that matches current file!");
        }
    }));

    disposables.push(vscode.commands.registerCommand("viewx.launchBrowser", () => {
        const uri = Utility.getUriOfPreviewHtml();
        return vscode.commands.executeCommand("vscode.open", uri);
    }));

    disposables.push(vscode.commands.registerCommand("viewx.stopPreviewServer", () => {
        PreviewServer.stop();
        vscode.window.showInformationMessage("Stop the PreviewServer successfully.");
    }));

    disposables.push(vscode.commands.registerCommand("viewx.resumePreviewServer", () => {
        viewXExtension.resumePreviewServer();
        vscode.window.showInformationMessage("Resume the PreviewServer.");
    }));

    disposables.push(vscode.commands.registerCommand("viewx.fitDefinition", () => {
        let cursorPosition = vscode.window.activeTextEditor.selection.start;
        let lineBeginning = new vscode.Position(cursorPosition.line, 0);
        let offset = vscode.window.activeTextEditor.document.offsetAt(lineBeginning);
        socket.emit("ext-send-command", `fit|offset=${offset}`);
    }));

    disposables.push(vscode.commands.registerCommand("viewx.showUsedPorts", () => {
        let usedPorts: Array<number> = viewXExtension.socketServerConfig.get("usedPorts") as Array<number>;
        vscode.window.showInformationMessage(`Port used by this instance: ${viewXExtension.activeSocketPort}. Other ports taken by socket.io server are: ${usedPorts}`);
    }));

    // subscribe all commands
    disposables.forEach(disposable => {
        context.subscriptions.push(disposable);
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    PreviewServer.stop();
    let usedPorts: Array<number> = this.viewXExtension.socketServerConfig.get("usedPorts") as Array<number>;
    if (this.viewXExtension.activeSocketPort > -1 && this.viewXExtension.activeSocketPort in usedPorts) {
        let idx: number = usedPorts.indexOf(this.viewXExtension.activeSocketPort);
        if (idx > -1) {
            usedPorts.splice(idx, 1);
            this.viewXExtension.socketServerConfig.update("usedPorts", usedPorts, true);
        }
    }
}

class ViewXExtension {
    // fixed values
    public extensionPath: string;
    public viewXVEnvPath: string;
    public extensionConfig: vscode.WorkspaceConfiguration;
    public previewServerConfig: vscode.WorkspaceConfiguration;
    public socketServerConfig: vscode.WorkspaceConfiguration;
    public activeSocketPort: number;

    // changeable values
    public viewXProjectConfig: ViewXConfig;
    public activeViewXModel: string;
    public lastPreviewedFileUri: vscode.Uri;
    public isPreviewActive: boolean;

    constructor() {
        this.extensionConfig = vscode.workspace.getConfiguration("viewX");
        this.previewServerConfig = vscode.workspace.getConfiguration("viewX.previewServer");
        this.socketServerConfig = vscode.workspace.getConfiguration("viewX.socketServer");
        this.extensionPath = vscode.extensions.getExtension(this.extensionConfig.get("fullExtensionName") as string).extensionPath;
        this.viewXVEnvPath = process.env[this.extensionConfig.get("envVariableName") as string];

        // if workspace is loaded, read viewX project configuration file
        let workspacePath = vscode.workspace.rootPath;
        if (workspacePath !== undefined) {
            // require external node module for loading json
            const loadJsonFile = require("load-json-file");
            try {
                // need to read config file synchronously, because we can end up using it while it has not been read yet
                this.viewXProjectConfig = loadJsonFile.sync(`${workspacePath}/vxconfig.json`);
                // TODO: enable running multiple instances
                // start browser sync server only if it is valid viewX project
                this.startPreviewServer();
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

    public generatePreviewHtmlForModelAsync(modelUri: vscode.Uri, callback?: Function) {
        let envPythonUri = vscode.Uri.file(`${this.viewXVEnvPath}/Scripts/python`);
        let workspaceUri = vscode.workspace.rootPath;
        let options = {
            mode: "text",
            pythonPath: envPythonUri.fsPath,
            // pythonOptions: ["-u"],
            // scriptPath: "path/to/my/scripts",
            args: [`${workspaceUri}/${this.activeViewXModel}`, modelUri.fsPath, this.socketServerConfig.get("port")]
        };

        let pyInterpreterUri = vscode.Uri.file(`${this.extensionPath}/out/python/viewx_interpreter.py`);

        pythonShell.run(pyInterpreterUri.fsPath, options, function (err, results) {
            // if (err) throw err;
            // results is an array consisting of messages collected during execution
            if (results && results.length > 0) {
                if ((results[0] as string).trim() === "success") {
                    if (callback) {
                        callback();
                    }
                }
                else if((results[0] as string).trim() === "error") {
                    vscode.window.showErrorMessage(results[1] as string);
                }
                else {
                    vscode.window.showErrorMessage("Unexpected error!");
                }
            }
        });
        this.lastPreviewedFileUri = modelUri;
    }

    public openModelPreview(callback?: Function) {
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
        vscode.commands.executeCommand("vscode.previewHtml", previewUri, viewColumn, "viewX model preview").then(() => {
            this.isPreviewActive = true;
            if (callback) {
                callback();
            }
        }, (reason) => {
                vscode.window.showErrorMessage(reason);
        });
    }

    public startPreviewServer() {
        // Utility.setRandomPort();
        const port = this.previewServerConfig.get("port") as number;
        const proxy = this.previewServerConfig.get("proxy") as string;
        const isSync = this.previewServerConfig.get("sync") as boolean;
        // const rootPath = vscode.workspace.rootPath || Utility.getOpenFilePath(vscode.window.activeTextEditor.document.fileName);
        // instead of workspace path, we now pass root path of the preview.html file (within extension root folder)
        const rootPath = Utility.getOpenFilePath(Utility.getPreviewHtmlFilePath());
        PreviewServer.start(rootPath, port, isSync, proxy);
    }

    public resumePreviewServer() {
        PreviewServer.stop();
        this.startPreviewServer();
    }

    public interpretCommand(command: string) {
        if (command.startsWith("select")) {
            let args = command.split("|");
            let offset = Number(args[1].split("=")[1]);
            let offset_end = Number(args[2].split("=")[1]);

            vscode.window.visibleTextEditors.forEach(editor => {
                // select only if previewed file is visible in some of the editors
                if (editor.document.uri.path === this.lastPreviewedFileUri.path) {
                    let startPosition = editor.document.positionAt(offset);
                    let endPosition = editor.document.positionAt(offset_end);
                    // reverse selection (cursor is at the beginning of the selection)
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