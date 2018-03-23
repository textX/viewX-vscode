import * as vscode from "vscode";
// import viewX configuration module
import { ViewXConfig } from "./viewXConfig"
import { Utility } from "./utility";
import { PreviewServer } from "./preview-server";
import { BrowserContentProvider } from "./browserContentProvider";
// import pythonShell module for executing python scripts
import * as pythonShell from "python-shell"

let vxProjDirName: string = "vxproj";
let previewFileName: string = "preview.html";

export class ViewXExtension {
    // fixed values
    public extensionPath: string;
    public viewXVEnvPath: string;
    public workspacePath: string;
    public projectName: string;
    public extensionConfig: vscode.WorkspaceConfiguration;
    public previewServerConfig: vscode.WorkspaceConfiguration;
    public socketServerConfig: vscode.WorkspaceConfiguration;
    public disposables: vscode.Disposable[];
    public previewFileName: string;

    // changeable values
    public viewXProjectConfig: ViewXConfig;
    public activeViewXModel: string;
    public lastPreviewedFileUri: vscode.Uri;
    public isPreviewActive: boolean;

    constructor(context: vscode.ExtensionContext, disposables: vscode.Disposable[]) {
        this.extensionConfig = vscode.workspace.getConfiguration("viewX");
        this.previewServerConfig = vscode.workspace.getConfiguration("viewX.previewServer");
        this.socketServerConfig = vscode.workspace.getConfiguration("viewX.socketServer");
        this.extensionPath = context.extensionPath;
        this.viewXVEnvPath = process.env[this.extensionConfig.get("envVariableName") as string];
        this.disposables = disposables;
        this.previewFileName = previewFileName;

        // if workspace is loaded, read viewX project configuration file
        this.workspacePath = vscode.workspace.rootPath;
        if (this.workspacePath !== undefined) {
            this.projectName = Utility.getFileNameFromFileUriPath(this.workspacePath);
            // require external node module for loading json
            const loadJsonFile = require("load-json-file");
            try {
                // need to read config file synchronously, because we can end up using it while it has not been read yet
                let configFile: vscode.Uri = vscode.Uri.file(`${this.workspacePath}/vxconfig.json`);
                this.viewXProjectConfig = loadJsonFile.sync(configFile.fsPath);
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
        this.viewXProjectConfig.viewXModels.patternMappings.forEach(map => {
            if(Utility.isFileMatchingPattern(fileName, map.pattern)) {
                viewXModel = map.modelName;
                return;
            }
        });
        this.activeViewXModel = viewXModel;
        return viewXModel;
    }

    public generatePreviewHtmlForModelAsync(modelUri: vscode.Uri, callback?: Function) {
        let envPythonUri: vscode.Uri = vscode.Uri.file(`${this.viewXVEnvPath}/python`);
        let workspacePath: string = vscode.workspace.rootPath;
        let pyScriptUri: vscode.Uri = vscode.Uri.file(`${this.extensionPath}/out/python`);
        let scriptName: string = "viewx_interpreter.py";
        // args
        let activeModel: vscode.Uri = vscode.Uri.file(`${workspacePath}/${this.activeViewXModel}`);
        let vxPath: vscode.Uri = vscode.Uri.file(`${workspacePath}/${vxProjDirName}`);
        let options = {
            mode: "text",
            pythonPath: envPythonUri.fsPath,
            // pythonOptions: ["-u"],
            // need to explicitly specify script path to be cross-platform functional
            scriptPath: pyScriptUri.fsPath,
            args: [activeModel.fsPath, modelUri.fsPath, vxPath.fsPath, this.viewXProjectConfig.project.socketPort]
        };

        // this context is overriden within the scope below
        // here we save a reference to a this context
        let thisRef: any = this;
        pythonShell.run(scriptName, options, function (err, results) {
            // if (err) throw err;
            // on some Linux distributions python fails if no __main__.py module exists
            // this is solved by specyfing the scriptPath to the python script directly
            // instead to it's directory
            if(err && err.exitCode === 1 && err.toString().indexOf("find '__main__' module") !== -1) {
                let fileUri = vscode.Uri.file(`${pyScriptUri.path}/${scriptName}`);
                options.scriptPath = fileUri.fsPath;
                // run the script again after fixing the script path
                pythonShell.run(scriptName, options, function (err, results) {
                    thisRef.handlePyShellResults(thisRef, results, callback);
                });
            }
            else {
                // results is an array consisting of messages collected during execution
                thisRef.handlePyShellResults(thisRef, results, callback);
            }
        });
        this.lastPreviewedFileUri = modelUri;
    }

    public handlePyShellResults(thisRef: any, results: string[], callback: Function) {
        if (results !== undefined) {
            if ((results[0] as string).trim() === "success") {
                if (callback) {
                    callback();
                }
            }
            else if((results[0] as string).trim() === "error") {
                vscode.window.showErrorMessage(results[1] as string);
                let position: vscode.Position = Utility.getPositionFromTextXError(results[1]);
                let word: string = Utility.getWordFromTextXError(results[1]);
                // position the cursor to the position from error
                thisRef.positionCursorTo(position, word);
            }
            else {
                vscode.window.showErrorMessage("Unexpected error!");
            }
        }
        else {
            console.log("No results have been returned from the python script!");
        }
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
        const previewUri = Utility.getUriOfPreviewHtml(this.viewXProjectConfig);
        vscode.commands.executeCommand("vscode.previewHtml", previewUri, viewColumn, `${Utility.getFileNameFromFileUriPath(fileToPreview.path)} - viewX Preview`).then(() => {
            this.isPreviewActive = true;
            if (callback) {
                callback();
            }
        }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    }

    public startPreviewServer() {
        // using socket port defined in viewX project config file
        let previewServerPort: number = undefined;
        if (this.viewXProjectConfig !== undefined) {
            previewServerPort = this.viewXProjectConfig.project.previewServerPort;
        }
        if (previewServerPort === undefined) {
            previewServerPort = this.previewServerConfig.get("port") as number;
        }

        // get available port
        Utility.getAvailablePortPromiseAsync(previewServerPort).then(availablePort => {
            this.viewXProjectConfig.project.previewServerPort = availablePort;

            const vxRootPath: vscode.Uri = vscode.Uri.file(`${vscode.workspace.rootPath}/${vxProjDirName}`);
            let serverName = Utility.getFileNameFromFileUriPath(vscode.workspace.rootPath);
            const proxy = this.previewServerConfig.get("proxy") as string;
            const isSync = this.previewServerConfig.get("sync") as boolean;
            PreviewServer.start(serverName, vxRootPath.fsPath, availablePort, isSync, proxy);

            // register BrowserContentProvider (instance specific)
            let previewUri: vscode.Uri = vscode.Uri.parse(`http://localhost:${availablePort}/${previewFileName}`);
            const provider = new BrowserContentProvider(previewUri);
            const registration = vscode.workspace.registerTextDocumentContentProvider("http", provider);
            this.disposables.push(registration);
        }).catch(error => {
            console.log("viewXExtension catch promise: " + error);
        });
    }

    public resumePreviewServer() {
        PreviewServer.stop(this.projectName);
        const vxRootPath: vscode.Uri = vscode.Uri.file(`${vscode.workspace.rootPath}/${vxProjDirName}`);
        const port = this.viewXProjectConfig.project.previewServerPort;
        const proxy = this.previewServerConfig.get("proxy") as string;
        const isSync = this.previewServerConfig.get("sync") as boolean;
        PreviewServer.start(this.projectName, vxRootPath.fsPath, port, isSync, proxy);
    }

    public interpretCommand(command: string) {
        if (command.startsWith("select")) {
            let args = command.split("|");
            let offset = Number(args[1].split("=")[1]);
            let offset_end = Number(args[2].split("=")[1]);

            // we must iterate because the focus is on preview file and when we receive a command from it
            // we select the textX model editor, which is still visible but not active
            vscode.window.visibleTextEditors.forEach(editor => {
                // select only if previewed file is visible in some of the editors
                if (editor.document.uri.path === this.lastPreviewedFileUri.path) {
                    let startPosition = editor.document.positionAt(offset);
                    let endPosition = editor.document.positionAt(offset_end);
                    // reverse selection (cursor is at the beginning of the selection)
                    editor.selection = new vscode.Selection(endPosition, startPosition);
                    editor.revealRange(new vscode.Range(startPosition, endPosition), vscode.TextEditorRevealType.InCenter);
                }
            });
        }
        else {
            console.log("unknown command: " + command);
        }
    }

    public positionCursorTo(position: vscode.Position, word?: string) {
        let activeEditor = vscode.window.activeTextEditor;
        let length = 0;
        if (word !== undefined) {
            length += word.length;
        }

        // index of the first character (without leading whitespaces) is the indentation length
        let line = activeEditor.document.lineAt(position.line).text;
        let indentation = line.indexOf(line.trim()[0]);
        // select the word if defined
        let startPosition = new vscode.Position(position.line, indentation + position.character);
        let endPosition = new vscode.Position(position.line, indentation + position.character + length);
        activeEditor.selection = new vscode.Selection(startPosition, endPosition);
        activeEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }

}