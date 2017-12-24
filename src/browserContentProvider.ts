"use strict";

import * as vscode from "vscode";

export class BrowserContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private uri: vscode.Uri;

    constructor(uri: vscode.Uri) {
        this.uri = uri;
    }

    public provideTextDocumentContent() {
        // const editor = vscode.window.activeTextEditor;
        // if (editor.document.languageId !== "html") {
        //     return `
		// 		<body>
		// 			Active editor doesn't show a HTML document
		// 		</body>`;
        // }

        return `<style>iframe { background-color: white } </style>
                <iframe src="${this.uri}" frameBorder="0" width="100%" height="1000px" />`;
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        if (uri === undefined) {
            uri = this.uri;
        }
        this._onDidChange.fire(uri);
    }
}
