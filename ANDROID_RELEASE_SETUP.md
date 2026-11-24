# Setup kunci tanda tangan Android (sekali saja)

Agar pembaruan APK dapat dipasang di atas aplikasi lama, semua rilis harus memakai keystore yang sama. **Jangan membuat keystore baru untuk setiap versi.** Jika keystore hilang, Android tidak dapat memperbarui instalasi yang memakai kunci lama.

## 1. Buat keystore di komputer sendiri

Pasang Java JDK, lalu jalankan perintah berikut di Terminal/Command Prompt. Ganti alias jika diperlukan. Simpan kata sandi dengan aman dan jangan kirimkan ke chat atau commit ke repository.

```bash
keytool -genkeypair -v -keystore sit-qudwah-release.jks -alias sitqudwah -keyalg RSA -keysize 2048 -validity 10000
```

## 2. Ubah keystore menjadi Base64

Linux/macOS:
```bash
base64 -w 0 sit-qudwah-release.jks
```

Windows PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("sit-qudwah-release.jks"))
```

Salin hasilnya untuk GitHub Secret. Jangan masukkan hasil Base64 ke repository.

## 3. Simpan empat GitHub Actions Secrets

Buka repository → Settings → Secrets and variables → Actions → New repository secret. Buat:

- `ANDROID_KEYSTORE_BASE64`: hasil Base64 keystore.
- `ANDROID_KEYSTORE_PASSWORD`: kata sandi keystore.
- `ANDROID_KEY_ALIAS`: `sitqudwah` (atau alias yang dipilih saat membuat keystore).
- `ANDROID_KEY_PASSWORD`: kata sandi kunci.

Setelah semua secrets disimpan, jalankan Actions → Build Signed Android APK → Run workflow.

**Penting:** APK debug yang sebelumnya dibagikan tidak bisa dijamin dapat diperbarui langsung dengan APK rilis bertanda tangan ini. Perangkat mungkin perlu memasang rilis pertama kali setelah mencadangkan data aplikasi. Sesudah rilis bertanda tangan pertama terpasang, simpan keystore ini secara aman untuk seluruh pembaruan berikutnya.
