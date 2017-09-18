import * as browserSync from "browser-sync";

export class Server {

    private static serverName: string = "viewx-preview-server";

    public static start(rootPath: string, port: number, isSync: boolean, proxy = "") {
        // get browserSync instance.
        let bs: browserSync.BrowserSyncInstance;
        if (!browserSync.has(this.serverName)) {
            bs = browserSync.create(this.serverName);
        } else {
            bs = browserSync.get(this.serverName);
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
        });
    }

    public static stop() {
        if (browserSync.has(this.serverName)) {
            browserSync.get(this.serverName).exit();
        }
    }

    public static reload(fileName: string) {
        if (browserSync.has(this.serverName)) {
            browserSync.get(this.serverName).reload(fileName);
        }
    }
}
