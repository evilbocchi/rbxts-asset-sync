#!/usr/bin/env node

import dotenv from "dotenv";
import { syncAssetsOnce } from "./sync.js";
import { startWatcher } from "./watcher.js";
import { watchMode } from "./parameters.js";

dotenv.config();

if (watchMode) {
    startWatcher();
} else {
    syncAssetsOnce();
}
