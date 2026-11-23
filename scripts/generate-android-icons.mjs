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
await fs.mkdir(drawableAnyDpiV24, { recursive: true });
await fs.mkdir(adaptive, { recursive: true });

// Android adaptive icons use a 108dp canvas with a 66dp safe area.
// Crop only the outer white margin, then scale the complete school emblem
// (including the school name) into the safe area with transparent padding.
const foregroundPng = await sharp(svg)
  .trim({ background: '#FFFFFF', threshold: 18 })
  .resize(264, 264, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .extend({
    top: 84, bottom: 84, left: 84, right: 84,
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png()
  .toBuffer();

// Replace Capacitor's exact foreground resource name in the app resource
// namespace. Remove the library-style vector defaults that caused the
// green-gradient-only launcher icon on Android 8+.
for (const file of [
  path.join(drawableAnyDpiV24, 'ic_launcher_foreground.xml'),
  path.join(drawableAnyDpiV24, '$ic_launcher_foreground__0.xml'),
]) {
  await fs.rm(file, { force: true });
}
await fs.writeFile(path.join(drawable, 'ic_launcher_foreground.png'), foregroundPng);
await fs.writeFile(path.join(drawableAnyDpiV24, 'ic_launcher_foreground.png'), foregroundPng);

await fs.writeFile(path.join(drawable, 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFF" />
</shape>`);

// Do not ship adaptive XML resources for now. Some Android launchers were
// resolving Capacitor's adaptive background instead of our foreground layer.
// Removing these two resources forces Android to use the verified, density-
// specific ic_launcher.png and ic_launcher_round.png generated above.
await fs.rm(path.join(adaptive, 'ic_launcher.xml'), { force: true });
await fs.rm(path.join(adaptive, 'ic_launcher_round.xml'), { force: true });

console.log('SIT Qudwah raster launcher icons generated for all Android densities.');
