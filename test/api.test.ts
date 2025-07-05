import * as api from "../src/api";

jest.mock("form-data", () => {
    return jest.fn().mockImplementation(() => ({
        append: jest.fn(),
        getBuffer: jest.fn(() => Buffer.from("formdata")),
        getLengthSync: jest.fn(() => 42),
        getHeaders: jest.fn(() => ({ "content-type": "multipart/form-data" })),
    }));
});

const OLD_ENV = process.env;

describe("api.ts", () => {
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...OLD_ENV, ROBLOX_API_KEY: "key", ROBLOX_USER_ID: "uid", ROBLOX_GROUP_ID: "" };
        global.fetch = jest.fn();
    });

    afterAll(() => {
        process.env = OLD_ENV;
        jest.restoreAllMocks();
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
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 400,
                statusText: "Bad Request",
                text: async () => "fail",
            });
            await expect(api.uploadAsset("file.png", Buffer.from(""))).rejects.toMatch(/400 Bad Request/);
        });

        it("returns assetId on success", async () => {
            // Mock fetch for upload
            (global.fetch as jest.Mock)
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
            const fetchMock = (global.fetch as jest.Mock)
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
            const fetchMock = (global.fetch as jest.Mock)
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
