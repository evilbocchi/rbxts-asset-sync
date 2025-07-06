import chokidar from "chokidar";
import fs from "fs";
import LOGGER from "./logging.js";
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
    syncAssetsOnce();
    const watcher = chokidar.watch(`${searchPath}/**/*`, {
        persistent: true,
        ignoreInitial: true,
    });

    watcher
        .on("ready", () => {
            LOGGER.info(`Watcher is ready and watching for changes in ${searchPath}.`);
        })
        .on("add", (filePath) => {
            LOGGER.info(`File added: ${filePath}`);
            syncAssetFile(filePath);
            save();
        })
        .on("change", (filePath) => {
            LOGGER.info(`File changed: ${filePath}`);
            syncAssetFile(filePath);
            save();
        })
        .on("unlink", (filePath) => {
            LOGGER.info(`File removed: ${filePath}`);
            unlinkAssetFile(filePath);
            save();
        })

        .on("error", (error) => {
            LOGGER.fatal(`Watcher error:`, error);
        });
}
