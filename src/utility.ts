import * as vscode from "vscode";

export class Utility {

    private static serverConfig: vscode.WorkspaceConfiguration;
    private static previewHtmlRelativePath: string = "/graph_preview/preview.html";

    public static initialize() {
        Utility.serverConfig = vscode.workspace.getConfiguration("viewX.previewServer");
    }

    public static getUriOfPreviewHtml() {
        const port = Utility.serverConfig.get("port") as number;
        const proxy = Utility.serverConfig.get("proxy") as string;
        let relativePath = Utility.getFileNameFromFileUriPath(Utility.previewHtmlRelativePath);

        // if (vscode.workspace.rootPath === undefined) {
        //     let paths = relativePath.split("/");
        //     relativePath = paths[paths.length - 1];
        // }

        if (proxy === "") {
            return vscode.Uri.parse(`http://localhost:${port}/${relativePath}`);
        }

        let uri = vscode.Uri.parse(`http://${proxy}`);
        let host = uri.authority.split(":")[0];
        return vscode.Uri.parse(`http://${host}:${port}/${uri.path}`);
    }

    public static getPreviewHtmlFileUri(): vscode.Uri {
        const extensionPath = vscode.extensions.getExtension("dkupco.viewx").extensionPath;
        const previewFullPath = vscode.Uri.file(extensionPath + Utility.previewHtmlRelativePath);
        return previewFullPath;
    }

    public static getPreviewHtmlRelativePath(): string {
        return Utility.previewHtmlRelativePath;
    }

    public static setRandomPort() {
        let port = Utility.serverConfig.get("port") as number;
        if (!port) {
            // dynamic ports (49152–65535)
            port = Math.floor(Math.random() * 16383 + 49152);
            Utility.serverConfig.update("port", port, false)
            .then(() => {
                vscode.window.showInformationMessage(`change viewx.previewServer.port setting to ${port}`);
            });
        }
    }

    /**
     * Returns parent path of the relative path (removes the part after the last '/' sign).
     * @param relativePath
     */
    public static getParentPath(relativePath: string) {
        let paths = relativePath.split("/");
        // remove file name.
        paths.pop();
        let parentPath = vscode.Uri.file(paths.join("/"));
        return parentPath.fsPath;
    }

    // could be improved with partial name matching, e.g. test*.txt or *test.txt
    public static isFileMatchingPattern(fileName: string, pattern: string): boolean {
        if (pattern === "*.*" || fileName === pattern) {
            return true;
        }
        if (pattern.startsWith("*.")) {
            // joining back to match possible multiple extensions
            if (fileName.split(".").slice(1).join(".") === pattern.split(".").slice(1).join(".")) {
                return true;
            }
        }
        return false;
    }

    public static getFileNameFromFileUriPath(path: string): string {
        if (path.indexOf("/") > -1) {
            return path.substring(path.lastIndexOf("/") + 1);
        }
        else {
            return path;
        }
    }

    public static getPositionFromTextXError(error: string): vscode.Position {
        let index: number = error.indexOf("at (");
        let values: string[] = error.substring(index + 4, error.trim().length - 1).split(",");
        let line: number = Number(values[0].trim());
        let column: number = Number(values[1].trim());
        // values are zero-based
        return new vscode.Position(line - 1, column - 1);
    }

    public static getWordFromTextXError(error: string): string {
        let start: number = error.indexOf("object \"");
        let end: number = error.indexOf("\" of");
        let word: string = error.substring(start + 8, end);
        return word;
    }

    public static getAvailablePortPromise(port: number): Promise<number> {
        // create express app
        var app = require("express")();
        // pass app to node.js server
        var http = require("http").Server(app);
        // import portscanner module to find first available port
        var portscanner = require("portscanner");
        // return a promise, if available port is found return it after server is started successfully
        // this way we can react on success and use found port after everything is completed asynchronously
        return new Promise(function(resolve, reject) {
            portscanner.findAPortNotInUse(port, function(error, freePort: number) {
                if (freePort > -1) {
                    http.listen(freePort, function(){
                        console.log("Listening on free port: " + freePort);
                        http.close(() => {
                            console.log("Closing the server on: " + freePort);
                            resolve(freePort);
                        });
                    });
                }
                else {
                    reject(error);
                }
            });
        });
    }
}

Utility.initialize();