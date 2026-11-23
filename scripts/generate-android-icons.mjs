import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const svg = await fs.readFile('public/logo-sit-qudwah.svg');
const res = 'android/app/src/main/res';
const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

for (const [folder, size] of Object.entries(sizes)) {
  const dir = path.join(res, folder);
  await fs.mkdir(dir, { recursive: true });
  const icon = await sharp({ create: { width: size, height: size, channels: 4, background: '#FFFFFF' } })
    .composite([{
      input: await sharp(svg).resize(Math.round(size * 0.84), Math.round(size * 0.84), { fit: 'contain' }).png().toBuffer(),
      gravity: 'centre'
    }])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(dir, 'ic_launcher.png'), icon);
  await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), icon);
}

const drawable = path.join(res, 'drawable');
const adaptive = path.join(res, 'mipmap-anydpi-v26');
await fs.mkdir(drawable, { recursive: true });
await fs.mkdir(adaptive, { recursive: true });

// Crop the white margins around the official vector logo, then center it inside
// Android's adaptive-icon safe area. Keep the school name readable.
const foregroundPng = await sharp(svg)
  .trim({ background: '#FFFFFF', threshold: 18 })
  .resize(300, 300, { fit: 'contain', background: '#FFFFFF' })
  .extend({
    top: 66, bottom: 66, left: 66, right: 66,
    background: '#FFFFFF'
  })
  .png()
  .toBuffer();
await fs.writeFile(path.join(drawable, 'sit_qudwah_launcher_foreground.png'), foregroundPng);
await fs.writeFile(path.join(drawable, 'sit_qudwah_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFF" />
</shape>`);

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/sit_qudwah_launcher_background" />
    <foreground android:drawable="@drawable/sit_qudwah_launcher_foreground" />
</adaptive-icon>
`;
await fs.writeFile(path.join(adaptive, 'ic_launcher.xml'), adaptiveXml, 'utf8');
await fs.writeFile(path.join(adaptive, 'ic_launcher_round.xml'), adaptiveXml, 'utf8');

console.log('SIT Qudwah launcher icons generated for all Android densities.');
