/**
 * Generates the application icons from the MeskikCode square lockup.
 *
 *   npm run icons
 *
 * The logo is only resized, never redrawn or recoloured. The maskable icon
 * places the same image at 80% on its own background colour, so that the
 * circular and rounded masks Android applies never cut into the mark.
 *
 * The generated files are committed; run this again only if the source
 * logo changes.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const SOURCE = join(ROOT, "scripts", "brand", "logo-lockup-square.png");
const OUT = join(ROOT, "public", "icons");

mkdirSync(OUT, { recursive: true });

const plain = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of plain) {
  await sharp(SOURCE).resize(size, size).png({ compressionLevel: 9 }).toFile(join(OUT, name));
}

// Background of the lockup, read from its top-left pixel.
const { data } = await sharp(SOURCE).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
const background = { r: data[0], g: data[1], b: data[2], alpha: 1 };

const inner = Math.round(512 * 0.8);
const pad = Math.round((512 - inner) / 2);
await sharp(SOURCE)
  .resize(inner, inner)
  .extend({ top: pad, bottom: 512 - inner - pad, left: pad, right: 512 - inner - pad, background })
  .png({ compressionLevel: 9 })
  .toFile(join(OUT, "icon-maskable-512.png"));

console.log(`gen-icons  ${plain.length + 1} icons written to public/icons`);
