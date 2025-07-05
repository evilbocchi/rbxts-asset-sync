import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { prefix, watchingPath } from "./parameters.js";
import { syncAssetFile } from "./sync.js";

export function startWatcher() {
    // Verify the watch path exists
    if (!fs.existsSync(watchingPath)) {
        console.error(`${prefix} Error: Watch path does not exist: ${watchingPath}`);
        return;
    }

    console.log(`${prefix} Starting watcher for path: ${path.resolve(watchingPath)}`);

    const watcher = chokidar.watch(`${watchingPath}/**/*`, {
        ignoreInitial: true,
        persistent: true,
        followSymlinks: false,
        usePolling: process.platform === 'win32',
        interval: 1000,
        binaryInterval: 1000,
        ignorePermissionErrors: true,
        atomic: true, // Wait for write operations to complete
    });

    watcher
        .on("ready", () => {
            console.log(`${prefix} Watcher is ready and watching for changes in ${watchingPath}.`);
        })
        .on("add", (filePath) => {
            console.log(`${prefix} File added: ${filePath}`);
            syncAssetFile(filePath);
        })
        .on("change", (filePath) => {
            console.log(`${prefix} File changed: ${filePath}`);
            syncAssetFile(filePath);
        })
        .on("unlink", (filePath) => {
            console.log(`${prefix} File removed: ${filePath}`);
            // We don't actually need to handle deletions
        });
}
