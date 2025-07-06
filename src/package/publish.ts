import fs from "fs";
import path from "path";
import { fetchGithubAssetMap, pushFileToGitHub } from "../github.js";
import LOGGER from "../logging.js";
import { githubRepo } from "../parameters.js";
import { pathToAssetIdMap } from "../sync.js";

/**
 * Publishes the current asset library to a GitHub project under a namespace.
 * 
 * @param namespace The namespace to use (e.g. 'minimal')
 * @param repoSlug The GitHub repo (owner/repo)
 * @param branch The branch to use
 * @param token The GitHub token
 */
async function publishAssetLibrary(namespace: string, repoSlug: string, branch: string, token: string) {
    // Pull the current remote asset map
    const remoteMap = await fetchGithubAssetMap({ repoSlug, branch, token });

    // Add all local assets under the namespace
    for (const [filePath, assetId] of Object.entries(pathToAssetIdMap)) {
        const assetName = path.basename(filePath);
        remoteMap[`${namespace}/${assetName}`] = { assetId, filePath };
    }

    // Write to temp file and push
    const outFile = path.resolve("github-asset-map.json");
    fs.writeFileSync(outFile, JSON.stringify(remoteMap, null, 2));
    await pushFileToGitHub({
        repoSlug,
        branch,
        filePath: outFile,
        destPath: "github-asset-map.json",
        token,
        commitMessage: `Publish asset library for @${namespace}`
    });
    LOGGER.info(`Published asset library under @${namespace} to ${repoSlug}`);
}


const nsArg = process.argv.find(arg => arg.startsWith("@"));
if (!nsArg) {
    LOGGER.error("Please provide a namespace, e.g. rbxtsas download @minimal");
    process.exit(1);
}
const namespace = nsArg.slice(1);
const repo = process.env.GITHUB_REPO || githubRepo;
const branch = process.env.GITHUB_BRANCH || "main";
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) {
    LOGGER.error("GITHUB_REPO and GITHUB_TOKEN must be set.");
    process.exit(1);
}
await publishAssetLibrary(namespace, repo, branch, token);
process.exit(0);