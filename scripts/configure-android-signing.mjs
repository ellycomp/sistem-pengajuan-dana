import fs from 'node:fs';
import path from 'node:path';

const gradlePath = path.resolve('android/app/build.gradle');
if (!fs.existsSync(gradlePath)) {
  throw new Error('android/app/build.gradle tidak ditemukan.');
}

let gradle = fs.readFileSync(gradlePath, 'utf8');
for (const key of ['ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD']) {
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

const buildTypesIndex = gradle.indexOf('buildTypes {');
if (buildTypesIndex < 0) throw new Error('Blok buildTypes tidak ditemukan di build.gradle.');
const beforeBuildTypes = gradle.slice(0, buildTypesIndex);
let buildTypes = gradle.slice(buildTypesIndex);
buildTypes = buildTypes.replace(/release\s*\{/, (match) => match + '\n            signingConfig signingConfigs.release');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
let result = beforeBuildTypes + buildTypes;
result = result.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
result = result.replace(/versionName\s+["'][^"']+["']/, `versionName "${pkg.version}"`);

fs.writeFileSync(gradlePath, result);
console.log(`Android release signing configured for version ${pkg.version} (code ${versionCode}).`);
