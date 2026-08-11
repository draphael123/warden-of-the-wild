import sharp from "sharp";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node scripts/remove-magenta-key.mjs <input> <output>");

const image = sharp(input).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

for (let offset = 0; offset < data.length; offset += info.channels) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const magenta = Math.min(red, blue) - green;
  const alpha = Math.max(0, Math.min(255, 255 - (magenta - 18) * 2.8));
  data[offset + 3] = Math.min(data[offset + 3], alpha);
  if (alpha < 250) {
    const spill = (255 - alpha) / 255;
    const neutral = Math.min(red, blue);
    data[offset] = Math.round(red * (1 - spill) + neutral * spill);
    data[offset + 2] = Math.round(blue * (1 - spill) + neutral * spill);
  }
}

await sharp(data, { raw: info }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(output);
