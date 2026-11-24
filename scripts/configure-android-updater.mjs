import fs from 'node:fs';
import path from 'node:path';

// The APK installer plugin contributes its own FileProvider and install permission.
// This file scopes that provider to app-private cache/files only.
const xmlDir = path.resolve('android/app/src/main/res/xml');
fs.mkdirSync(xmlDir, { recursive: true });
const paths = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="cache" path="." />
    <files-path name="files" path="." />
</paths>
`;
fs.writeFileSync(path.join(xmlDir, 'file_paths.xml'), paths);
console.log('Ruang akses aman untuk berkas APK pembaruan telah disiapkan.');
