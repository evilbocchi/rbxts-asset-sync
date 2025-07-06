import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import LOGGER from "./logging.js";
import { githubRepo } from "./parameters.js";
import { hashToAssetIdMap, pathToAssetIdMap } from "./sync.js";

/**
 * Pushes a file to a GitHub repository using the GitHub API.
 * 
 * @param repoSlug The repo in the form "owner/repo"
 * @param branch The branch to push to (default: main)
 * @param content The content to push (as a Buffer)
 * @param destPath The path in the repo to write to
 * @param token The GitHub token
 */
export async function pushFileToGitHub({
    repoSlug,
    branch = "main",
    content,
    destPath,
    token,
    commitMessage = "Update asset map"
}: {
    repoSlug: string;
    branch?: string;
    content: Buffer;
    destPath: string;
    token: string;
    commitMessage?: string;
}) {
    const [owner, repo] = repoSlug.split("/");
    const octokit = new Octokit({ auth: token });
    const contentEncoded = content.toString("base64");

    // Get the SHA if the file already exists
    let sha: string | undefined = undefined;
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: destPath,
            ref: branch,
        });
        if (!Array.isArray(data) && data.sha) sha = data.sha;
    } catch (e: any) {
        // File does not exist, that's fine
    }

    await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: destPath,
        message: commitMessage,
        content: contentEncoded,
        branch,
        sha,
    });
}

/**
 * Fetches the asset map from a GitHub repository.
 * 
 * @param repoSlug The repo in the form "owner/repo"
 * @param branch The branch to fetch from (default: main)
 * @param token The GitHub token
 * @param destPath The path in the repo to read from (default: "github-asset-map.json")
 * @returns A map of asset hashes to their IDs and file paths, or an empty object if not found.
 */
export async function fetchGithubAssetMap({
    repoSlug,
    branch = "main",
    token,
    destPath = "github-asset-map.json"
}: {
    repoSlug: string;
    branch?: string;
    token: string;
    destPath?: string;
}): Promise<Record<string, { assetId: string, filePath: string; }>> {
    const [owner, repo] = repoSlug.split("/");
    const octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: destPath,
            ref: branch,
        });
        if (Array.isArray(data) || data.type !== "file" || !("content" in data)) return {};
        const content = Buffer.from((data as any).content, "base64").toString("utf8");
        return JSON.parse(content);
    } catch (e) {
        return {};
    }
}

/**
 * Pushes the asset map to a GitHub repository.
 * 
 * This function builds a hash map of asset IDs and their file paths, then writes it to a JSON file
 * and pushes it to the specified GitHub repository.
 * 
 * @param repoSlug The repository slug in the form "owner/repo"
 * @param branch The branch to push to (default: "main")
 * @param token The GitHub token for authentication
 */
export async function pushGithubAssetMap(repoSlug = githubRepo, branch = "main", token = process.env.GITHUB_TOKEN) {
    if (!repoSlug || !branch) {
        return;
    }
    if (!token) {
        LOGGER.error("GITHUB_TOKEN environment variable is not set. Cannot pull from GitHub.");
        return;
    }

    // Build the hash map: { hash: { assetId, filePath } }
    const hashMap: Record<string, { assetId: string, filePath: string; }> = {};
    for (const [filePath, assetId] of Object.entries(pathToAssetIdMap)) {
        // Find hash for this assetId
        const hash = Object.keys(hashToAssetIdMap).find(h => hashToAssetIdMap[h] === assetId);
        if (hash) {
            hashMap[hash] = { assetId, filePath };
        }
    }
    const content = Buffer.from(JSON.stringify(hashMap, null, 2), "utf8");
    try {
        await pushFileToGitHub({
            repoSlug,
            branch,
            content,
            destPath: "github-asset-map.json",
            token,
            commitMessage: "Update asset map from asset sync"
        });
        LOGGER.info(`Pushed github-asset-map.json to ${repoSlug}`);
    }
    catch (err) {
        LOGGER.error("Failed to push to GitHub:", err);
    }
}

/**
 * Pulls the asset map from a GitHub repository and updates the local cache.
 * 
 * This function fetches the asset map from the specified GitHub repository and updates the local
 * `hashToAssetIdMap` and `pathToAssetIdMap` with any new assets found.
 * 
 * @param repoSlug The repository slug in the form "owner/repo"
 * @param branch The branch to pull from (default: "main")
 * @param token The GitHub token for authentication
 */
export async function pullGithubAssetMap(repoSlug = githubRepo, branch = "main", token = process.env.GITHUB_TOKEN) {
    if (!repoSlug || !branch) {
        return;
    }
    if (!token) {
        LOGGER.error("GITHUB_TOKEN environment variable is not set. Cannot pull from GitHub.");
        return;
    }

    try {
        const remoteMap = await fetchGithubAssetMap({ repoSlug, branch, token });
        for (const [hash, { assetId, filePath }] of Object.entries(remoteMap)) {
            if (!(hash in hashToAssetIdMap)) {
                LOGGER.info(`Pulled asset from GitHub: ${filePath} (rbxassetid://${assetId})`);
            }
            hashToAssetIdMap[hash] = assetId;
            pathToAssetIdMap[filePath] = assetId;
        }
    } catch (err) {
        LOGGER.error("Failed to pull from GitHub:", err);
    }
}