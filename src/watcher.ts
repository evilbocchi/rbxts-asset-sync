import chokidar from "chokidar";
import fs from "fs";
import { pullGithubAssetMap, pushGithubAssetMap } from "./github.js";
import { registerCleanup } from "./graceful-shutdown.js";
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

	// Register cleanup function to handle watcher shutdown
	registerCleanup(async () => {
		LOGGER.info("Closing file watcher...");
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		try {
			await watcher.close();
			LOGGER.info("File watcher closed successfully.");
		} catch (error) {
			LOGGER.error("Error closing file watcher:", error);
		}

		// Perform final save and push operations
		LOGGER.info("Performing final sync during watcher shutdown...");
		try {
			await pullGithubAssetMap();
			await save();
			await pushGithubAssetMap();
			LOGGER.info("Final sync completed during watcher shutdown.");
		} catch (error) {
			LOGGER.error("Error during final sync in watcher shutdown:", error);
			throw error; // Re-throw to be handled by graceful shutdown
		}
	});
	const applyChanges = () => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(async () => {
			try {
				await pullGithubAssetMap();
				await save();
				await pushGithubAssetMap();
			} catch (error) {
				LOGGER.error("Error during debounced changes:", error);
			}
		}, DEBOUNCE_MS);
	};

	watcher
		.on("ready", () => {
			LOGGER.info(`Watcher is ready and watching for changes in ${searchPath}.`);
		})
		.on("add", async (filePath) => {
			LOGGER.info(`File added: ${filePath}`);
			try {
				await syncAssetFile(filePath);
				applyChanges();
			} catch (error) {
				LOGGER.error(`Error syncing added file ${filePath}:`, error);
			}
		})
		.on("change", async (filePath) => {
			LOGGER.info(`File changed: ${filePath}`);
			try {
				await syncAssetFile(filePath);
				applyChanges();
			} catch (error) {
				LOGGER.error(`Error syncing changed file ${filePath}:`, error);
			}
		})
		.on("unlink", (filePath) => {
			LOGGER.info(`File removed: ${filePath}`);
			try {
				unlinkAssetFile(filePath);
				applyChanges();
			} catch (error) {
				LOGGER.error(`Error unlinking file ${filePath}:`, error);
			}
		})

		.on("error", (error) => {
			LOGGER.fatal(`Watcher error:`, error);
		});
}
