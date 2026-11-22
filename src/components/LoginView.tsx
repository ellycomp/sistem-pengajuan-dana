import React, { useState } from 'react';
import { Eye, EyeOff, Info, X } from 'lucide-react';
import { RoleId, UserAccount } from '../types/kassekolah';
import { SchoolLogo } from './SchoolLogo';

interface LoginViewProps {
  accounts: UserAccount[];
  onLogin: (account: UserAccount, remember: boolean) => void;
}

export function LoginView({ accounts, onLogin }: LoginViewProps) {
  const defaultGuru =
    accounts.find((a) => a.role === 'guru') || accounts[0];

  const [selectedRole, setSelectedRole] = useState<RoleId>('guru');
  const [email, setEmail] = useState<string>(defaultGuru?.email || '');
  const [password, setPassword] = useState<string>('qudwah2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showForgotHelp, setShowForgotHelp] = useState<boolean>(false);

  const handleRoleChange = (role: RoleId) => {
    setSelectedRole(role);
    const matchingAccount = accounts.find((a) => a.role === role);
    setEmail(matchingAccount?.email || '');
    // Clear password when switching to Direktur so credentials are entered explicitly
    setPassword(role === 'direktur' ? '' : 'qudwah2026');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Silakan masukkan email sekolah atau NIP pegawai.');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan kata sandi Anda.');
      return;
    }

    const matchedByEmail = accounts.find(
      (acc) => acc.email.toLowerCase() === trimmedEmail
    );

    if (!matchedByEmail || matchedByEmail.password !== password) {
      setErrorMsg('Email atau kata sandi tidak sesuai. Silakan periksa kembali.');
      return;
    }

    if (matchedByEmail.role !== selectedRole) {
      setErrorMsg(
        `Email ini terdaftar sebagai ${matchedByEmail.title}. Silakan pilih peran akses yang sesuai.`
      );
      return;
    }

    setErrorMsg('');
    onLogin(matchedByEmail, rememberMe);
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
                  Email atau NIP
                </label>
                <input
                  id="web-email"
                  type="text"
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2.5 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00433C] mt-1"
              >
                <span>Masuk ke Portal</span>
              </button>
            </form>
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
                Email atau NIP
              </label>
              <input
                id="mob-email"
                type="text"
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
              className="w-full inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2.5 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00433C] mt-1"
            >
              <span>Masuk ke Aplikasi</span>
            </button>
          </form>
        </section>

        <footer className="text-center pb-2">
          <p className="font-label text-[12px] leading-[16px] tracking-[0.2px] font-medium text-[#3F4947]">
            Beriman · Berakhlak · Berilmu
          </p>
        </footer>
      </main>

      {/* Modal Bantuan Lupa Sandi */}
      {showForgotHelp && (
        <div
          className="fixed inset-0 z-50 bg-[#191C1B]/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-pw-title"
        >
          <div className="w-full max-w-sm rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-[#00433C]">
                <Info className="w-5 h-5 shrink-0" aria-hidden="true" />
                <h3
                  id="forgot-pw-title"
                  className="font-title text-[16px] font-semibold text-[#191C1B]"
                >
                  Bantuan Akses Akun
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotHelp(false)}
                aria-label="Tutup bantuan"
                className="w-8 h-8 inline-flex items-center justify-center rounded-[8px] text-[#3F4947] hover:bg-[#F2F4F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-body text-[14px] leading-[20px] text-[#3F4947]">
              Pembuatan akun dan pengaturan ulang kata sandi portal SIT Qudwah
              Sungai Rengit dikelola langsung oleh Direktur SIT Qudwah. Silakan
              hubungi Direktur untuk mendapatkan akses akun baru.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotHelp(false)}
              className="w-full rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] font-semibold hover:bg-[#0F5C53]"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
