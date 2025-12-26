import { getAsset } from "../../assetMap";

// Example: Using uploaded image assets
const imageAssetId = getAsset("assets/test.png");
print("Image asset ID:", imageAssetId); // e.g., "rbxassetid://1234567890"

// Example: Using embedded text files
const readmeContent = getAsset("assets/README.md");
print("README content:", readmeContent);

const yamlConfig = getAsset("assets/config.yml");
print("YAML config:", yamlConfig);