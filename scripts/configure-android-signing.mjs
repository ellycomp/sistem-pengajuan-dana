import fs from 'node:fs';
import path from 'node:path';

const gradlePath = path.resolve('android/app/build.gradle');
if (!fs.existsSync(gradlePath)) {
  throw new Error('android/app/build.gradle tidak ditemukan.');
}

let gradle = fs.readFileSync(gradlePath, 'utf8');
const required = ['ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Secret ${key} belum tersedia.`);
}

const signingBlock = `
    signingConfigs {
        release {
            storeFile file("release-key.jks")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
`;

if (!gradle.includes('signingConfigs {')) {
  gradle = gradle.replace(/\n\s*buildTypes\s*\{/, `\n${signingBlock}\n    buildTypes {`);
}
gradle = gradle.replace(/release\s*\{([\s\S]*?)\n\s*\}/, (block) => {
  if (block.includes('signingConfig')) return block;
  return block.replace(/release\s*\{/, 'release {\n            signingConfig signingConfigs.release');
});

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${pkg.version}"`);

fs.writeFileSync(gradlePath, gradle);
console.log(`Android release signing configured for version ${pkg.version} (code ${versionCode}).`);
