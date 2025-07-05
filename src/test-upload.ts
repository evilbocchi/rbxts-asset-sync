import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { uploadAsset } from "./api.js";
import { prefix } from "./parameters.js";

dotenv.config();

const [_, __, fileArg] = process.argv;

if (!fileArg) {
    console.error("Usage: npx rbx-asset-sync test-upload <filepath>");
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
            console.error(`${prefix} ❌ Upload failed: Unsupported file type or API error.`);
            return;
        }
        console.log(`${prefix} ✅ Uploaded successfully: rbxassetid://${id}`);
    })
    .catch((err) => {
        console.error(`${prefix} ❌ Upload failed:`, err);
    });
