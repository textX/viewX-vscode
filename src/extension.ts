'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import pythonShell module for executing python scripts
import * as pythonShell from 'python-shell';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "viewx-vscode" is now active!');

    let disposables = [];

    let viewXExtension = new ViewXExtension();

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
        let testPreview = vscode.Uri.parse('file:///D:/Programiranje/MasterRad/viewx-vscode/graph_preview/preview.html');
        vscode.commands.executeCommand('markdown.showPreviewToSide', testPreview);
    }));

    disposables.push(vscode.commands.registerCommand('viewx.viewModel', () => {
        let rootPath = vscode.workspace.rootPath;
        let previewFile = `file:///${rootPath}\\graph_preview\\preview.html`;
        vscode.window.showInformationMessage(previewFile);

        let testPreview = vscode.Uri.parse('file:///D:/Programiranje/MasterRad/viewx-vscode/graph_preview/preview.html');
        // vscode.workspace.openTextDocument(testPreview).then(doc => {
        //     // vscode.window.showTextDocument(doc);
        // });

        console.log(process.env['MASTER'])
        console.log(vscode.window.activeTextEditor.document.fileName);
        console.log(vscode.window.activeTextEditor.document.uri.fsPath);

        let currentModel = vscode.window.activeTextEditor.document.uri.fsPath;

        let options = {
            mode: 'text',
            pythonPath: 'C:/Users/DaneX/VEnvs/viewX/Scripts/python',
            // pythonOptions: ['-u'],
            // scriptPath: 'path/to/my/scripts',
            args: [viewXExtension.activeViewModel, currentModel, 'value3']
        };

        //let pyInterpreter = vscode.Uri.parse('file:///D:/Programiranje/MasterRad/viewx-vscode/src/viewx_interpreter.py');
        let pyInterpreter = 'D:/Programiranje/MasterRad/viewx-vscode/src/viewx_interpreter.py';

        pythonShell.run(pyInterpreter, options, function (err, results) {
            // if (err) throw err;
            // results is an array consisting of messages collected during execution
            console.log('results: ' + results);
        });

        vscode.commands.executeCommand('markdown.showPreviewToSide', testPreview);
    }));

    // subscribe all commands
    disposables.forEach(disposable => {
        context.subscriptions.push(disposable); 
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class ViewXExtension {
    activeViewModel: string;

    constructor() {
    }
}