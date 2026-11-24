import {
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  User,
} from 'lucide-react';
import { AppNavTab, UserProfile } from '../types/kassekolah';
import { SchoolLogo } from './SchoolLogo';

interface SidebarProps {
  activeTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  pendingApprovalCount: number;
  currentUser: UserProfile;
  onLogout: () => void;
}

export function DesktopSidebar({
  activeTab,
  onSelectTab,
  pendingApprovalCount,
  currentUser,
  onLogout,
}: SidebarProps) {
  const isPersetujuanActive =
    activeTab === 'persetujuan' || activeTab === 'detail';

  const navBtnClass = (active: boolean) =>
    active
      ? 'flex items-center justify-between gap-2 rounded-[8px] px-4 py-2.5 bg-[#CDE8E2] text-[#1D3531] font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 whitespace-nowrap'
      : 'flex items-center justify-between gap-2 rounded-[8px] px-4 py-2.5 text-[#3F4947] hover:bg-[#F2F4F2] hover:text-[#191C1B] font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 whitespace-nowrap';

  return (
    <aside className="no-print hidden lg:flex w-64 shrink-0 min-h-screen bg-[#FFFFFF] border-r border-[#BEC9C6] flex-col justify-between p-6 sticky top-0 h-screen">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-2.5">
          <SchoolLogo className="w-10 h-12" />
          <div className="min-w-0">
            <p className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B] truncate">
              Sistem Pengajuan Dana
            </p>
            <p className="font-label text-[12px] leading-[16px] tracking-[0.2px] font-medium text-[#3F4947] truncate">
              SIT Qudwah Sungai Rengit
            </p>
          </div>
        </div>

        <nav aria-label="Navigasi Utama" className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSelectTab('pengajuan')}
            className={navBtnClass(activeTab === 'pengajuan')}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Pengajuan Dana</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('persetujuan')}
            className={navBtnClass(isPersetujuanActive)}
          >
            <span className="flex items-center gap-2.5">
              <ClipboardCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Persetujuan</span>
            </span>
            <span
              role="status"
              className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[#00433C] text-[#FFFFFF] font-label text-[12px] leading-[16px] font-medium tabular-nums"
            >
              {pendingApprovalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('riwayat')}
            className={navBtnClass(activeTab === 'riwayat')}
          >
            <span className="flex items-center gap-2.5">
              <ReceiptText className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Riwayat</span>
            </span>
          </button>
        </nav>
      </div>

      <div className="border-t border-[#BEC9C6] pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#E6E9E7] text-[#191C1B] flex items-center justify-center shrink-0 font-label text-[14px] font-semibold">
            {currentUser.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B] truncate">
              {currentUser.name}
            </p>
            <p className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947] truncate">
              {currentUser.title}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectTab('profil')}
            className="inline-flex items-center justify-center gap-1 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] px-2.5 py-1.5 font-label text-[12px] font-semibold hover:bg-[#F2F4F2] whitespace-nowrap"
          >
            <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {currentUser.role === 'direktur' ? 'Kelola Akun' : 'Akun Saya'}
            </span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-1 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#3F4947] px-2.5 py-1.5 font-label text-[12px] font-semibold hover:bg-[#FFDAD6] hover:text-[#410002] hover:border-[#BA1A1A]/30 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

interface MobileBottomNavProps {
  activeTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
}: MobileBottomNavProps) {
  const itemClass = (active: boolean) =>
    active
      ? 'flex flex-col items-center justify-center gap-1 text-[#00433C] py-1 min-h-[44px]'
      : 'flex flex-col items-center justify-center gap-1 text-[#3F4947] hover:text-[#191C1B] py-1 min-h-[44px]';

  return (
    <nav
      aria-label="Navigasi Bawah"
      className="no-print lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-[#FFFFFF] border-t border-[#BEC9C6] px-2 py-1.5 grid grid-cols-4 gap-1"
    >
      <button
        type="button"
        onClick={() => onSelectTab('pengajuan')}
        className={itemClass(activeTab === 'pengajuan')}
      >
        <Home className="w-5 h-5" aria-hidden="true" />
        <span className="font-label text-[12px] leading-[16px] font-medium">
          Beranda
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('persetujuan')}
        className={itemClass(activeTab === 'persetujuan')}
      >
        <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
        <span className="font-label text-[12px] leading-[16px] font-medium">
          Review
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('riwayat')}
        className={itemClass(activeTab === 'riwayat')}
      >
        <ReceiptText className="w-5 h-5" aria-hidden="true" />
        <span className="font-label text-[12px] leading-[16px] font-medium">
          Riwayat
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('profil')}
        className={itemClass(activeTab === 'profil' || activeTab === 'anggaran')}
      >
        <User className="w-5 h-5" aria-hidden="true" />
        <span className="font-label text-[12px] leading-[16px] font-medium">
          Profil
        </span>
      </button>
    </nav>
  );
}
