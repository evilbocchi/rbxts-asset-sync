<p align="center">
    <img src="assets/icon.png">
</p>

# rbxts-asset-sync
[![Build](https://github.com/evilbocchi/rbxts-asset-sync/actions/workflows/build-and-release.yml/badge.svg?branch=master&event=push)](https://github.com/evilbocchi/rbxts-asset-sync/actions/workflows/build-and-release.yml)
[![GitHub](https://img.shields.io/github/release/evilbocchi/rbxts-asset-sync.svg)](https://github.com/evilbocchi/rbxts-asset-sync/releases/latest)
[![CodeFactor](https://www.codefactor.io/repository/github/evilbocchi/rbxts-asset-sync/badge)](https://www.codefactor.io/repository/github/evilbocchi/rbxts-asset-sync)

Local asset CDN pipeline for [roblox-ts](https://roblox-ts.com/).  
**rbxts-asset-sync** automates the process of uploading local asset files (images, audio, models, etc.) to Roblox via the Open Cloud API, and generates a TypeScript asset map for easy asset referencing in your roblox-ts projects.

## Features

- **Automatic Asset Upload:** Uploads assets from a local folder to Roblox using Open Cloud.
- **Asset Map Generation:** Generates a TypeScript file mapping asset paths to `rbxassetid://` IDs.
- **Change Watching:** Optionally watches your asset folder and syncs changes automatically.
- **Caching:** Avoids re-uploading unchanged assets using a hash-based cache.
- **Roblox-ts Integration:** Asset map can be imported and used directly in roblox-ts scripts.

## Installation

```sh
npm install --save-dev rbxts-asset-sync
```

Or use `npx` for one-off usage.

## Setup

1. **Roblox Open Cloud API Key:**  
   - Create an API key with the "Asset Management" permission for your user or group.
   - Set the following environment variables (e.g., in a `.env` file at your project root):

     ```
     ROBLOX_API_KEY=your-api-key-here
     ROBLOX_USER_ID=your-roblox-user-id
     # Optionally, for group uploads:
     # ROBLOX_GROUP_ID=your-group-id
     ```

2. **Project Structure:**  
   Place your assets (e.g., images, audio) in a folder (default: `assets/`).

## Usage

### One-time Sync

Uploads all assets in the watched folder and generates the asset map.

```sh
npx rbxts-asset-sync
```

### Watch Mode

Continuously watches for changes and uploads new/changed assets automatically.

```sh
npx rbxts-asset-sync --watch
```

### Options

- `--path=assets` &nbsp;&nbsp;&nbsp;&nbsp; Set the folder to watch for assets (default: `assets`)
- `--output=assetMap.ts` &nbsp;&nbsp; Set the output path for the generated asset map (default: `assetMap.ts`)
- `--cache=.rbx-sync-cache.json` &nbsp;&nbsp; Set the cache file path

Example:

```sh
npx rbxts-asset-sync --path=assets --output=src/assetMap.ts --watch
```

## Integration with roblox-ts

The tool generates a TypeScript file (default: `assetMap.ts`) like:

```ts
export const assets = {
  "assets/test.png": "rbxassetid://1234567890",
  // ...
} as const;

export function getAsset(path: keyof typeof assets): string {
  return assets[path];
}
```

**Usage in your roblox-ts code:**

```ts
import { getAsset } from "../../assetMap";

const assetId = getAsset("assets/test.png");
// Use assetId with Roblox APIs
```

> Changes to Rojo's file tree and tsconfig.json may be needed if assetMap.ts is *outside* of src, which is the default setting when no parameters are specified. View [default.project.json](example/default.project.json) and [tsconfig.json](example/tsconfig.json) in the example folder for reference.

## Advanced

- **Custom Asset Types:**  
  The tool guesses asset types by file extension (`.png`, `.jpg` → Decal, `.mp3` → Audio, etc.).
- **Cache:**  
  Asset hashes are stored in `.rbx-sync-cache.json` to avoid redundant uploads.

## Scripts Example

Add to your `package.json`:

```json
{
  "scripts": {
    "asset-sync": "npx rbxts-asset-sync",
    "asset-watch": "npx rbxts-asset-sync --watch"
  }
}
```

## Troubleshooting

- Ensure your API key has the correct permissions.
- Make sure your `.env` file is present and correctly configured.
- If assets are not uploading, check the CLI output for error messages.

## License

MIT
