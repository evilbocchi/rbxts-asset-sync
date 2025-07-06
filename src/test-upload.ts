#!/usr/bin/env node

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { uploadAsset } from "./api.js";
import LOGGER from "./logging.js";
import { prefix } from "./parameters.js";

dotenv.config();

const [_, __, fileArg] = process.argv;

if (!fileArg) {
    console.error("Usage: npx rbxtsas-test-upload <filepath>");
    process.exit(1);
}

const resolvedPath = path.resolve(fileArg);
if (!fs.existsSync(resolvedPath)) {
    console.error(`${prefix} File does not exist: ${resolvedPath}`);
    process.exit(1);
}

const fileBuffer = fs.readFileSync(resolvedPath);
const filename = path.basename(resolvedPath);

uploadAsset(filename, fileBuffer)
    .then((id) => {
        if (!id) {
            LOGGER.error(`Upload failed: Unsupported file type or API error.`);
            return;
        }
        LOGGER.info(`Uploaded successfully: rbxassetid://${id}`);
    })
    .catch((err) => {
        LOGGER.fatal(`Upload failed:`, err);
    });
