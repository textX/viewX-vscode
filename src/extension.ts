'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
// import pythonShell module for executing python scripts
import * as pythonShell from 'python-shell'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "viewx-vscode" is now active!');
    console.log('Running viewX initialization');

    let disposables = [];

    let viewXExtension = new ViewXExtension();

    disposables.push(vscode.commands.registerCommand('viewx.initProject', () => {
        let rootPath = vscode.workspace.rootPath;
        let previewFile = `file:///${rootPath}\\graph_preview\\preview.html`;
        vscode.window.showInformationMessage(previewFile);

        let testPreview = vscode.Uri.parse('file:///D://Data//Programiranje//MasterRad//viewx-vscode//graph_preview//preview.html');
        // vscode.workspace.openTextDocument(testPreview).then(doc => {
        //     // vscode.window.showTextDocument(doc);
        // });

        console.log(rootPath)
        console.log(previewFile);
        console.log(testPreview);

        console.log(process.env['MASTER'])
        // console.log(vscode.window.activeTextEditor.document.fileName);
        // console.log(vscode.window.activeTextEditor.document.uri.fsPath);

        // let currentModel = vscode.window.activeTextEditor.document.uri.fsPath;

        console.log(vscode)
        console.log(vscode.window);
        // vscode.window.showInputBox().then(input => {
        //     vscode.window.showInformationMessage(input);
        // });

        vscode.commands.executeCommand('vscode.openFolder').then(folder => {
            console.log('opening folder...');
            console.log(folder);
            console.log(vscode.workspace.rootPath);
            
            
        }) ;

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
            pythonPath: 'C:/Users/dkupco/VEnvs/viewx/Scripts/python',
            // pythonOptions: ['-u'],
            // scriptPath: 'path/to/my/scripts',
            args: [viewXExtension.activeViewModel, currentModel, 'value3']
        };

        //let pyInterpreter = vscode.Uri.parse('file:///D:/Programiranje/MasterRad/viewx-vscode/src/viewx_interpreter.py');
        let pyInterpreter = 'C:/Users/dkupco/Documents/GitHub/viewX-vscode/src/viewx_interpreter.py';

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