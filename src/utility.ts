import * as vscode from "vscode";

export class Utility {

    private static extensionConfig: vscode.WorkspaceConfiguration;
    private static serverConfig: vscode.WorkspaceConfiguration;

    public static initialize() {
        Utility.extensionConfig = vscode.workspace.getConfiguration("viewX");
        Utility.serverConfig = vscode.workspace.getConfiguration("viewX.previewServer");
    }

    public static getUriOfPreviewHtml() {
        const port = Utility.serverConfig.get("port") as number;
        const proxy = Utility.serverConfig.get("proxy") as string;
        let relativePath = Utility.getFileNameFromFileUriPath(Utility.extensionConfig.get("previewFilePath"));

        // if (vscode.workspace.rootPath === undefined) {
        //     let paths = relativePath.split("/");
        //     relativePath = paths[paths.length - 1];
        // }

        if (proxy === "") {
            return vscode.Uri.parse(`http://localhost:${port}/${relativePath}`);
        }

        let uri = vscode.Uri.parse(`http://${proxy}`);
        let host = uri.authority.split(":")[0];
        return vscode.Uri.parse(`http://${host}:3000/${uri.path}`);
    }

    public static getPreviewHtmlFilePath(): string {
        const extensionPath = vscode.extensions.getExtension(Utility.extensionConfig.get("fullExtensionName") as string).extensionPath;
        const previewFullPath = vscode.Uri.file(extensionPath + (Utility.extensionConfig.get("previewFilePath") as string));
        return previewFullPath.fsPath;
    }

    public static getPreviewHtmlRelativePath(): string {
        const previewRelativePath = Utility.extensionConfig.get("previewFilePath") as string;
        return previewRelativePath;
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
     * When vscode.workspace.rootPath is undefined (When we use `open file`, this value will be undefined),
     * we use filepath without file name.
     * @param relativePath
     */
    public static getOpenFilePath(relativePath: string) {
        let paths = relativePath.split("\\");
        // remove file name.
        paths.pop();
        return paths.join("\\");
    }

    // could be improved with partial name matching, e.g. test*.txt or *test.txt
    public static isFileMatchingFilter(fileName: string, filter: string): boolean {
        if (filter === "*.*" || fileName === filter) {
            return true;
        }
        if (filter.startsWith("*.")) {
            // joining back to match possible multiple extensions
            if (fileName.split(".").slice(1).join(".") === filter.split(".").slice(1).join(".")) {
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
}

Utility.initialize();