const args = process.argv.slice(2);

export let bleedMode = args.includes("--bleed");
export let cleanMode = args.includes("--clean") || args.includes("clean");
export let watchMode = args.includes("--watch") || args.includes("watch");

export let installMode = args.includes("install");

export let logLevel = args.find((arg) => arg.startsWith("--log-level="))?.split("=")[1] || "info";
export let searchPath = args.find((arg) => arg.startsWith("--path="))?.split("=")[1] || "assets";
export let cacheOutputPath = args.find((arg) => arg.startsWith("--cache="))?.split("=")[1] || ".rbx-sync-cache.json";
export let assetMapOutputPath = args.find((arg) => arg.startsWith("--output="))?.split("=")[1] || "assetMap.ts";

export let prefix = `[rbxtsas]`;

export let githubRepo = args.find((arg) => arg.startsWith("--github="))?.split("=")[1];
export let githubBranch = args.find((arg) => arg.startsWith("--branch="))?.split("=")[1] || "main";