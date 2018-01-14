import * as browserSync from "browser-sync";

export class PreviewServer {

    private static serverNamePrefix: string = "viewx-preview-";

    public static start(serverName: string, rootPath: string, port: number, isSync: boolean, proxy = "") {
        let fullServerName = this.serverNamePrefix + serverName;
        // get browserSync instance.
        let bs: browserSync.BrowserSyncInstance;
        if (!browserSync.has(fullServerName)) {
            bs = browserSync.create(fullServerName);
            console.log("BrowserSync created server: " + fullServerName);
        } else {
            bs = browserSync.get(fullServerName);
            console.log("BrowserSync got server: " + fullServerName);
        }

        let options: browserSync.Options;

        if (proxy === "") {
            options = {
                server: {
                    baseDir: rootPath,
                    directory: true
                },
                open: false,
                port: port,
                codeSync: isSync,
                online: false // enable offline usage
            };
        } else {
            options = {
                proxy: proxy,
                serveStatic: ["."]
            };
        }

        bs.init(options, (err) => {
            if (err) {
                console.log(err);
                bs.notify("Error is occured.");
            }
            console.log("Browser Sync initialized");
            console.log(options);
        });
    }

    public static stop(serverName: string) {
        let fullServerName = this.serverNamePrefix + serverName;
        if (browserSync.has(fullServerName)) {
            browserSync.get(fullServerName).exit();
        }
    }

    public static reload(serverName: string, fileName: string) {
        let fullServerName = this.serverNamePrefix + serverName;
        if (browserSync.has(fullServerName)) {
            browserSync.get(fullServerName).reload(fileName);
        }
    }
}
