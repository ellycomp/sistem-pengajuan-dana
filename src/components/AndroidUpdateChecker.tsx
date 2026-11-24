import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { AppInstallPlugin } from '@m430/capacitor-app-install';
import { APP_VERSION } from '../version';

type ReleaseInfo = {
  tag_name: string;
  body?: string;
  assets?: Array<{ name: string; browser_download_url: string; size: number }>;
};

const RELEASE_API = 'https://api.github.com/repos/ellycomp/sistem-pengajuan-dana/releases/latest';

function isNewer(remote: string, local: string): boolean {
  const clean = (value: string) => value.replace(/^v/i, '').split('.').map((part) => Number(part) || 0);
  const a = clean(remote);
  const b = clean(local);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function AndroidUpdateChecker() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const checkUpdate = async () => {
    setChecking(true);
    setMessage('');
    try {
      const response = await fetch(RELEASE_API, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Server pembaruan tidak dapat dihubungi.');
      const latest = (await response.json()) as ReleaseInfo;
      if (isNewer(latest.tag_name, APP_VERSION)) setRelease(latest);
      else setRelease(null);
    } catch {
      setMessage('Pemeriksaan pembaruan belum berhasil. Periksa koneksi internet.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    void checkUpdate();
  }, []);

  if (Capacitor.getPlatform() !== 'android') return null;

  const installUpdate = async () => {
    const apk = release?.assets?.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
    if (!apk) {
      setMessage('Berkas APK untuk versi terbaru belum tersedia.');
      return;
    }
    setBusy(true);
    setMessage('Memeriksa izin pemasangan...');
    try {
      const permission = await AppInstallPlugin.canInstallUnknownApps();
      if (!permission.granted) {
        setMessage('Izinkan pemasangan aplikasi dari aplikasi ini. Setelah kembali, tekan Perbarui Sekarang sekali lagi.');
        await AppInstallPlugin.openInstallUnknownAppsSettings();
        return;
      }

      setMessage('Mengunduh pembaruan aplikasi...');
      const response = await fetch(apk.browser_download_url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unduhan APK gagal. Silakan coba lagi.');
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 100000) throw new Error('Berkas pembaruan tidak lengkap.');
      const fileName = 'pengajuan-dana-sit-qudwah-update.apk';
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: toBase64(buffer),
        directory: Directory.Cache,
        recursive: true,
      });
      setMessage('Unduhan selesai. Membuka pemasang Android...');
      await AppInstallPlugin.installApk({ filePath: saved.uri });
      setMessage('Pemasang Android telah dibuka. Ikuti konfirmasi pada layar untuk menyelesaikan pembaruan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pembaruan gagal diproses.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-[#BEC9C6] bg-[#F5F8F6] p-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#00433C]">Pembaruan Aplikasi</p>
        <button type="button" onClick={() => void checkUpdate()} disabled={checking || busy}
          className="text-xs font-semibold text-[#00433C] underline disabled:opacity-50">
          {checking ? 'Memeriksa...' : 'Periksa lagi'}
        </button>
      </div>
      {release ? (
        <>
          <p className="mt-1 text-sm font-semibold text-[#191C1B]">Versi {release.tag_name.replace(/^v/i, '')} tersedia</p>
          {release.body && <p className="mt-1 max-h-20 overflow-auto whitespace-pre-line text-xs text-[#3F4947]">{release.body}</p>}
          <button type="button" onClick={() => void installUpdate()} disabled={busy}
            className="mt-3 w-full rounded-lg bg-[#00433C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Memproses pembaruan...' : 'Perbarui Sekarang'}
          </button>
        </>
      ) : (
        <p className="mt-1 text-xs text-[#3F4947]">{checking ? 'Memeriksa versi terbaru...' : 'Aplikasi Anda menggunakan versi terbaru.'}</p>
      )}
      {message && <p role="status" className="mt-2 break-words text-xs text-[#3F4947]">{message}</p>}
    </div>
  );
}
