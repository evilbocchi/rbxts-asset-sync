import fs from "fs";
import path from "path";
import { uploadAsset } from "./api.js";
import { bleedAlpha } from "./bleed.js";
import { convertWavToOgg } from "./audio.js";
import { getHash } from "./hash.js";
import LOGGER from "./logging.js";
import { assetMapOutputPath, bleedMode, cacheOutputPath, searchPath } from "./parameters.js";

export const MAX_ROBLOX_DISPLAY_NAME_LENGTH = 50;

function computeNormalizedAssetPath(filePath: string): string {
	const absoluteFilePath = path.resolve(filePath);
	const absoluteSearchPath = path.resolve(searchPath);
	const relativePath = path.relative(absoluteSearchPath, absoluteFilePath);
	const baseSegment = path.basename(absoluteSearchPath);

	if (relativePath === "") {
		return baseSegment;
	}

	const isInsideSearchPath = relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);

	if (isInsideSearchPath) {
		const normalizedRelative = relativePath.split(path.sep).join("/");
		return normalizedRelative ? `${baseSegment}/${normalizedRelative}` : baseSegment;
	}

	return filePath.split(path.sep).join("/");
}

function truncateAssetPathForRoblox(normalizedPath: string): string {
	if (normalizedPath.length <= MAX_ROBLOX_DISPLAY_NAME_LENGTH) {
		return normalizedPath;
	}

	const ellipsis = "...";
	if (MAX_ROBLOX_DISPLAY_NAME_LENGTH <= ellipsis.length) {
		return normalizedPath.slice(0, MAX_ROBLOX_DISPLAY_NAME_LENGTH);
	}

	const tailLength = MAX_ROBLOX_DISPLAY_NAME_LENGTH - ellipsis.length;
	const tail = normalizedPath.slice(-tailLength);
	return `${ellipsis}${tail}`;
}

export function getUploadDisplayInfo(filePath: string): { normalizedPath: string; displayName: string } {
	const normalizedPath = computeNormalizedAssetPath(filePath);
	const displayName = truncateAssetPathForRoblox(normalizedPath);
	return { normalizedPath, displayName };
}

/**
 * Cache mapping file hashes to Roblox asset IDs to avoid re-uploading identical files.
 */
export let hashToAssetIdMap: Record<string, string> = {};

/**
 * Mapping of file paths to their corresponding Roblox asset IDs.
 * Used to generate the final asset map for TypeScript consumption.
 */
export const pathToAssetIdMap: Record<string, string> = {};

let cacheDirty = false;
let assetMapDirty = false;

let persistenceDisabledReason: string | null = null;
const persistenceSkipLogged: Record<"cache" | "assetMap", boolean> = {
	cache: false,
	assetMap: false,
};

export function disablePersistence(reason: string): void {
	if (persistenceDisabledReason) {
		if (persistenceDisabledReason !== reason) {
			LOGGER.debug(
				`Persistence already disabled (${persistenceDisabledReason}). Ignoring additional request: ${reason}`,
			);
		}
		return;
	}

	persistenceDisabledReason = reason;
	LOGGER.warn(`Disabling cache persistence: ${reason}`);
}

function isPersistenceDisabled(): boolean {
	return persistenceDisabledReason !== null;
}

function notifyPersistenceSkipped(target: "cache" | "assetMap"): void {
	if (!persistenceDisabledReason) {
		return;
	}

	const message = `${target === "cache" ? "Cache" : "Asset map"} save skipped to avoid overwriting existing data: ${persistenceDisabledReason}`;
	if (!persistenceSkipLogged[target]) {
		LOGGER.warn(message);
		persistenceSkipLogged[target] = true;
	} else {
		LOGGER.debug(message);
	}
}

export function setCacheEntry(hash: string, assetId: string): void {
	if (hashToAssetIdMap[hash] === assetId) {
		return;
	}

	hashToAssetIdMap[hash] = assetId;
	cacheDirty = true;
}

function removeCacheEntry(hash: string): void {
	if (!(hash in hashToAssetIdMap)) {
		return;
	}

	delete hashToAssetIdMap[hash];
	cacheDirty = true;
}

export function setPathMapping(filePath: string, assetId: string): void {
	if (pathToAssetIdMap[filePath] === assetId) {
		return;
	}

	pathToAssetIdMap[filePath] = assetId;
	assetMapDirty = true;
}

function removePathMapping(filePath: string): void {
	if (!(filePath in pathToAssetIdMap)) {
		return;
	}

	delete pathToAssetIdMap[filePath];
	assetMapDirty = true;
}

// Load existing cache if it exists
if (fs.existsSync(cacheOutputPath)) {
	try {
		const rawCache = fs.readFileSync(cacheOutputPath, "utf8");
		const parsed = JSON.parse(rawCache) as unknown;
		if (parsed && typeof parsed === "object") {
			hashToAssetIdMap = parsed as Record<string, string>;
		} else {
			const reason = `Cache file at ${cacheOutputPath} is not a valid JSON object.`;
			LOGGER.error(reason);
			disablePersistence(reason);
		}
	} catch (error) {
		const reason = `Failed to read cache file at ${cacheOutputPath}: ${error instanceof Error ? error.message : String(error)}`;
		LOGGER.error(reason);
		disablePersistence(reason);
	}
}

/**
 * Saves the hash-to-asset-ID cache to disk for future runs.
 * This prevents re-uploading files that haven't changed.
 */
async function saveCache() {
	if (isPersistenceDisabled()) {
		notifyPersistenceSkipped("cache");
		return;
	}

	if (!cacheDirty) {
		LOGGER.debug("Cache unchanged; skipping cache write.");
		return;
	}

	await fs.promises.writeFile(cacheOutputPath, JSON.stringify(hashToAssetIdMap, null, 2));
	cacheDirty = false;
	LOGGER.info(`Cache saved to ${cacheOutputPath}`);
}

/**
 * Generates and saves a TypeScript asset map file containing all synced assets.
 * Creates a strongly-typed object mapping file paths to rbxassetid URLs.
 */
async function saveAssetMap() {
	if (isPersistenceDisabled()) {
		notifyPersistenceSkipped("assetMap");
		return;
	}

	if (!assetMapDirty) {
		LOGGER.debug("Asset map unchanged; skipping asset map write.");
		return;
	}

	const lines: string[] = ["// Auto-generated by rbx-asset-sync. Do not edit manually.", "export const assets = {"];

	const keys = Object.keys(pathToAssetIdMap).sort();
	for (const filePath of keys) {
		const assetId = pathToAssetIdMap[filePath];
		const normalizedPath = filePath.replace(/\\/g, "/");
		lines.push(`  "${normalizedPath}": "rbxassetid://${assetId}",`);
	}

	lines.push("} as const;\n");
	lines.push("export function getAsset(path: keyof typeof assets): string {\n  return assets[path];\n}");

	await fs.promises.writeFile(assetMapOutputPath, lines.join("\n"));
	assetMapDirty = false;
	LOGGER.info(`Asset map generated with ${keys.length} entries at ${assetMapOutputPath}`);
}

/**
 * Saves both the cache and asset map to disk.
 * This is called after all assets have been processed to ensure everything is up-to-date.
 */
export async function save(): Promise<void> {
	await Promise.all([saveCache(), saveAssetMap()]);
}

/**
 * Synchronizes all asset files in the watching directory once.
 * This is the main entry point for batch synchronization.
 *
 * @returns Promise that resolves when all assets have been processed
 */
export async function syncAssetsOnce(): Promise<void> {
	const files = getAllAssetFiles(searchPath);
	for (const file of files) {
		await syncAssetFile(file);
	}
	await save();
}

/**
 * Synchronizes a single asset file to Roblox.
 * Checks cache first to avoid re-uploading identical files, then uploads if needed.
 *
 * @param filePath - Absolute path to the asset file to sync
 * @returns Promise that resolves when the file has been processed
 *
 * @example
 * ```typescript
 * await syncAssetFile("C:/project/assets/image.png");
 * ```
 */
export async function syncAssetFile(filePath: string): Promise<string | undefined> {
	let assetBuffer = fs.readFileSync(filePath);
	const assetName = path.basename(filePath);
	const { normalizedPath, displayName } = getUploadDisplayInfo(filePath);
	let hash = getHash(assetBuffer);
	const shouldBleed = bleedMode && /\.(png|jpg|jpeg)$/i.test(assetName);
	const isWav = /\.wav$/i.test(assetName);
	let uploadName = assetName;

	if (shouldBleed) {
		hash += "(bleed)";
	}

	if (isWav) {
		hash += "(wav->ogg)";
	}

	if (hash in hashToAssetIdMap) {
		const assetId = hashToAssetIdMap[hash];
		LOGGER.info(`${filePath} reused rbxassetid://${assetId}`);
		setPathMapping(filePath, assetId);
		return assetId;
	}

	try {
		if (displayName !== normalizedPath) {
			LOGGER.debug(`Display name truncated for upload: "${normalizedPath}" -> "${displayName}"`);
		}

		if (shouldBleed) {
			const processed = await bleedAlpha(assetBuffer);
			assetBuffer = Buffer.from(processed);
		}

		if (isWav) {
			const converted = await convertWavToOgg(assetBuffer);
			assetBuffer = Buffer.from(converted);
			const parsed = path.parse(uploadName);
			uploadName = `${parsed.name}.ogg`;
		}

		const assetId = await uploadAsset(uploadName, assetBuffer, displayName);
		if (!assetId) {
			LOGGER.warn(`Skipping ${filePath} due to unsupported file type.`);
			return;
		}

		LOGGER.info(`Uploaded ${filePath} -> rbxassetid://${assetId}`);

		setCacheEntry(hash, assetId);
		setPathMapping(filePath, assetId);
		return assetId;
	} catch (err) {
		LOGGER.error(`Failed to upload ${filePath}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		if (errorMessage.includes("environment variable is not set")) {
			disablePersistence(`Missing Roblox configuration (${errorMessage}). Cache will remain untouched.`);
		}
	}
}

/**
 * Recursively walks a directory tree and returns all file paths.
 * Used to discover all asset files that need to be synchronized.
 *
 * @param watchingPath - Root directory path to scan for asset files
 * @returns Array of absolute file paths found in the directory tree
 *
 * @example
 * ```typescript
 * const files = getAllAssetFiles("C:/project/assets");
 * // Returns: ["C:/project/assets/image.png", "C:/project/assets/sounds/audio.mp3"]
 * ```
 */
export function getAllAssetFiles(watchingPath: string): string[] {
	/**
	 * Recursively walks a directory and collects all file paths.
	 *
	 * @param dir - Directory path to walk
	 * @returns Array of file paths in the directory
	 */
	const walk = (dir: string): string[] => {
		let results: string[] = [];
		const list = fs.readdirSync(dir);
		for (const file of list) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);
			if (stat && stat.isDirectory()) {
				results = results.concat(walk(filePath));
			} else {
				results.push(filePath);
			}
		}
		return results;
	};

	return walk(watchingPath);
}

/**
 * Unlinks an asset file from the asset map.
 * This is called when a file is deleted or removed from the watching directory.
 *
 * @param filePath - Absolute path to the asset file to unlink
 */
export function unlinkAssetFile(filePath: string): void {
	removePathMapping(filePath);
}

/**
 * Manually adds an asset ID to the cache and asset map for a given file path.
 * This bypasses the normal upload process and allows direct mapping of known asset IDs.
 *
 * @param filePath - Path to the asset file (can be relative or absolute)
 * @param assetId - The Roblox asset ID to associate with this file
 * @returns Promise that resolves when the asset has been added to cache and asset map
 *
 * @example
 * ```typescript
 * await addAssetToCache("assets/image.png", "12345678");
 * ```
 */
export async function addAssetToCache(filePath: string, assetId: string): Promise<void> {
	// Convert to absolute path if needed
	const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

	// Verify the file exists
	if (!fs.existsSync(absolutePath)) {
		throw new Error(`File not found: ${filePath}`);
	}

	// Validate asset ID is numeric
	if (!/^\d+$/.test(assetId)) {
		throw new Error(`Invalid asset ID: ${assetId}. Asset ID must be numeric.`);
	}

	// Read the file to generate a hash for the cache
	let assetBuffer = fs.readFileSync(absolutePath);
	const assetName = path.basename(absolutePath);
	let hash = getHash(assetBuffer);

	// If --bleed is enabled and this is an image, account for that in the hash
	if (bleedMode && /\.(png|jpg|jpeg)$/i.test(assetName)) {
		hash += "(bleed)";
	}

	// Add to both mappings
	setCacheEntry(hash, assetId);
	setPathMapping(absolutePath, assetId);

	LOGGER.info(`Manually added ${absolutePath} -> rbxassetid://${assetId}`);

	// Save the updated cache and asset map
	await save();
}

/**
 * Finds unused asset IDs in the cache and removes them.
 */
export function cleanCache() {
	const usedAssetIds = new Set(Object.values(pathToAssetIdMap));
	const unusedHashes = Object.keys(hashToAssetIdMap).filter((hash) => !usedAssetIds.has(hashToAssetIdMap[hash]));

	for (const hash of unusedHashes) {
		removeCacheEntry(hash);
	}

	if (unusedHashes.length > 0) {
		LOGGER.info(`Cleaned up ${unusedHashes.length} unused asset IDs from cache.`);
	} else {
		LOGGER.info(`No unused asset IDs found in cache.`);
	}
}
