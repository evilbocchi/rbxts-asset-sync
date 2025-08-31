import chokidar from "chokidar";
import fs from "fs";
import { pullGithubAssetMap, pushGithubAssetMap } from "./github.js";
import LOGGER from "./logging.js";
import { prefix, searchPath } from "./parameters.js";
import { save, syncAssetFile, unlinkAssetFile } from "./sync.js";

/**
 * Starts the file watcher to monitor changes in the specified asset directory.
 */
export async function startWatcher() {
	// Verify the watch path exists
	if (!fs.existsSync(searchPath)) {
		console.error(`${prefix} Error: Watch path does not exist: ${searchPath}`);
		return;
	}

	const watcher = chokidar.watch(`${searchPath}/**/*`, {
		persistent: true,
		ignoreInitial: true,
	});

	let debounceTimer: NodeJS.Timeout | null = null;
	const DEBOUNCE_MS = 500;

	const applyChanges = () => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(() => {
			pullGithubAssetMap();
			save();
			pushGithubAssetMap();
		}, DEBOUNCE_MS);
	};

	watcher
		.on("ready", () => {
			LOGGER.info(`Watcher is ready and watching for changes in ${searchPath}.`);
		})
		.on("add", (filePath) => {
			LOGGER.info(`File added: ${filePath}`);
			syncAssetFile(filePath);
			applyChanges();
		})
		.on("change", (filePath) => {
			LOGGER.info(`File changed: ${filePath}`);
			syncAssetFile(filePath);
			applyChanges();
		})
		.on("unlink", (filePath) => {
			LOGGER.info(`File removed: ${filePath}`);
			unlinkAssetFile(filePath);
			applyChanges();
		})

		.on("error", (error) => {
			LOGGER.fatal(`Watcher error:`, error);
		});
}
