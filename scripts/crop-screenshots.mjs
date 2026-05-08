import sharp from 'sharp';
import fs from 'node:fs/promises';

const IN_DIR = './mobile-audit';
const OUT_DIR = './mobile-audit/crops';
await fs.mkdir(OUT_DIR, { recursive: true });

const files = await fs.readdir(IN_DIR);
for (const f of files.filter(f => f.endsWith('-full.png'))) {
  const name = f.replace('-full.png', '');
  const meta = await sharp(`${IN_DIR}/${f}`).metadata();
  const sliceH = 1500; // each slice 1500px tall (roughly 1.7 viewports)
  const slices = Math.ceil(meta.height / sliceH);

  for (let i = 0; i < slices; i++) {
    const top = i * sliceH;
    const height = Math.min(sliceH, meta.height - top);
    await sharp(`${IN_DIR}/${f}`)
      .extract({ left: 0, top, width: meta.width, height })
      .resize({ width: 390 }) // resize to mobile viewport width
      .toFile(`${OUT_DIR}/${name}-${String(i + 1).padStart(2, '0')}.png`);
  }
  console.log(`✓ ${name}: ${slices} slices`);
}
