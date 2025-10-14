import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import LOGGER from "./logging.js";

const WAV_TO_OGG_ARGS = ["-i", "pipe:0", "-c:a", "flac", "-f", "ogg", "pipe:1"];

/**
 * Converts a WAV audio buffer to an OGG container using a lossless FLAC codec.
 */
export async function convertWavToOgg(input: Buffer): Promise<Buffer> {
	const binaryPath = ffmpegPath;

	if (!binaryPath) {
		throw new Error("FFmpeg binary not found. Ensure ffmpeg-static is installed correctly.");
	}

	return new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		let stderr = "";
		const ffmpeg = spawn(binaryPath, WAV_TO_OGG_ARGS);

		ffmpeg.on("error", (error: Error) => {
			reject(error);
		});

		ffmpeg.stdout.on("data", (chunk: Buffer) => {
			chunks.push(chunk);
		});

		ffmpeg.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		ffmpeg.on("close", (code: number | null) => {
			if (code === 0) {
				resolve(Buffer.concat(chunks));
				return;
			}

			LOGGER.error("ffmpeg stderr:", stderr.trim());
			reject(new Error(`ffmpeg exited with code ${code ?? "unknown"}`));
		});

		ffmpeg.stdin.write(input);
		ffmpeg.stdin.end();
	});
}
