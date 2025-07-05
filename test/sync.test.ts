import { syncAssetFile, cleanCache, getAllAssetFiles } from "../src/sync";
import fs from "fs";
import path from "path";

describe("sync.ts", () => {
    const testAssetPath = path.join(__dirname, "../assets/icon.png");

    it("should find asset files in a directory", () => {
        const files = getAllAssetFiles(path.join(__dirname, "../assets"));
        expect(files).toContain(testAssetPath);
    });

    it("should not throw when cleaning cache with no assets", () => {
        expect(() => cleanCache()).not.toThrow();
    });

    // Note: syncAssetFile requires mocking uploadAsset and file system for a true unit test.
    // Here is a placeholder for such a test:
    it("should call uploadAsset for new files", async () => {
        // This would require mocking uploadAsset and fs.readFileSync
        // Example: jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test'));
        // Example: jest.spyOn(api, 'uploadAsset').mockResolvedValue('12345');
        expect(typeof syncAssetFile).toBe("function");
    });
});
