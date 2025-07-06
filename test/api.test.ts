import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api";

vi.mock("form-data", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            append: vi.fn(),
            getBuffer: vi.fn(() => Buffer.from("formdata")),
            getLengthSync: vi.fn(() => 42),
            getHeaders: vi.fn(() => ({ "content-type": "multipart/form-data" })),
        })),
    };
});

const OLD_ENV = process.env;

describe("api.ts", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env = { ...OLD_ENV, ROBLOX_API_KEY: "key", ROBLOX_USER_ID: "uid", ROBLOX_GROUP_ID: "" };
        global.fetch = vi.fn();
    });

    afterAll(() => {
        process.env = OLD_ENV;
        vi.restoreAllMocks();
    });

    describe("uploadAsset", () => {
        it("throws if ROBLOX_API_KEY is missing", async () => {
            process.env.ROBLOX_API_KEY = "";
            await expect(api.uploadAsset("file.png", Buffer.from(""))).rejects.toMatch(/ROBLOX_API_KEY/);
        });

        it("returns undefined for unsupported file extension", async () => {
            const result = await api.uploadAsset("file.unsupported", Buffer.from(""));
            expect(result).toBeUndefined();
        });

        it("throws if upload fails (non-ok response)", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 400,
                statusText: "Bad Request",
                text: async () => "fail",
            });
            await expect(api.uploadAsset("file.png", Buffer.from(""))).rejects.toMatch(/400 Bad Request/);
        });

        it("returns assetId on success", async () => {
            // Mock fetch for upload
            (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ path: "operation/123" }),
                })
                // Mock fetch for getAsset
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ done: true, response: { assetId: "999" } }),
                });

            const assetId = await api.uploadAsset("file.png", Buffer.from("abc"));
            expect(assetId).toBe("999");
        });
    });

    describe("getAsset", () => {
        it("throws if ROBLOX_API_KEY is missing", async () => {
            process.env.ROBLOX_API_KEY = "";
            await expect(api.getAsset("operation/1")).rejects.toMatch(/ROBLOX_API_KEY/);
        });

        it("throws if max retries exceeded", async () => {
            await expect(api.getAsset("operation/1", 0)).rejects.toMatch(/Max retries/);
        });

        it("retries on non-ok response", async () => {
            const fetchMock = (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: "fail",
                    text: async () => "err",
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ done: true, response: { assetId: "id" } }),
                });
            const result = await api.getAsset("operation/2", 2);
            expect(result.response.assetId).toBe("id");
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it("polls until done is true", async () => {
            const fetchMock = (global.fetch as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ done: false }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ done: true, response: { assetId: "id2" } }),
                });
            const result = await api.getAsset("operation/3", 2);
            expect(result.response.assetId).toBe("id2");
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });
});
