import { Octokit } from "@octokit/rest";
import fs from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as github from "../src/github";
import { hashToAssetIdMap, pathToAssetIdMap } from "../src/sync";

vi.mock("@octokit/rest");
vi.mock("fs");

const mockOctokit = {
    repos: {
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
    },
};

(Octokit as any).mockImplementation(() => mockOctokit);

const TEST_REPO = "owner/repo";
const TEST_BRANCH = "main";
const TEST_TOKEN = "test-token";
const TEST_CONTENT = Buffer.from("test content");
const TEST_DEST_PATH = "remote.json";
const TEST_COMMIT_MSG = "Test commit";

beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(hashToAssetIdMap).forEach(k => delete hashToAssetIdMap[k]);
    Object.keys(pathToAssetIdMap).forEach(k => delete pathToAssetIdMap[k]);
});

describe("pushFileToGitHub", () => {
    it("pushes a new file if it does not exist", async () => {
        (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue("file-content");
        mockOctokit.repos.getContent.mockRejectedValueOnce(new Error("Not found"));
        mockOctokit.repos.createOrUpdateFileContents.mockResolvedValueOnce({});

        await github.pushFileToGitHub({
            repoSlug: TEST_REPO,
            branch: TEST_BRANCH,
            content: TEST_CONTENT,
            destPath: TEST_DEST_PATH,
            token: TEST_TOKEN,
            commitMessage: TEST_COMMIT_MSG,
        });

        expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
            owner: "owner",
            repo: "repo",
            path: TEST_DEST_PATH,
            ref: TEST_BRANCH,
        });
        expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
            expect.objectContaining({
                owner: "owner",
                repo: "repo",
                path: TEST_DEST_PATH,
                message: TEST_COMMIT_MSG,
                branch: TEST_BRANCH,
                content: TEST_CONTENT.toString("base64"),
                sha: undefined,
            })
        );
    });

    it("updates an existing file if it exists", async () => {
        (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue("file-content");
        mockOctokit.repos.getContent.mockResolvedValueOnce({ data: { sha: "abc123" } });
        mockOctokit.repos.createOrUpdateFileContents.mockResolvedValueOnce({});

        await github.pushFileToGitHub({
            repoSlug: TEST_REPO,
            branch: TEST_BRANCH,
            content: TEST_CONTENT,
            destPath: TEST_DEST_PATH,
            token: TEST_TOKEN,
            commitMessage: TEST_COMMIT_MSG,
        });

        expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
            expect.objectContaining({ sha: "abc123" })
        );
    });
});

describe("fetchGithubAssetMap", () => {
    it("returns parsed map if file exists", async () => {
        const fakeMap = { hash: { assetId: "id", filePath: "foo.png" } };
        const encoded = Buffer.from(JSON.stringify(fakeMap)).toString("base64");
        mockOctokit.repos.getContent.mockResolvedValueOnce({ data: { type: "file", content: encoded } });
        const result = await github.fetchGithubAssetMap({ repoSlug: TEST_REPO, branch: TEST_BRANCH, token: TEST_TOKEN });
        expect(result).toEqual(fakeMap);
    });

    it("returns empty object if file not found", async () => {
        mockOctokit.repos.getContent.mockRejectedValueOnce(new Error("Not found"));
        const result = await github.fetchGithubAssetMap({ repoSlug: TEST_REPO, branch: TEST_BRANCH, token: TEST_TOKEN });
        expect(result).toEqual({});
    });
});

describe("pushGithubAssetMap", () => {
    it("pushes to GitHub", async () => {
        Object.assign(pathToAssetIdMap, { "foo.png": "123" });
        Object.assign(hashToAssetIdMap, { "hash1": "123" });
        mockOctokit.repos.getContent.mockRejectedValueOnce(new Error("Not found"));
        mockOctokit.repos.createOrUpdateFileContents.mockResolvedValueOnce({});

        await github.pushGithubAssetMap(TEST_REPO, TEST_BRANCH, TEST_TOKEN);
        expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalled();
    });
});

describe("pullGithubAssetMap", () => {
    it("updates local maps with new assets", async () => {
        const remoteMap = { hash2: { assetId: "456", filePath: "bar.png" } };
        const encoded = Buffer.from(JSON.stringify(remoteMap)).toString("base64");
        mockOctokit.repos.getContent.mockResolvedValueOnce({ data: { type: "file", content: encoded } });

        await github.pullGithubAssetMap(TEST_REPO, TEST_BRANCH, TEST_TOKEN);

        expect(hashToAssetIdMap["hash2"]).toBe("456");
        expect(pathToAssetIdMap["bar.png"]).toBe("456");
    });
});