import FormData from "form-data";
import mime from "mime";
import path from "path";
import LOGGER from "./logging.js";

/**
 * Uploads an asset to the Roblox Open Cloud API.
 *
 * @param filename - The name of the file to upload.
 * @param buffer - The file content as a Buffer.
 * @returns The uploaded asset's ID as a string, or undefined if the asset type is not supported.
 * @throws If the ROBLOX_API_KEY environment variable is not set or the upload fails.
 */
export async function uploadAsset(filename: string, buffer: Buffer): Promise<string | undefined> {
	const API_KEY = process.env.ROBLOX_API_KEY;
	const USER_ID = process.env.ROBLOX_USER_ID;
	const GROUP_ID = process.env.ROBLOX_GROUP_ID;

	if (!API_KEY) {
		throw "ROBLOX_API_KEY environment variable is not set";
	}

	const ext = path.extname(filename).toLowerCase();
	const contentType = mime.getType(ext) || "application/octet-stream";

	const guessed = guessAssetType(ext);
	if (!guessed) {
		return undefined;
	}

	// Prepare the request JSON (without fileContent)
	const requestData = {
		assetType: guessed,
		displayName: filename,
		description: "Uploaded via rbx-asset-sync",
		creationContext: {
			creator: GROUP_ID ? { groupId: GROUP_ID } : { userId: USER_ID },
		},
	};

	// Build multipart form data
	const form = new FormData();
	form.append("request", JSON.stringify(requestData));
	form.append("fileContent", buffer, {
		filename,
		contentType,
	});

	const formBuffer = form.getBuffer();
	const contentLength = form.getLengthSync();
	const res = await fetch("https://apis.roblox.com/assets/v1/assets", {
		method: "POST",
		headers: {
			"x-api-key": API_KEY,
			...form.getHeaders(),
			"Content-Length": contentLength.toString(),
		},
		body: new Uint8Array(formBuffer),
	});

	if (!res.ok) {
		const errText = await res.text();
		throw `${res.status} ${res.statusText}\n${errText}`;
	}

	const data = await res.json();

	await new Promise((resolve) => setTimeout(resolve, 500)); // short delay to ensure asset is processed
	const asset = await getAsset(data.path);
	return asset.response.assetId;
}

/**
 * Polls the Roblox Open Cloud API for the status of an asset upload operation.
 *
 * @param operationPath - The operation path returned from the upload request.
 * @param retries - Number of retries before giving up (default: 3).
 * @returns The asset operation response object.
 * @throws If the ROBLOX_API_KEY environment variable is not set or max retries are exceeded.
 */
export async function getAsset(operationPath: string, retries = 3) {
	if (retries-- <= 0) {
		throw "Max retries exceeded while fetching asset";
	}
	const API_KEY = process.env.ROBLOX_API_KEY;
	if (!API_KEY) {
		throw "ROBLOX_API_KEY environment variable is not set";
	}

	const res = await fetch("https://apis.roblox.com/assets/v1/" + operationPath, {
		method: "GET",
		headers: {
			"x-api-key": API_KEY,
		},
	});

	if (!res.ok) {
		const errText = await res.text();
		LOGGER.warn(`Failed to fetch asset: ${res.status} ${res.statusText}\n${errText} (Retries left: ${retries})`);
		return getAsset(operationPath, retries);
	}

	const data = await res.json();
	if (!data.done) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		LOGGER.info("Asset not ready yet, retrying...");
		return getAsset(operationPath, retries + 1);
	}

	return data;
}

/**
 * Guesses the Roblox asset type based on the file extension.
 *
 * @param ext - The file extension (including the dot, e.g., ".png").
 * @returns The asset type as a string ("Image", "Audio", "Model"), or undefined if unsupported.
 */
function guessAssetType(ext: string) {
	switch (ext) {
		case ".png":
		case ".jpg":
		case ".jpeg":
			return "Image";
		case ".mp3":
		case ".ogg":
			return "Audio";
		case ".fbx":
			return "Model";
		default:
			return;
	}
}
