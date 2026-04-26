import sharp from 'sharp';

const CREAM = { r: 0xF5, g: 0xF0, b: 0xE8 };
const WHITE_CUTOFF = 200; // Anything brighter than this becomes fully transparent
const BLACK_CUTOFF = 90;  // Anything darker than this becomes cream

function isGoldish(r, g, b) {
  return r > 130 && g > 90 && b < 140 && r > b + 25;
}

async function process(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    // Aggressive: any near-white pixel that isn't gold → fully transparent
    if (r >= WHITE_CUTOFF && g >= WHITE_CUTOFF && b >= WHITE_CUTOFF && !isGoldish(r, g, b)) {
      out[i + 3] = 0;
      continue;
    }

    // Black/dark grey → cream (anti-aliasing preserved)
    if (r <= BLACK_CUTOFF && g <= BLACK_CUTOFF && b <= BLACK_CUTOFF) {
      const blend = 1 - Math.max(r, g, b) / BLACK_CUTOFF;
      out[i]     = Math.round(CREAM.r * blend + r * (1 - blend));
      out[i + 1] = Math.round(CREAM.g * blend + g * (1 - blend));
      out[i + 2] = Math.round(CREAM.b * blend + b * (1 - blend));
    }
  }

  // Find tight bounding box of non-transparent pixels manually for precision
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels + 3;
      if (out[idx] > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  await sharp(out, { raw: { width, height, channels } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toFile(outputPath);

  console.log(`✓ ${inputPath} → ${outputPath} (${cropW}x${cropH})`);
}

await process('public/logo-horizontal.jpg', 'public/logo-horizontal.png');
await process('public/logo-stacked.jpg', 'public/logo-stacked.png');
