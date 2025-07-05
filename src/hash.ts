import crypto from "crypto";

export function getHash(buffer: Buffer): string {
    return crypto.createHash("sha1").update(buffer).digest("hex");
}