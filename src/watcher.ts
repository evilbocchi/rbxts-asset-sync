import chokidar from "chokidar";
import fs from "fs";
import { prefix, searchPath } from "./parameters.js";
import { save, syncAssetFile, syncAssetsOnce, unlinkAssetFile } from "./sync.js";

/**
 * Starts the file watcher to monitor changes in the specified asset directory.
 */
export function startWatcher() {
    // Verify the watch path exists
    if (!fs.existsSync(searchPath)) {
        console.error(`${prefix} Error: Watch path does not exist: ${searchPath}`);
        return;
    }

    // do a one-time sync before starting the watcher
    syncAssetsOnce(false);
    const watcher = chokidar.watch(`${searchPath}/**/*`, {
        persistent: true,
        ignoreInitial: true,
    });

    watcher
        .on("ready", () => {
            console.log(`${prefix} Watcher is ready and watching for changes in ${searchPath}.`);
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
