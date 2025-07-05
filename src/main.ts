#!/usr/bin/env node

import dotenv from "dotenv";
import { watchMode } from "./parameters.js";
import { syncAssetsOnce } from "./sync.js";
import { startWatcher } from "./watcher.js";

dotenv.config();

if (watchMode) {
    startWatcher();
} else {
    syncAssetsOnce();
}