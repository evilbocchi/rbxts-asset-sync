import { fetchGithubAssetMap } from "../github.js";
import LOGGER from "../logging.js";
import { pathToAssetIdMap, save } from "../sync.js";

/**
 * Downloads an asset library from a GitHub project and injects it into the assetMap under a namespace.
 *
 * @param namespace The namespace to use (e.g. 'minimal')
 * @param repoSlug The GitHub repo (owner/repo)
 * @param branch The branch to use
 * @param token The GitHub token
 */
export async function downloadAssetLibrary(namespace: string, repoSlug: string, branch: string, token: string) {
	const remoteMap = await fetchGithubAssetMap({ repoSlug, branch, token });
	let found = false;
	for (const [key, { assetId }] of Object.entries(remoteMap)) {
		if (key.startsWith(`${namespace}/`)) {
			// Add to local asset map as @namespace/assetname
			const assetName = key.substring(namespace.length + 1);
			pathToAssetIdMap[`@${namespace}/${assetName}`] = assetId;
			found = true;
		}
	}
	if (!found) {
		LOGGER.warn(`No assets found for namespace @${namespace}`);
	} else {
		LOGGER.info(`Downloaded asset library @${namespace} and injected into assetMap.`);
	}

	await save();
}
