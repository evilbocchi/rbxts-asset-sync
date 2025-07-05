import FormData from "form-data";
import mime from "mime";
import path from "path";

export async function uploadAsset(filename: string, buffer: Buffer): Promise<string> {
    const API_KEY = process.env.ROBLOX_API_KEY;
    const USER_ID = process.env.ROBLOX_USER_ID;
    const GROUP_ID = process.env.ROBLOX_GROUP_ID;

    if (!API_KEY) {
        throw "ROBLOX_API_KEY environment variable is not set";
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = mime.getType(ext) || "application/octet-stream";

    // Prepare the request JSON (without fileContent)
    const requestData = {
        assetType: guessAssetType(ext),
        displayName: filename,
        description: "Uploaded via rbx-asset-sync",
        creationContext: {
            creator: GROUP_ID ? { groupId: GROUP_ID } : { userId: USER_ID }
        }
    };

    // Build multipart form data
    const form = new FormData();
    form.append("request", JSON.stringify(requestData));
    form.append("fileContent", buffer, {
        filename,
        contentType,
    });

    const formBuffer = form.getBuffer();
    const contentLength = form.getLengthSync();
    const res = await fetch("https://apis.roblox.com/assets/v1/assets", {
        method: "POST",
        headers: {
            "x-api-key": API_KEY,
            ...form.getHeaders(),
            "Content-Length": contentLength.toString(),
        },
        body: formBuffer,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw `${res.status} ${res.statusText}\n${errText}`;
    }

    const data = await res.json();

    await new Promise((resolve) => setTimeout(resolve, 3000)); // wait for 3 seconds to ensure asset is processed
    const asset = await getAsset(data.path);
    return asset.response.assetId;
}

export async function getAsset(operationPath: string, retries = 3) {
    if (retries-- <= 0) {
        throw "Max retries exceeded while fetching asset";
    }
    const API_KEY = process.env.ROBLOX_API_KEY;
    if (!API_KEY) {
        throw "ROBLOX_API_KEY environment variable is not set";
    }

    const res = await fetch("https://apis.roblox.com/assets/v1/" + operationPath, {
        method: "GET",
        headers: {
            "x-api-key": API_KEY,
        },
    });

    if (!res.ok) {
        const errText = await res.text();
        console.warn(`Failed to fetch asset: ${res.status} ${res.statusText}\n${errText} (Retries left: ${retries})`);
        return getAsset(operationPath, retries);
    }

    const data = await res.json();
    if (!data.done) {
        // wait for 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log(`Asset not ready yet, retrying...`);
        return getAsset(operationPath, retries + 1);
    }

    return data;
}

function guessAssetType(ext: string): string {
    switch (ext) {
        case ".png":
        case ".jpg":
        case ".jpeg":
            return "Decal";
        case ".mp3":
        case ".ogg":
            return "Audio";
        case ".fbx":
            return "Model";
        default:
            return "Decal"; // fallback
    }
}