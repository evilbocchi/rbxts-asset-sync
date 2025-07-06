import { syncAssetFile, cleanCache, getAllAssetFiles, syncAssetsOnce, unlinkAssetFile, save, pathToAssetIdMap, hashToAssetIdMap } from "../src/sync";
import fs from "fs";
import path from "path";
import * as api from "../src/api"; // Import the module to mock uploadAsset

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
        const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue(fakeBuffer);

        // Mock uploadAsset to resolve with fakeAssetId
        const uploadAssetSpy = jest.spyOn(api, "uploadAsset").mockResolvedValue(fakeAssetId);

        // Call syncAssetFile
        const result = await syncAssetFile(fakeFilePath);

        expect(readFileSyncSpy).toHaveBeenCalledWith(fakeFilePath);
        const fakeName = path.basename(fakeFilePath);
        expect(uploadAssetSpy).toHaveBeenCalledWith(fakeName, fakeBuffer);
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
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
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
        const uploadAssetSpy = jest.spyOn(api, "uploadAsset").mockResolvedValue(undefined);
        const result = await syncAssetFile(fakeFile);
        expect(result).toBeUndefined();
        uploadAssetSpy.mockRestore();
        fs.unlinkSync(fakeFile);
    });

    it("should unlink asset file from asset map", () => {
        // Add then remove
        const fakePath = "/tmp/fake.png";
        pathToAssetIdMap[fakePath] = "999";
        unlinkAssetFile(fakePath);
        expect(pathToAssetIdMap[fakePath]).toBeUndefined();
    });

    it("should call uploadAsset for each file in syncAssetsOnce", async () => {
        const uploadAssetSpy = jest.spyOn(api, "uploadAsset").mockResolvedValue("54321");
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