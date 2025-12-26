import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { syncAssetFile, pathToTextContentMap, pathToAssetIdMap, save } from "../src/sync.js";

describe("Text file embedding", () => {
	const tempDir = path.join(__dirname, "temp_text_files");

	beforeEach(() => {
		// Clear maps before each test
		Object.keys(pathToTextContentMap).forEach((key) => delete pathToTextContentMap[key]);
		Object.keys(pathToAssetIdMap).forEach((key) => delete pathToAssetIdMap[key]);

		// Create temp directory
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up temp directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("should embed .md files as text content", async () => {
		const testContent = "# Test Markdown\n\nThis is a test.";
		const mdPath = path.join(tempDir, "test.md");
		fs.writeFileSync(mdPath, testContent);

		await syncAssetFile(mdPath);

		expect(pathToTextContentMap[mdPath]).toBe(testContent);
		expect(pathToAssetIdMap[mdPath]).toBeUndefined();
	});

	it("should embed .txt files as text content", async () => {
		const testContent = "Plain text content";
		const txtPath = path.join(tempDir, "test.txt");
		fs.writeFileSync(txtPath, testContent);

		await syncAssetFile(txtPath);

		expect(pathToTextContentMap[txtPath]).toBe(testContent);
		expect(pathToAssetIdMap[txtPath]).toBeUndefined();
	});

	it("should embed .json files as text content", async () => {
		const testContent = '{"key": "value", "nested": {"data": 123}}';
		const jsonPath = path.join(tempDir, "test.json");
		fs.writeFileSync(jsonPath, testContent);

		await syncAssetFile(jsonPath);

		expect(pathToTextContentMap[jsonPath]).toBe(testContent);
		expect(pathToAssetIdMap[jsonPath]).toBeUndefined();
	});

	it("should handle multiple text file extensions", async () => {
		const extensions = [".xml", ".yaml", ".yml", ".csv", ".log", ".ini", ".cfg", ".conf"];

		for (const ext of extensions) {
			const testContent = `Test content for ${ext}`;
			const filePath = path.join(tempDir, `test${ext}`);
			fs.writeFileSync(filePath, testContent);

			await syncAssetFile(filePath);

			expect(pathToTextContentMap[filePath]).toBe(testContent);
			expect(pathToAssetIdMap[filePath]).toBeUndefined();
		}
	});

	it("should preserve special characters and newlines in text files", async () => {
		const testContent = 'Text with "quotes", \\backslashes\\, and\nnewlines\r\nand tabs\t!';
		const txtPath = path.join(tempDir, "special.txt");
		fs.writeFileSync(txtPath, testContent);

		await syncAssetFile(txtPath);

		expect(pathToTextContentMap[txtPath]).toBe(testContent);
	});
});
