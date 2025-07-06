#!/usr/bin/env node

import dotenv from "dotenv";
import LOGGER from "./logging.js";
import { cleanMode, watchMode } from "./parameters.js";
import { cleanCache, syncAssetsOnce } from "./sync.js";
import { startWatcher } from "./watcher.js";

function printHelp() {
    LOGGER.log(`
Usage:
  rbxtsas [options]

Description:
  Synchronizes assets for Roblox TypeScript projects.

Options:
  --bleed              Process images to bleed alpha channel (default: false)
  --clean              Clean the asset cache and exit
  --watch              Watch for file changes and sync automatically

  --cache=<file>       Set the cache file path (default: .rbx-sync-cache.json)
  --log-level=<level>  Set the logging level: debug|info|warn|error (default: info)
  --path=<folder>      Set the directory to look for assets (default: assets)
  --output=<file>      Set the output path for the generated asset map (default: assetMap.ts)
  --github=<repo>      Publish asset map and cache to GitHub repository (default: none)

  --help               Show this help menu
    `);
}

dotenv.config();

if (process.argv.includes("--help")) {
    printHelp();
    process.exit(0);
}

if (cleanMode) {
    cleanCache();
}

if (watchMode) {
    startWatcher();
} else {
    syncAssetsOnce();
}