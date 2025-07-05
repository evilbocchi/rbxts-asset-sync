#!/usr/bin/env node

import dotenv from "dotenv";
import { cleanMode, watchMode } from "./parameters.js";
import { cleanCache, syncAssetsOnce } from "./sync.js";
import { startWatcher } from "./watcher.js";

function printHelp() {
    console.log(`
rbxts-asset-sync

Usage:
  rbxts-asset-sync [options]

Options:
  --help               Show this help menu
  --watch              Watch for file changes and sync automatically
  --bleed              Process images to bleed alpha channel (default: false)
  --clean              Clean the asset cache and exit
  --path=<folder>      Set the folder to watch for assets (default: assets)
  --output=<file>      Set the output path for the generated asset map (default: assetMap.ts)
  --cache=<file>       Set the cache file path (default: .rbx-sync-cache.json)

Description:
  Synchronizes assets for Roblox TypeScript projects.
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