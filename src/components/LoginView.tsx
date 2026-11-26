import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Info, X } from 'lucide-react';
import { RoleId, UserAccount } from '../types/kassekolah';
import { SchoolLogo } from './SchoolLogo';
import { supabase } from '../lib/supabase';
import { APP_VERSION } from '../version';
import { AndroidUpdateChecker } from './AndroidUpdateChecker';

interface LoginViewProps {
  accounts: UserAccount[];
  onLogin: (account: UserAccount, remember: boolean) => void;
}

export function LoginView({ accounts, onLogin }: LoginViewProps) {
  // Open with the known administrator profile; never prefill demo passwords.
  const defaultDirector = accounts.find((a) => a.role === 'direktur');

  const [selectedRole, setSelectedRole] = useState<RoleId>('direktur');
  const [email, setEmail] = useState<string>(defaultDirector?.email || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loginBusy, setLoginBusy] = useState<boolean>(false);
  const [showForgotHelp, setShowForgotHelp] = useState<boolean>(false);
  const [resetBusy, setResetBusy] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string>('');
  const [recoveryMode, setRecoveryMode] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showReleaseNotes, setShowReleaseNotes] = useState<boolean>(false);

  useEffect(() => {
    if (!supabase) return;

    const recoveryUrl = () =>
      window.location.hash.includes('type=recovery') ||
      new URLSearchParams(window.location.search).has('code');

    // The recovery URL can be loaded before React subscribes to the auth event.
    // Check the URL and current session as a fallback so the reset form is not missed.
    if (recoveryUrl()) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        if (sessionData.session) {
          setRecoveryMode(true);
          setShowForgotHelp(false);
        }
      });
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (recoveryUrl() && session)) {
        setRecoveryMode(true);
        setShowForgotHelp(false);
        setErrorMsg('');
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const sendPasswordReset = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setResetMessage('Masukkan email akun terlebih dahulu.');
      return;
    }
    if (!supabase) {
      setResetMessage('Koneksi Supabase belum tersedia.');
      return;
    }
    setResetBusy(true);
    setResetMessage('');
    // Always return password-recovery links to the deployed GitHub Pages app.
    // Using window.location.origin alone can produce localhost:3000 in preview/dev builds.
    const productionRedirect = 'https://ellycomp.github.io/sistem-pengajuan-dana/';
    const result = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: productionRedirect,
    });
    setResetBusy(false);
    setResetMessage(result.error
      ? 'Gagal mengirim tautan: ' + result.error.message
      : 'Tautan pengaturan ulang telah dikirim jika email terdaftar. Periksa kotak masuk dan folder Spam.');
  };

  const saveNewPassword = async () => {
    if (newPassword.length < 8) {
      setResetMessage('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetMessage('Konfirmasi kata sandi belum sama.');
      return;
    }
    if (!supabase) return;
    setResetBusy(true);
    setResetMessage('');
    const result = await supabase.auth.updateUser({ password: newPassword });
    setResetBusy(false);
    if (result.error) {
      setResetMessage('Gagal memperbarui kata sandi: ' + result.error.message);
      return;
    }
    await supabase.auth.signOut();
    setRecoveryMode(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setPassword('');
    setResetMessage('Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.');
  };

  const handleRoleChange = (role: RoleId) => {
    setSelectedRole(role);
    const matchingAccount = accounts.find((a) => a.role === role);
    setEmail(matchingAccount?.email || '');
    // Clear password when switching to Direktur so credentials are entered explicitly
    setPassword('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Silakan masukkan email sekolah.');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan kata sandi Anda.');
      return;
    }

    if (!supabase) {
      setErrorMsg('Koneksi Supabase belum tersedia. Periksa konfigurasi GitHub Actions.');
      return;
    }

    setErrorMsg('');
    setLoginBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error || !data.user) {
        const raw = error?.message || '';
        const friendly = /invalid login credentials/i.test(raw)
          ? 'Email atau kata sandi salah. Pastikan akun sudah dibuat di Supabase Authentication dan kata sandinya benar.'
          : /email not confirmed/i.test(raw)
            ? 'Email akun belum dikonfirmasi. Pengelola perlu mengonfirmasi akun melalui Supabase Authentication.'
            : raw || 'Email atau kata sandi tidak sesuai.';
        setErrorMsg(friendly);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, role, title, unit, avatar')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        const detail = profileError
          ? ` Kode: ${profileError.code || 'tidak tersedia'} — ${profileError.message}`
          : '';
        setErrorMsg(`Login Auth berhasil, tetapi profil database tidak terbaca.${detail}`);
        return;
      }

      if (profile.role !== selectedRole) {
        await supabase.auth.signOut();
        setErrorMsg(`Akun ini terdaftar sebagai "${profile.role}", bukan "${selectedRole}". Pilih peran yang sesuai.`);
        return;
      }

      const authenticatedAccount: UserAccount = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        title: profile.title,
        unit: profile.unit,
        avatar: profile.avatar || profile.name.slice(0, 2).toUpperCase(),
        password: '',
        isDefault: false,
      };
      onLogin(authenticatedAccount, rememberMe);
    } catch (loginError) {
      setErrorMsg(loginError instanceof Error
        ? `Tidak dapat menghubungi layanan login: ${loginError.message}`
        : 'Terjadi kesalahan saat masuk. Periksa koneksi internet dan coba kembali.');
    } finally {
      setLoginBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAF8] text-[#191C1B]">
      {/* Desktop Split Layout (>= lg) */}
      <main className="hidden lg:grid min-h-screen w-full grid-cols-12">
        {/* Panel Kiri: Identitas SIT Qudwah & Ringkasan Alur */}
        <section
          aria-label="Informasi Portal"
          className="col-span-5 bg-[#00433C] text-[#FFFFFF] p-8 xl:p-10 flex flex-col justify-between gap-8"
        >
          <div className="flex items-center gap-4">
            <SchoolLogo className="w-12 h-16 p-1 border-transparent" />
            <div>
              <p className="font-title text-[18px] leading-[24px] font-semibold text-[#FFFFFF]">
                Sistem Pengajuan Dana
              </p>
              <p className="font-body text-[14px] leading-[20px] text-[#90D3C7]">
                SIT Qudwah Sungai Rengit
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 max-w-md">
            <h1 className="font-display text-[40px] leading-[44px] tracking-[-0.5px] font-bold text-[#FFFFFF] text-balance">
              Pengajuan Dana Belanja Sekolah yang Transparan
            </h1>
            <p className="font-body text-[16px] leading-[24px] text-[#90D3C7] text-pretty">
              Satu portal terpadu bagi Guru/Staf, Kepala Seksi Sarana, Bendahara
              Sekolah, Bendahara Umum, hingga Direktur SIT Qudwah Sungai Rengit.
            </p>
          </div>

          <div className="border-t border-[#0F5C53] pt-4 flex items-center justify-between gap-2">
            <span className="font-label text-[12px] leading-[16px] tracking-[0.2px] font-medium text-[#90D3C7]">
              Beriman · Berakhlak · Berilmu
            </span>
            <span className="font-label text-[12px] leading-[16px] tracking-[0.2px] font-medium text-[#90D3C7] tabular-nums">
              TA 2026
            </span>
          </div>
        </section>

        {/* Panel Kanan: Kartu Formulir Masuk */}
        <section
          aria-label="Formulir Masuk"
          className="col-span-7 bg-[#F8FAF8] flex items-center justify-center p-8"
        >
          <div className="w-full max-w-md rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-8 flex flex-col gap-6">
            <div>
              <h2 className="font-headline text-[28px] leading-[34px] tracking-[-0.25px] font-semibold text-[#191C1B]">
                Masuk ke Akun Anda
              </h2>
              <p className="font-body text-[14px] leading-[20px] text-[#3F4947] mt-1">
                Gunakan email terdaftar pada portal SIT Qudwah
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-[8px] border border-[#BA1A1A]/30 bg-[#FFDAD6] text-[#410002] px-3 py-2.5 text-[13px] font-medium"
              >
                {errorMsg}
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="web-role"
                  className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B]"
                >
                  Peran Akses
                </label>
                <select
                  id="web-role"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as RoleId)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2.5 font-body text-[14px] leading-[20px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                >
                  <option value="guru">Guru / Staf Pengaju</option>
                  <option value="sarana">Kepala Seksi Sarana</option>
                  <option value="bendahara-sekolah">Bendahara Sekolah</option>
                  <option value="bendahara-umum">Bendahara Umum</option>
                  <option value="direktur">
                    Direktur SIT Qudwah Sungai Rengit
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="web-email"
                  className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B]"
                >
                  Email Masuk
                </label>
                <input
                  id="web-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@sitqudwah.sch.id"
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2.5 font-body text-[14px] leading-[20px] text-[#191C1B] placeholder:text-[#3F4947] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="web-password"
                    className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B]"
                  >
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotHelp(true)}
                    className="font-label text-[12px] leading-[16px] font-medium text-[#00433C] hover:underline"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="web-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] pl-4 pr-12 py-2.5 font-body text-[14px] leading-[20px] text-[#191C1B] placeholder:text-[#3F4947] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword
                        ? 'Sembunyikan kata sandi'
                        : 'Tampilkan kata sandi'
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-[#3F4947] hover:bg-[#F2F4F2]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[4px] border-[#BEC9C6] text-[#00433C] focus:ring-[#00433C]"
                />
                <span className="font-body text-[14px] leading-[20px] text-[#3F4947]">
                  Ingat sesi saya di perangkat ini
                </span>
              </label>

              <button
                type="submit"
                disabled={loginBusy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2.5 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00433C] mt-1"
              >
                <span>{loginBusy ? 'Memeriksa akun...' : 'Masuk ke Portal'}</span>
              </button>
            </form>
            <AndroidUpdateChecker />
          </div>
        </section>
      </main>

      {/* Mobile Layout (< lg) */}
      <main className="lg:hidden min-h-screen w-full max-w-md mx-auto bg-[#F8FAF8] px-6 py-8 flex flex-col justify-between gap-8">
        <header className="flex flex-col items-center text-center gap-2 pt-4">
          <SchoolLogo className="w-20 h-28 rounded-[12px] p-1" />
          <div>
            <h1 className="font-display text-[28px] leading-[34px] tracking-[-0.25px] font-bold text-[#191C1B]">
              Sistem Pengajuan Dana
            </h1>
            <p className="font-body text-[14px] leading-[20px] text-[#3F4947]">
              SIT Qudwah Sungai Rengit
            </p>
          </div>
        </header>

        <section
          aria-label="Formulir Masuk Mobile"
          className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-6 flex flex-col gap-4"
        >
          <div>
            <h2 className="font-title text-[18px] leading-[24px] font-semibold text-[#191C1B]">
              Masuk ke Aplikasi
            </h2>
            <p className="font-body text-[14px] leading-[20px] text-[#3F4947] mt-1">
              Pengajuan &amp; persetujuan dana belanja
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-[8px] border border-[#BA1A1A]/30 bg-[#FFDAD6] text-[#410002] px-3 py-2 text-[13px] font-medium"
            >
              {errorMsg}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="mob-role"
                className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B]"
              >
                Peran Akses
              </label>
              <select
                id="mob-role"
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as RoleId)}
                className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2.5 font-body text-[14px] leading-[20px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
              >
                <option value="guru">Guru / Staf Pengaju</option>
                <option value="sarana">Kepala Seksi Sarana</option>
                <option value="bendahara-sekolah">Bendahara Sekolah</option>
                <option value="bendahara-umum">Bendahara Umum</option>
                <option value="direktur">Direktur SIT Qudwah</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="mob-email"
                className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B]"
              >
                Email Masuk
              </label>
              <input
                id="mob-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@sitqudwah.sch.id"
                className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2.5 font-body text-[14px] leading-[20px] text-[#191C1B] placeholder:text-[#3F4947] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="mob-password"
                  className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B]"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotHelp(true)}
                  className="font-label text-[12px] leading-[16px] font-medium text-[#00433C] hover:underline"
                >
                  Lupa sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  id="mob-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] pl-4 pr-12 py-2.5 font-body text-[14px] leading-[20px] text-[#191C1B] placeholder:text-[#3F4947] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan kata sandi'
                      : 'Tampilkan kata sandi'
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-[#3F4947] hover:bg-[#F2F4F2]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2.5 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00433C] mt-1"
            >
              <span>{loginBusy ? 'Memeriksa akun...' : 'Masuk ke Aplikasi'}</span>
            </button>
          </form>
        </section>

        <footer className="text-center pb-2">
          <p className="font-label text-[12px] leading-[16px] tracking-[0.2px] font-medium text-[#3F4947]">
            Beriman · Berakhlak · Berilmu
          </p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className="font-label text-[11px] leading-[16px] text-[#66716E] tabular-nums">
              Versi {APP_VERSION}
            </p>
            <span className="text-[#AAB4B1]" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setShowReleaseNotes(true)}
              className="font-label text-[11px] leading-[16px] font-semibold text-[#00433C] underline underline-offset-2"
            >
              Informasi Pembaruan
            </button>
          </div>
          <AndroidUpdateChecker />
        </footer>
      </main>

      {/* Modal Informasi Pembaruan */}
      {showReleaseNotes && (
        <div className="fixed inset-0 z-50 bg-[#191C1B]/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="release-notes-title">
          <section className="w-full max-w-sm rounded-[14px] border border-[#BEC9C6] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#47766D]">Catatan Rilis</p>
                <h3 id="release-notes-title" className="mt-1 text-lg font-bold text-[#191C1B]">Pembaruan versi {APP_VERSION}</h3>
              </div>
              <button type="button" onClick={() => setShowReleaseNotes(false)} aria-label="Tutup informasi pembaruan" className="rounded-lg px-2 py-1 text-xl text-[#3F4947] hover:bg-[#F2F4F2]">×</button>
            </div>
            <p className="mt-4 text-sm font-semibold text-[#191C1B]">Yang baru pada versi ini:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-5 text-[#3F4947]">
              <li>Menambahkan pemeriksaan pembaruan langsung dari aplikasi Android.</li>
              <li>Menambahkan unduhan APK dan membuka pemasang Android dari aplikasi.</li>
              <li>Meningkatkan kestabilan saat aplikasi dibuka di perangkat Android.</li>
              <li>Mempertahankan koneksi ke database Supabase; data pengajuan tetap tersimpan di server.</li>
            </ul>
            <button type="button" onClick={() => setShowReleaseNotes(false)} className="mt-5 w-full rounded-lg bg-[#00433C] px-4 py-2.5 text-sm font-semibold text-white">Mengerti</button>
          </section>
        </div>
      )}

      {/* Modal Bantuan Lupa Sandi */}
      {(showForgotHelp || recoveryMode) && (
        <div className="fixed inset-0 z-50 bg-[#191C1B]/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-[12px] border border-[#BEC9C6] bg-white p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title text-[16px] font-semibold text-[#191C1B]">
                {recoveryMode ? 'Buat Kata Sandi Baru' : 'Atur Ulang Kata Sandi'}
              </h3>
              {!recoveryMode && (
                <button type="button" onClick={() => { setShowForgotHelp(false); setResetMessage(''); }} aria-label="Tutup" className="w-8 h-8 rounded-[8px]">×</button>
              )}
            </div>
            {recoveryMode ? (
              <>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Kata sandi baru (minimal 8 karakter)" className="w-full rounded-[8px] border border-[#BEC9C6] px-4 py-2.5 text-sm" />
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Ulangi kata sandi baru" className="w-full rounded-[8px] border border-[#BEC9C6] px-4 py-2.5 text-sm" />
                <button type="button" disabled={resetBusy} onClick={saveNewPassword} className="w-full rounded-[8px] bg-[#00433C] text-white px-4 py-2 font-semibold disabled:opacity-50">{resetBusy ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}</button>
              </>
            ) : (
              <>
                <p className="text-sm text-[#3F4947]">Kami akan mengirim tautan pengaturan ulang ke alamat email akun yang Anda masukkan pada formulir login.</p>
                <button type="button" disabled={resetBusy} onClick={sendPasswordReset} className="w-full rounded-[8px] bg-[#00433C] text-white px-4 py-2 font-semibold disabled:opacity-50">{resetBusy ? 'Mengirim...' : 'Kirim Tautan Reset ke Email'}</button>
              </>
            )}
            {resetMessage && <p role="status" className="text-sm text-[#3F4947] break-words">{resetMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
