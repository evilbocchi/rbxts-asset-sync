#!/usr/bin/env node

import dotenv from "dotenv";
import { pullGithubAssetMap, pushGithubAssetMap } from "./github.js";
import LOGGER from "./logging.js";
import { downloadAssetLibrary } from "./package/install.js";
import { addMode, cleanMode, githubBranch, installMode, watchMode } from "./parameters.js";
import { addAssetToCache, cleanCache, syncAssetsOnce } from "./sync.js";
import { startWatcher } from "./watcher.js";

function printHelp() {
    LOGGER.log(`
Usage:
  rbxtsas [command] [options]

Description:
  Synchronizes assets for Roblox TypeScript projects.

Commands:
  clean                    Clean the asset cache and exit
  install <repo> <alias>   Install asset library from a GitHub repository
  add <path> <assetid>     Add a known asset ID to the cache for the given file path
  watch                    Watch for file changes and sync automatically
  help                     Show this help menu

Options:
  --bleed                  Process images to bleed alpha channel (default: false)
  --cache=<file>           Set the cache file path (default: .rbx-sync-cache.json)
  --log-level=<level>      Set the logging level: debug|info|warn|error (default: info)
  --path=<folder>          Set the directory to look for assets (default: assets)
  --output=<file>          Set the output path for the generated asset map (default: assetMap.ts)
  --github=<repo>          Sync asset map and cache in GitHub repository (default: none)
  --branch=<branch>        Branch to use for GitHub operations (default: main)
  --help                   Show this help menu
    `);
}

dotenv.config();

let rbxtsasStartIndex = process.argv.findIndex((arg) => arg === "rbxtsas" || arg === "rbxts-asset-sync");
if (rbxtsasStartIndex === -1) {
    rbxtsasStartIndex = process.argv.findIndex((arg) => arg.includes("main.ts")); // fallback for direct script execution
}
const args = process.argv.slice(rbxtsasStartIndex + 1);

if (args.includes("--help") || args.includes("-h") || args.includes("help")) {
    printHelp();
    process.exit(0);
}

if (installMode) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        LOGGER.error("GITHUB_TOKEN environment variable is not set. Cannot publish or install asset library.");
        process.exit(1);
    }

    const repoSlug = args[1];
    const namespace = repoSlug.split("/")[1];
    await downloadAssetLibrary(namespace, repoSlug, githubBranch, githubToken);
    LOGGER.info(`Installed asset library @${namespace} from ${repoSlug} branch ${githubBranch}`);
    process.exit(0);
}

if (addMode) {
    const filePath = args[1];
    const assetId = args[2];

    if (!filePath || !assetId) {
        LOGGER.error("Usage: rbxtsas add <path> <assetid>");
        LOGGER.error("Example: rbxtsas add assets/image.png 12345678");
        process.exit(1);
    }

    try {
        await addAssetToCache(filePath, assetId);
        LOGGER.info(`Successfully added asset mapping: ${filePath} -> rbxassetid://${assetId}`);
    } catch (error) {
        LOGGER.error(`Failed to add asset: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }

    process.exit(0);
}

if (cleanMode) {
    cleanCache();
    process.exit(0);
}

if (watchMode) {
    // do a one-time sync before starting the watcher
    await pullGithubAssetMap();
    await syncAssetsOnce();
    await startWatcher();
} else {
    await pullGithubAssetMap();
    await syncAssetsOnce();
    await pushGithubAssetMap();
}
