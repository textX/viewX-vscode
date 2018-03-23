import * as vscode from "vscode";
import { ViewXConfig } from "./viewXConfig";

export class Utility {

    private static serverConfig: vscode.WorkspaceConfiguration;
    private static previewHtmlFileName: string = "preview.html";

    public static initialize() {
        Utility.serverConfig = vscode.workspace.getConfiguration("viewX.previewServer");
    }

    public static getUriOfPreviewHtml(viewXProjectConfig: ViewXConfig): vscode.Uri {
        const port = viewXProjectConfig.project.previewServerPort;
        const proxy = Utility.serverConfig.get("proxy") as string;

        let previewUri: vscode.Uri;
        if (proxy === "") {
            previewUri = vscode.Uri.parse(`http://localhost:${port}/${this.previewHtmlFileName}`);
        }
        else {
            let uri = vscode.Uri.parse(`http://${proxy}/${this.previewHtmlFileName}`);
            let host = uri.authority.split(":")[0];
            previewUri = vscode.Uri.parse(`http://${host}:${port}/${uri.path}`)
        }
        return previewUri;
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
        let result = path;
        // convert all \ to /
        while(result.indexOf("\\") > -1) {
            result = result.replace("\\", "/");
        }

        if (result.indexOf("/") > -1) {
            return result.substring(result.lastIndexOf("/") + 1);
        }
        else {
            return result;
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

    public static getAvailablePortPromiseAsync(port: number): Promise<number> {
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
                        http.close(() => {
                            resolve(freePort);
                        });
                    });
                }
                else {
                    console.log("getAvailablePortPromise rejected!!!");
                    console.log(error);
                    reject(error);
                }
            });
        });
    }
}

Utility.initialize();