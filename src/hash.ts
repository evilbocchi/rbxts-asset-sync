import crypto from "crypto";

/**
 * Generates a SHA-1 hash for the given buffer.
 *
 * @param buffer - The buffer to hash.
 * @returns The SHA-1 hash as a hexadecimal string.
 */
export function getHash(buffer: Buffer): string {
	return crypto.createHash("sha1").update(buffer).digest("hex");
}
