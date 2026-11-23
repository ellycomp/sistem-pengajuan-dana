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
const drawableAnyDpiV24 = path.join(res, 'drawable-anydpi-v24');
const adaptive = path.join(res, 'mipmap-anydpi-v26');
await fs.mkdir(drawable, { recursive: true });
await fs.mkdir(adaptive, { recursive: true });

// Capacitor's default drawable-anydpi-v24 foreground vector takes precedence
// over drawable/ic_launcher_foreground.png on Android 8+.
// Remove both generated defaults so the adaptive icon uses our SIT Qudwah PNG.
for (const file of [
  path.join(drawableAnyDpiV24, 'ic_launcher_foreground.xml'),
  path.join(drawableAnyDpiV24, '$ic_launcher_foreground__0.xml'),
]) {
  await fs.rm(file, { force: true });
}
await sharp(svg).resize(324, 324, { fit: 'contain' }).png().toFile(path.join(drawable, 'ic_launcher_foreground.png'));

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/white" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
await fs.writeFile(path.join(adaptive, 'ic_launcher.xml'), adaptiveXml, 'utf8');
await fs.writeFile(path.join(adaptive, 'ic_launcher_round.xml'), adaptiveXml, 'utf8');

console.log('SIT Qudwah launcher icons generated for all Android densities.');
