import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) throw new Error('AndroidManifest.xml tidak ditemukan.');
let manifest = fs.readFileSync(manifestPath, 'utf8');

if (!manifest.includes('android.permission.REQUEST_INSTALL_PACKAGES')) {
  manifest = manifest.replace('<manifest ', '<manifest ');
  manifest = manifest.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />');
}

const provider = `
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
`;
if (!manifest.includes('androidx.core.content.FileProvider')) {
  manifest = manifest.replace('</application>', provider + '\n    </application>');
}
fs.writeFileSync(manifestPath, manifest);

const xmlDir = path.resolve('android/app/src/main/res/xml');
fs.mkdirSync(xmlDir, { recursive: true });
const paths = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="cache" path="." />
    <files-path name="files" path="." />
</paths>
`;
fs.writeFileSync(path.join(xmlDir, 'file_paths.xml'), paths);
console.log('Konfigurasi izin pemasangan APK dan FileProvider selesai.');
