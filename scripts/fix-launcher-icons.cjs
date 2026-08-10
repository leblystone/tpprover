const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const base = 'android/app/src/main/res';
const src = 'resources/icon.png';

const densities = [
  { folder: 'mipmap-ldpi', legacy: 36, adaptive: 81 },
  { folder: 'mipmap-mdpi', legacy: 48, adaptive: 108 },
  { folder: 'mipmap-hdpi', legacy: 72, adaptive: 162 },
  { folder: 'mipmap-xhdpi', legacy: 96, adaptive: 216 },
  { folder: 'mipmap-xxhdpi', legacy: 144, adaptive: 324 },
  { folder: 'mipmap-xxxhdpi', legacy: 192, adaptive: 432 },
];

async function writeFileWithRetry(filePath, buffer, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, buffer);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

async function run() {
  for (const d of densities) {
    const dir = path.join(base, d.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const flatBuf = await sharp(src)
      .resize(d.legacy, d.legacy, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    await writeFileWithRetry(path.join(dir, 'ic_launcher.png'), flatBuf);

    const circleMaskSvg = '<svg width="' + d.legacy + '" height="' + d.legacy + '"><circle cx="' + (d.legacy / 2) + '" cy="' + (d.legacy / 2) + '" r="' + (d.legacy / 2) + '" fill="white"/></svg>';
    const circleMask = Buffer.from(circleMaskSvg);

    const roundBuf = await sharp(flatBuf)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    await writeFileWithRetry(path.join(dir, 'ic_launcher_round.png'), roundBuf);

    const fgIconSize = Math.round(d.adaptive * 0.85);
    const fgIcon = await sharp(src)
      .resize(fgIconSize, fgIconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const foregroundBuf = await sharp({ create: { width: d.adaptive, height: d.adaptive, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fgIcon, gravity: 'center' }])
      .png()
      .toBuffer();
    await writeFileWithRetry(path.join(dir, 'ic_launcher_foreground.png'), foregroundBuf);

    const backgroundBuf = await sharp({ create: { width: d.adaptive, height: d.adaptive, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
      .png()
      .toBuffer();
    await writeFileWithRetry(path.join(dir, 'ic_launcher_background.png'), backgroundBuf);

    console.log('done', d.folder, 'legacy=' + d.legacy, 'adaptive=' + d.adaptive);
  }
  console.log('ALL DONE');
}

run().catch(err => { console.error(err); process.exit(1); });
