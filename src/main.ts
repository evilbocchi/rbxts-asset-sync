#!/usr/bin/env node

import dotenv from "dotenv";
import { cleanMode, watchMode } from "./parameters.js";
import { cleanCache, syncAssetsOnce } from "./sync.js";
import { startWatcher } from "./watcher.js";

dotenv.config();

if (cleanMode) {
    cleanCache();
}

if (watchMode) {
    startWatcher();
} else {
    syncAssetsOnce();
}