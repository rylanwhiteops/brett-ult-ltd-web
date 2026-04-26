import sharp from 'sharp';

// Site cream color — replaces black so logo reads on dark background
const CREAM = { r: 0xF5, g: 0xF0, b: 0xE8 };

const WHITE_THRESHOLD = 235;
const BLACK_THRESHOLD = 80;

function isGoldish(r, g, b) {
  // Gold: high R, mid G, low B
  return r > 140 && g > 100 && b < 130 && r > b + 30;
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

    // White → transparent
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      out[i + 3] = 0;
      continue;
    }

    // Soft white edge → fade alpha
    if (r >= 200 && g >= 200 && b >= 200 && !isGoldish(r, g, b)) {
      const max = Math.max(r, g, b);
      const alpha = 255 - Math.round(((max - 200) / (WHITE_THRESHOLD - 200)) * 255);
      out[i + 3] = Math.max(0, alpha);
      continue;
    }

    // Black → cream (preserving anti-aliasing intensity)
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      // Map black (0) → cream (full), grey (BLACK_THRESHOLD) → cream (slightly faded toward grey)
      const blend = 1 - Math.max(r, g, b) / BLACK_THRESHOLD;
      out[i]     = Math.round(CREAM.r * blend + r * (1 - blend));
      out[i + 1] = Math.round(CREAM.g * blend + g * (1 - blend));
      out[i + 2] = Math.round(CREAM.b * blend + b * (1 - blend));
      continue;
    }

    // Mid-tone grey (between black threshold and gold) → blend toward cream
    if (!isGoldish(r, g, b) && r < 180 && g < 180 && b < 180 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
      const lightness = Math.max(r, g, b) / 255;
      out[i]     = Math.round(CREAM.r * (1 - lightness) + r * lightness);
      out[i + 1] = Math.round(CREAM.g * (1 - lightness) + g * lightness);
      out[i + 2] = Math.round(CREAM.b * (1 - lightness) + b * lightness);
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log(`✓ ${inputPath} → ${outputPath}`);
}

await process('public/logo-horizontal.jpg', 'public/logo-horizontal.png');
await process('public/logo-stacked.jpg', 'public/logo-stacked.png');
