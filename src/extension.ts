'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
// import pythonShell module for executing python scripts
import * as pythonShell from 'python-shell'
// import modules for web server preview
import { BrowserContentProvider } from "./browserContentProvider";
import { Server } from "./server";
import { Utility } from "./utility";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "viewx-vscode" is now active!');
    console.log('Running viewX initialization');

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
    // vscode.workspace.onDidSaveTextDocument((e) => {
    //     Server.reload(e.fileName);
    // });

    disposables.push(vscode.commands.registerCommand('viewx.testPaths', () => {
        let rootPath = vscode.workspace.rootPath;
        let previewFile = `file:///${rootPath}//preview.html`;
        vscode.window.showInformationMessage(rootPath);

        let testPreview = vscode.Uri.parse('file:///C://Users//dkupco//Documents//GitHub//viewX-vscode//graph_preview//preview.html');
        // vscode.workspace.openTextDocument(testPreview).then(doc => {
        //     // vscode.window.showTextDocument(doc);
        // });

        console.log(rootPath)
        console.log(previewFile);
        console.log(testPreview);
        console.log(previewFile);
        
        console.log(process.env['MASTER'])
        // console.log(vscode.window.activeTextEditor.document.fileName);
        // console.log(vscode.window.activeTextEditor.document.uri.fsPath);

        // let currentModel = vscode.window.activeTextEditor.document.uri.fsPath;

        console.log(vscode)
        console.log(vscode.window);
        // vscode.window.showInputBox().then(input => {
        //     vscode.window.showInformationMessage(input);
        // });

        // vscode.commands.executeCommand('vscode.openFolder').then(folder => {
        //     console.log('opening folder...');
        //     console.log(folder);
        //     console.log(vscode.workspace.rootPath);
            
            
        // }) ;

        console.log('ext path');
        let extPath = vscode.extensions.getExtension('dkupco.viewx-vscode').extensionPath;
        console.log(extPath);
        let previewPath = `${extPath}\\graph_preview\\preview.html`;
        console.log(previewPath);

        console.log(vscode.window.activeTextEditor.document.fileName);
        
        
        
        // let a = vscode.extensions.getExtension('viewx')
        // let b = vscode.extensions.getExtension('dkupco.viewx-vscode')
        // vscode.commands.executeCommand("vscode.previewHtml", previewFile, 3, "Preview without WebServer").then(() => {
        // }, (reason) => {
        //     vscode.window.showErrorMessage(reason);
        // });

    }));

    disposables.push(vscode.commands.registerCommand('viewx.initProject', () => {
        // vscode.window.showInformationMessage('Please select a folder which you want to setup as a ViewX project!');
        vscode.window.showInputBox({
            prompt: 'Please insert a path where you want to setup a ViewX project!',
            placeHolder: 'Path to the project',
            ignoreFocusOut: true
        }).then(result => {
            if (result !== undefined) {
                let projectPath = result;
                vscode.window.showInputBox({
                    prompt: 'Please insert a name of the ViewX project!',
                    placeHolder: 'Name of the project',
                    ignoreFocusOut: true
                }).then(result => {
                    let projectName = result;
                    let options = {
                        mode: 'text',
                        pythonPath: `${viewXExtension.viewXVEnv}/Scripts/python`,
                        // pythonPath: 'C:/Users/dkupco/VEnvs/viewx/Scripts/python',
                        args: [projectPath, projectName]
                    };
            
                    let pyInterpreter = `${viewXExtension.extensionPath}/src/python/viewx_init_project.py`;
                    // let pyInterpreter = 'C:/Users/dkupco/Documents/GitHub/viewX-vscode/src/python/viewx_init_project.py';
            
                    pythonShell.run(pyInterpreter, options, function (err, result) {
                        // if (err) throw err;
                        // results is an array consisting of messages collected during execution
                        // console.log('results: ' + result);
                        let projectFolder = vscode.Uri.parse(projectPath + '/' + projectName);
                        if (result == 'success') {
                            vscode.commands.executeCommand('vscode.openFolder', projectFolder, true);
                        }
                    });       
                });
            }
        });
        
        // vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(''), true).then(folder => {
        //     console.log('opening folder...');
        //     console.log(folder);
        //     console.log(vscode.workspace.rootPath);
            
            
        // }, reject => {
        //     console.log('rejected');
        //     console.log(reject);
            
        // });

        // console.log('after choice');
        
        // console.log(vscode.workspace.rootPath);

        // console.log(vscode.workspace.asRelativePath);
        

    }));

    disposables.push(vscode.commands.registerCommand('viewx.setActiveModel', () => {
        let currentModel = vscode.window.activeTextEditor.document.uri.fsPath;
        if (currentModel.endsWith('.vx')) {
            viewXExtension.activeViewModel = currentModel;
            vscode.window.showInformationMessage('Current viewX model set as active successfully!');
        }
        else {
            vscode.window.showErrorMessage('Currently active document is not a valid viewX model!');
        }
        // let testPreview = vscode.Uri.parse('file:///D:/Programiranje/MasterRad/samples/textx-vscode/viewX/graph_preview/preview.html');
        let testPreview = vscode.Uri.parse('file:///C:/Users/dkupco/Documents/GitHub/viewX-vscode/graph_preview/preview.html');
        // vscode.commands.executeCommand('markdown.showPreviewToSide', testPreview);
        // vscode.commands.executeCommand('vscode.previewHtml', testPreview, vscode.ViewColumn.Two, 'My Window')
        // .then(null, error => console.error(error));
        // });
        
        // vscode.workspace.openTextDocument(testPreview).then(document => {
        //     console.log('opened: ' + testPreview.fsPath);
        //     vscode.window.showTextDocument(document);
        // });
        // vscode.commands.executeCommand('extension.preview', testPreview);
    }));

    disposables.push(vscode.commands.registerCommand('viewx.viewModel', () => {
        let rootPath = vscode.workspace.rootPath;
        let previewFile = `file:///${rootPath}\\graph_preview\\preview.html`;
        vscode.window.showInformationMessage(previewFile);

        let testPreview = vscode.Uri.parse('file:///C:/Users/dkupco/Documents/GitHub/viewX-vscode/graph_preview/preview.html');
        // vscode.workspace.openTextDocument(testPreview).then(doc => {
        //     // vscode.window.showTextDocument(doc);
        // });

        console.log(process.env['MASTER'])
        console.log(vscode.window.activeTextEditor.document.fileName);
        console.log(vscode.window.activeTextEditor.document.uri.fsPath);

        let currentModel = vscode.window.activeTextEditor.document.uri.fsPath;

        let options = {
            mode: 'text',
            pythonPath: `${viewXExtension.viewXVEnv}/Scripts/python`,
            // pythonOptions: ['-u'],
            // scriptPath: 'path/to/my/scripts',
            args: [viewXExtension.activeViewModel, currentModel]
        };

        //let pyInterpreter = vscode.Uri.parse('file:///D:/Programiranje/MasterRad/viewx-vscode/src/viewx_interpreter.py');
        let pyInterpreter = `${viewXExtension.extensionPath}/src/viewx_interpreter.py`;

        pythonShell.run(pyInterpreter, options, function (err, results) {
            // if (err) throw err;
            // results is an array consisting of messages collected during execution
            console.log('results: ' + results);
        });

        // vscode.commands.executeCommand('markdown.showPreviewToSide', testPreview);
        vscode.workspace.openTextDocument(testPreview).then(document => {
            console.log('opened: ' + testPreview.fsPath);
            vscode.window.showTextDocument(document);
        });
        vscode.commands.executeCommand('extension.preview');
    }));

    // web server preview commands

    disposables.push(vscode.commands.registerCommand("viewx.preview", () => {
        const previewUri = Utility.getUriOfPreviewHtml();

        // set ViewColumn
        let viewColumn: vscode.ViewColumn;
        if (vscode.window.activeTextEditor.viewColumn < 3) {
            viewColumn = vscode.window.activeTextEditor.viewColumn + 1;
        } else {
            viewColumn = 1;
        }

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
    console.log('start server root path: ' + rootPath);
    
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
    activeViewModel: string;
    extensionPath: string;
    viewXVEnv: string;

    constructor() {
        const options = vscode.workspace.getConfiguration("viewX");
        this.extensionPath = vscode.extensions.getExtension(options.get("fullExtensionName")).extensionPath;
        let envVar: string = options.get("envVariableName");
        this.viewXVEnv = process.env[envVar];
        console.log('ext path: ' + this.extensionPath);
        console.log('viewXVEnv: ' + this.viewXVEnv);
    }
}