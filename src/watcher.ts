import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { prefix, searchPath } from "./parameters.js";
import { save, syncAssetFile, syncAssetsOnce, unlinkAssetFile } from "./sync.js";

export function startWatcher() {
    const watchPath = path.resolve(searchPath);

    // Verify the watch path exists
    if (!fs.existsSync(watchPath)) {
        console.error(`${prefix} Error: Watch path does not exist: ${watchPath}`);
        return;
    }

    // do a one-time sync before starting the watcher
    syncAssetsOnce(false);
    const watcher = chokidar.watch(`${watchPath}/**/*`, {
        persistent: true,
        ignoreInitial: true,
    });

    watcher
        .on("ready", () => {
            console.log(`${prefix} Watcher is ready and watching for changes in ${watchPath}.`);
        })
        .on("add", (filePath) => {
            console.log(`${prefix} File added: ${filePath}`);
            syncAssetFile(filePath, false);
            save(false);
        })
        .on("change", (filePath) => {
            console.log(`${prefix} File changed: ${filePath}`);
            syncAssetFile(filePath, false);
            save(false);
        })
        .on("unlink", (filePath) => {
            console.log(`${prefix} File removed: ${filePath}`);
            unlinkAssetFile(filePath);
        })

        .on("error", (error) => {
            console.error(`${prefix} Watcher error:`, error);
        });
}
