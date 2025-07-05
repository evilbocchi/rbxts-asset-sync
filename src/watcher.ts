import chokidar from "chokidar";
import { prefix, watchingPath } from "./parameters.js";
import { syncAssetFile } from "./sync.js";

export function startWatcher() {
    const watcher = chokidar.watch(`${watchingPath}/**/*`, {
        ignoreInitial: true,
        persistent: true,
    });
    console.log(`${prefix} Watching for changes in ${watchingPath}...`);

    watcher.on("add", (path) => {
        console.log(`${prefix} File added: ${path}`);
        syncAssetFile(path);
    })
        .on("change", (path) => {
            console.log(`${prefix} File changed: ${path}`);
            syncAssetFile(path);
        });
}
