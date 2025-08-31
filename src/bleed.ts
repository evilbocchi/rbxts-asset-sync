import sharp from "sharp";

// The nearest neighbor directions for bleeding alpha
const directions = [
	[-1, 0],
	[1, 0],
	[0, -1],
	[0, 1],
	[-1, -1],
	[-1, 1],
	[1, -1],
	[1, 1],
];

/**
 * Processes an image to bleed the alpha channel, filling transparent pixels
 * with the color of the nearest non-transparent pixel.
 *
 * @param input - The input image file or buffer.
 * @returns A buffer containing the processed PNG image with bleeding alpha.
 */
export async function bleedAlpha(input: sharp.SharpInput | Array<sharp.SharpInput>): Promise<Buffer> {
	const image = sharp(input);
	const { width, height } = await image.metadata();
	if (!width || !height) throw "Invalid image dimensions";

	const raw = await image.raw().ensureAlpha().toBuffer();
	const channels = 4;

	const getPixel = (x: number, y: number): [number, number, number, number] => {
		const i = (y * width + x) * channels;
		return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
	};

	const setPixel = (x: number, y: number, rgba: [number, number, number, number]) => {
		const i = (y * width + x) * channels;
		raw[i] = rgba[0];
		raw[i + 1] = rgba[1];
		raw[i + 2] = rgba[2];
		raw[i + 3] = rgba[3];
	};

	const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const xyPixel = getPixel(x, y);
			if (xyPixel[3] === 0) {
				for (const [dx, dy] of directions) {
					const nx = x + dx;
					const ny = y + dy;
					if (inBounds(nx, ny)) {
						const [nr, ng, nb, na] = getPixel(nx, ny);
						if (na > 0) {
							setPixel(x, y, [nr, ng, nb, 0]);
							break;
						}
					}
				}
			}
		}
	}

	const pngBuffer = await sharp(raw, { raw: { width, height, channels: 4 } })
		.png()
		.toBuffer();
	return pngBuffer;
}
