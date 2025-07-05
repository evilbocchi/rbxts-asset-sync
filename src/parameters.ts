const args = process.argv.slice(2);
export let watchMode = args.includes("--watch");
export let watchingPath = args.find((arg) => arg.startsWith("--path="))?.split("=")[1] || "assets";
export let cacheOutputPath = args.find((arg) => arg.startsWith("--cache="))?.split("=")[1] || ".rbx-sync-cache.json";
export let assetMapOutputPath = args.find((arg) => arg.startsWith("--output="))?.split("=")[1] || "assetMap.ts";

export let prefix = `[rbxtsas]`;