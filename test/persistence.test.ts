import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SyncModule = typeof import("../src/sync");

describe("sync persistence safeguards", () => {
	const originalEnv: Record<string, string | undefined> = {
		ROBLOX_API_KEY: process.env.ROBLOX_API_KEY,
		ROBLOX_USER_ID: process.env.ROBLOX_USER_ID,
		ROBLOX_GROUP_ID: process.env.ROBLOX_GROUP_ID,
	};

	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();

		Object.entries(originalEnv).forEach(([key, value]) => {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		});
	});

	async function loadSync(): Promise<SyncModule> {
		return import("../src/sync");
	}

	it("writes cache and asset map only when dirty", async () => {
		const writeSpy = vi.spyOn(fs.promises, "writeFile").mockResolvedValue();
		const sync = await loadSync();

		sync.setCacheEntry("__test_hash__dirty__1", "1001");
		sync.setPathMapping("__test_path__/dirty.png", "1001");

		await sync.save();
		expect(writeSpy).toHaveBeenCalledTimes(2);

		writeSpy.mockClear();

		await sync.save();
		expect(writeSpy).not.toHaveBeenCalled();
	});

	it("skips persistence when disabled", async () => {
		const writeSpy = vi.spyOn(fs.promises, "writeFile").mockResolvedValue();
		const sync = await loadSync();

		sync.setCacheEntry("__test_hash__guard__1", "2001");
		sync.setPathMapping("__test_path__/guard.png", "2001");
		sync.disablePersistence("test guard");

		await sync.save();
		expect(writeSpy).not.toHaveBeenCalled();
	});

	it("disables persistence after missing Roblox env upload failure", async () => {
		const writeSpy = vi.spyOn(fs.promises, "writeFile").mockResolvedValue();
		const sync = await loadSync();
		const apiModule = await import("../src/api");

		sync.setCacheEntry("__test_hash__guard__2", "3001");
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rbxtsas-persist-"));
		const tempFile = path.join(tempDir, "guard2.png");
		fs.writeFileSync(tempFile, Buffer.from("temporary"));
		sync.setPathMapping(tempFile, "3001");

		const uploadError = new Error("ROBLOX_API_KEY environment variable is not set");
		const uploadSpy = vi.spyOn(apiModule, "uploadAsset").mockRejectedValue(uploadError);

		delete process.env.ROBLOX_API_KEY;
		delete process.env.ROBLOX_USER_ID;
		delete process.env.ROBLOX_GROUP_ID;

		try {
			await sync.syncAssetFile(tempFile);
			await sync.save();

			expect(uploadSpy).toHaveBeenCalled();
			expect(writeSpy).not.toHaveBeenCalled();
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});
});
