import {
	syncAssetFile,
	cleanCache,
	getAllAssetFiles,
	syncAssetsOnce,
	unlinkAssetFile,
	save,
	pathToAssetIdMap,
	hashToAssetIdMap,
	getUploadDisplayInfo,
	MAX_ROBLOX_DISPLAY_NAME_LENGTH,
} from "../src/sync";
import fs from "fs";
import path from "path";
import * as api from "../src/api"; // Import the module to mock uploadAsset
import * as audio from "../src/audio";
import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

describe("sync.ts", () => {
	const testAssetPath = path.join(__dirname, "../assets/icon.png");

	it("should find asset files in a directory", () => {
		const files = getAllAssetFiles(path.join(__dirname, "../assets"));
		expect(files).toContain(testAssetPath);
	});

	it("should not throw when cleaning cache with no assets", () => {
		expect(() => cleanCache()).not.toThrow();
	});

	it("should call uploadAsset for new files", async () => {
		const fakeFilePath = path.join(__dirname, "../assets/fake.png");
		const fakeBuffer = Buffer.from("testdata");
		const fakeAssetId = "12345";

		// Mock fs.readFileSync to return fakeBuffer
		const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockReturnValue(fakeBuffer);

		// Mock uploadAsset to resolve with fakeAssetId
		const uploadAssetSpy = vi.spyOn(api, "uploadAsset").mockResolvedValue(fakeAssetId);

		// Call syncAssetFile
		const result = await syncAssetFile(fakeFilePath);

		expect(readFileSyncSpy).toHaveBeenCalledWith(fakeFilePath);
		const fakeName = path.basename(fakeFilePath);
		const { displayName } = getUploadDisplayInfo(fakeFilePath);
		expect(uploadAssetSpy).toHaveBeenCalledWith(fakeName, fakeBuffer, displayName);
		expect(result).toBe(fakeAssetId);

		// Restore mocks
		readFileSyncSpy.mockRestore();
		uploadAssetSpy.mockRestore();
	});

	const testDir = path.join(__dirname, "temp_assets");
	const testFile = path.join(testDir, "test.png");

	beforeAll(() => {
		if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
		fs.writeFileSync(testFile, Buffer.from("data"));
	});

	afterAll(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	it("should return empty array for getAllAssetFiles on empty dir", () => {
		const emptyDir = path.join(__dirname, "empty");
		if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir);
		expect(getAllAssetFiles(emptyDir)).toEqual([]);
		fs.rmdirSync(emptyDir);
	});

	it("should handle unsupported file types in syncAssetFile", async () => {
		const fakeFile = path.join(testDir, "file.unsupported");
		fs.writeFileSync(fakeFile, Buffer.from("abc"));
		const uploadAssetSpy = vi.spyOn(api, "uploadAsset").mockResolvedValue(undefined);
		const result = await syncAssetFile(fakeFile);
		expect(result).toBeUndefined();
		uploadAssetSpy.mockRestore();
		fs.unlinkSync(fakeFile);
	});

	it("should convert wav files to ogg before upload", async () => {
		const wavFile = path.join(testDir, "sound.wav");
		fs.writeFileSync(wavFile, Buffer.from("wav"));
		const oggBuffer = Buffer.from("oggdata");
		const convertSpy = vi.spyOn(audio, "convertWavToOgg").mockResolvedValue(oggBuffer);
		const uploadAssetSpy = vi.spyOn(api, "uploadAsset").mockResolvedValue("wav-id");

		const result = await syncAssetFile(wavFile);

		expect(convertSpy).toHaveBeenCalled();
		expect(uploadAssetSpy).toHaveBeenCalled();
		const [uploadedName, uploadedBuffer, uploadedDisplay] = uploadAssetSpy.mock.calls[0];
		expect(uploadedName).toBe("sound.ogg");
		expect((uploadedBuffer as Buffer).equals(oggBuffer)).toBe(true);
		expect(uploadedDisplay).toBe(getUploadDisplayInfo(wavFile).displayName);
		expect(result).toBe("wav-id");

		convertSpy.mockRestore();
		uploadAssetSpy.mockRestore();
		fs.unlinkSync(wavFile);
	});

	it("should truncate display name when asset path exceeds Roblox limit", async () => {
		const longDir = path.join(testDir, "sub", "folder", "with", "a", "really", "really", "really", "long", "name");
		fs.mkdirSync(longDir, { recursive: true });
		const longFile = path.join(longDir, "supercalifragilisticexpialidocious_texture.png");
		fs.writeFileSync(longFile, Buffer.from("abc"));

		const uploadAssetSpy = vi.spyOn(api, "uploadAsset").mockResolvedValue("longid");

		await syncAssetFile(longFile);

		const { normalizedPath, displayName } = getUploadDisplayInfo(longFile);
		expect(normalizedPath.length).toBeGreaterThan(MAX_ROBLOX_DISPLAY_NAME_LENGTH);
		expect(displayName.length).toBeLessThanOrEqual(MAX_ROBLOX_DISPLAY_NAME_LENGTH);
		expect(displayName).not.toBe(normalizedPath);

		const lastCallIndex = uploadAssetSpy.mock.calls.length - 1;
		expect(lastCallIndex).toBeGreaterThanOrEqual(0);
		if (lastCallIndex >= 0) {
			const lastCall = uploadAssetSpy.mock.calls[lastCallIndex];
			expect(lastCall[2]).toBe(displayName);
		}

		uploadAssetSpy.mockRestore();
		fs.rmSync(longDir, { recursive: true, force: true });
	});

	it("should unlink asset file from asset map", () => {
		// Add then remove
		const fakePath = "/tmp/fake.png";
		pathToAssetIdMap[fakePath] = "999";
		unlinkAssetFile(fakePath);
		expect(pathToAssetIdMap[fakePath]).toBeUndefined();
	});

	it("should call uploadAsset for each file in syncAssetsOnce", async () => {
		const uploadAssetSpy = vi.spyOn(api, "uploadAsset").mockResolvedValue("54321");
		await syncAssetsOnce();
		expect(uploadAssetSpy).toHaveBeenCalled();
		uploadAssetSpy.mockRestore();
	});

	it("should save cache and asset map without error", async () => {
		await expect(save()).resolves.not.toThrow();
	});

	it("should clean unused asset IDs from cache", () => {
		hashToAssetIdMap["deadbeef"] = "unusedid";
		pathToAssetIdMap["/tmp/used"] = "usedid";
		hashToAssetIdMap["cafebabe"] = "usedid";
		cleanCache();
		expect(hashToAssetIdMap["deadbeef"]).toBeUndefined();
		expect(hashToAssetIdMap["cafebabe"]).toBe("usedid");
	});
});
