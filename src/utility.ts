import * as vscode from "vscode";

export class Utility {

    public static getUriOfPreviewHtml() {
        const previewFullPath = this.getFilePathOfPreviewHtml();

        const ps_options = vscode.workspace.getConfiguration("previewServer");
        const port = ps_options.get("port") as number;
        const proxy = ps_options.get("proxy") as string;
        // let relativePath = vscode.workspace.asRelativePath(previewFullPath);
        let relativePath = this.getPreviewHtmlRelativePath();

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

    public static getFilePathOfPreviewHtml(): string {
        const vx_options = vscode.workspace.getConfiguration("viewX");
        const extensionPath = vscode.extensions.getExtension(vx_options.get("fullExtensionName") as string).extensionPath;
        const previewFullPath = extensionPath + (vx_options.get("previewFilePath") as string);
        return previewFullPath;
    }

    public static getPreviewHtmlRelativePath(): string {
        const vx_options = vscode.workspace.getConfiguration("viewX");
        const fullExtensionName = vx_options.get("fullExtensionName") as string;
        const previewFullPath = fullExtensionName.split('.')[1] + (vx_options.get("previewFilePath") as string);
        return previewFullPath;
    }

    public static setRandomPort() {
        const ps_options = vscode.workspace.getConfiguration("previewServer");
        let port = ps_options.get("port") as number;
        if (!port) {
            // dynamic ports (49152–65535)
            port = Math.floor(Math.random() * 16383 + 49152);
            ps_options.update("port", port, false)
            .then(() => {
                vscode.window.showInformationMessage(`change previewServer.port setting to ${port}`);
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
}
