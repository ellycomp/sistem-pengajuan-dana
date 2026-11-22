import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Download,
  Lock,
  LogOut,
  Pencil,
  PieChart,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import {
  calculateRequestTotal,
  formatRupiah,
  getStatusLabel,
  SCHOOL_UNITS,
} from '../data/seedData';
import {
  AppNavTab,
  BudgetLine,
  FundRequest,
  RoleId,
  UserAccount,
  UserProfile,
} from '../types/kassekolah';
import { SchoolLogo } from './SchoolLogo';

interface BudgetViewProps {
  budgetLines: BudgetLine[];
  requests: FundRequest[];
  currentUser: UserProfile;
  onAddBudgetLine: (payload: Omit<BudgetLine, 'id' | 'usedAmount'>) => { ok: boolean; error?: string };
}

export function BudgetView({ budgetLines, requests, currentUser, onAddBudgetLine }: BudgetViewProps) {
  const canManageBudget = currentUser.role === 'direktur' || currentUser.role === 'bendahara-umum';
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetCode, setNewBudgetCode] = useState('');
  const [newBudgetUnit, setNewBudgetUnit] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [formError, setFormError] = useState('');
  const rows = useMemo(() => {
    return budgetLines.map((line) => {
      const pendingReserved = requests
        .filter(
          (r) => r.budgetCategoryId === line.id && r.status === 'diproses'
        )
        .reduce((sum, r) => sum + calculateRequestTotal(r.items), 0);

      const remaining = Math.max(
        0,
        line.annualLimit - line.usedAmount - pendingReserved
      );
      const usedPct = Math.min(
        100,
        Math.round(((line.usedAmount + pendingReserved) / line.annualLimit) * 100)
      );

      return {
        ...line,
        pendingReserved,
        remaining,
        usedPct,
      };
    });
  }, [budgetLines, requests]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        limit: acc.limit + r.annualLimit,
        used: acc.used + r.usedAmount,
        reserved: acc.reserved + r.pendingReserved,
        remaining: acc.remaining + r.remaining,
      }),
      { limit: 0, used: 0, reserved: 0, remaining: 0 }
    );
  }, [rows]);

  return (
    <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
      <header className="hidden lg:flex bg-[#FFFFFF] border-b border-[#BEC9C6] px-8 py-6 items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-[28px] leading-[34px] tracking-[-0.25px] font-semibold text-[#191C1B]">
            Pos Anggaran Belanja TA 2026
          </h1>
          <p className="font-body text-[14px] leading-[20px] text-[#3F4947] mt-1">
            Pemantauan pagu tahunan, realisasi cair, dan dana dalam proses
            persetujuan
          </p>
        </div>
        {canManageBudget && <button type="button" onClick={() => { setShowAddForm(true); setFormError(''); }} className="inline-flex items-center gap-2 rounded-[8px] bg-[#00433C] text-white px-4 py-2.5 font-label text-[13px] font-semibold hover:bg-[#0F5C53]"><Plus className="w-4 h-4" /> Tambah Pos</button>}
      </header>

      <header className="lg:hidden sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#BEC9C6] px-4 py-3 flex items-center gap-2">
        <SchoolLogo className="w-9 h-11" />
        <div className="min-w-0">
          <p className="font-label text-[12px] font-medium text-[#3F4947]">
            SIT Qudwah Sungai Rengit
          </p>
          <h1 className="font-title text-[16px] font-semibold text-[#191C1B]">
            Pos Anggaran
          </h1>
        </div>
        {canManageBudget && <button type="button" onClick={() => { setShowAddForm(true); setFormError(''); }} aria-label="Tambah Pos Anggaran" className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] bg-[#00433C] text-white px-3 py-2 font-label text-[12px] font-semibold"><Plus className="w-4 h-4" /> Tambah</button>}
      </header>

      <main className="flex-1 px-4 lg:px-8 py-4 lg:py-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
        {showAddForm && canManageBudget && (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!newBudgetName.trim() || !newBudgetCode.trim() || !newBudgetUnit.trim() || !newBudgetLimit.trim()) { setFormError('Semua kolom wajib diisi.'); return; }
            const limit = Number(newBudgetLimit);
            if (!Number.isFinite(limit) || limit <= 0) { setFormError('Pagu tahunan harus berupa angka lebih dari 0.'); return; }
            const result = onAddBudgetLine({ name: newBudgetName.trim(), code: newBudgetCode.trim().toUpperCase(), unit: newBudgetUnit.trim(), annualLimit: limit });
            if (!result.ok) { setFormError(result.error || 'Gagal menambahkan pos anggaran.'); return; }
            setNewBudgetName(''); setNewBudgetCode(''); setNewBudgetUnit(''); setNewBudgetLimit(''); setFormError(''); setShowAddForm(false);
          }} className="rounded-[12px]] border border-[#BEC9C6] bg-white p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between"><h2 className="font-title text-[16px] font-semibold">Tambah Pos Anggaran Baru</h2><button type="button" onClick={() => setShowAddForm(false)} aria-label="Tutup form"><X className="w-4 h-4" /></button></div>
            {formError && <p role="alert" className="rounded-[8px] bg-[#FFDAD6] text-[#410002] px-3 py-2 text-[13px]">{formError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1 text-[13px] font-semibold">Kode Pos<input value={newBudgetCode} onChange={e => setNewBudgetCode(e.target.value)} placeholder="POS-5501" className="rounded-[8px] border border-[#BEC9C6] px-3 py-2 font-normal" /></label>
              <label className="flex flex-col gap-1 text-[13px] font-semibold">Nama Pos Anggaran<input value={newBudgetName} onChange={e => setNewBudgetName(e.target.value)} placeholder="Contoh: Kegiatan Tahfiz" className="rounded-[8px] border border-[#BEC9C6] px-3 py-2 font-normal" /></label>
              <label className="flex flex-col gap-1 text-[13px] font-semibold">Unit<input value={newBudgetUnit} onChange={e => setNewBudgetUnit(e.target.value)} placeholder="Contoh: Kesiswaan" className="rounded-[8px] border border-[#BEC9C6] px-3 py-2 font-normal" /></label>
              <label className="flex flex-col gap-1 text-[13px] font-semibold">Pagu Tahunan (Rp)<input type="number" min="1" step="1" value={newBudgetLimit} onChange={e => setNewBudgetLimit(e.target.value)} placeholder="10000000" className="rounded-[8px] border border-[#BEC9C6] px-3 py-2 font-normal" /></label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddForm(false)} className="rounded-[8px] border border-[#BEC9C6] px-4 py-2 text-[13px] font-semibold">Batal</button><button type="submit" className="rounded-[8px] bg-[#00433C] text-white px-4 py-2 text-[13px] font-semibold">Simpan Pos Anggaran</button></div>
          </form>
        )}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1">
            <span className="font-label text-[12px] font-medium text-[#3F4947]">
              Total Pagu Tahunan
            </span>
            <span className="font-headline text-[22px] font-semibold text-[#191C1B] tabular-nums">
              {formatRupiah(totals.limit)}
            </span>
          </div>
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1">
            <span className="font-label text-[12px] font-medium text-[#3F4947]">
              Terpakai &amp; Dalam Proses
            </span>
            <span className="font-headline text-[22px] font-semibold text-[#92400E] tabular-nums">
              {formatRupiah(totals.used + totals.reserved)}
            </span>
          </div>
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1">
            <span className="font-label text-[12px] font-medium text-[#3F4947]">
              Sisa Pagu Tersedia
            </span>
            <span className="font-headline text-[22px] font-semibold text-[#00433C] tabular-nums">
              {formatRupiah(totals.remaining)}
            </span>
          </div>
        </section>

        <section className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#F2F4F2] border-b border-[#BEC9C6]">
                <tr>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947]">
                    Kode / Pos Anggaran
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947]">
                    Unit
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947] text-right">
                    Pagu Tahunan
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947] text-right">
                    Terpakai
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947] text-right">
                    Dalam Proses
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947] text-right">
                    Sisa Pagu
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947] w-36">
                    Serapan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C6]">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-[12px] text-[#3F4947]">
                        {row.code}
                      </p>
                      <p className="font-title text-[14px] font-semibold text-[#191C1B]">
                        {row.name}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 font-body text-[14px] text-[#3F4947]">
                      {row.unit}
                    </td>
                    <td className="px-4 py-3.5 font-body text-[14px] text-[#191C1B] text-right tabular-nums whitespace-nowrap">
                      {formatRupiah(row.annualLimit)}
                    </td>
                    <td className="px-4 py-3.5 font-body text-[14px] text-[#3F4947] text-right tabular-nums whitespace-nowrap">
                      {formatRupiah(row.usedAmount)}
                    </td>
                    <td className="px-4 py-3.5 font-body text-[14px] text-[#92400E] text-right tabular-nums whitespace-nowrap">
                      {formatRupiah(row.pendingReserved)}
                    </td>
                    <td className="px-4 py-3.5 font-label text-[14px] font-semibold text-[#00433C] text-right tabular-nums whitespace-nowrap">
                      {formatRupiah(row.remaining)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[#ECEEEC] overflow-hidden">
                          <div
                            className="h-full bg-[#00433C] rounded-full"
                            style={{ width: `${row.usedPct}%` }}
                          />
                        </div>
                        <span className="font-label text-[12px] text-[#3F4947] tabular-nums w-9 text-right">
                          {row.usedPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

interface HistoryViewProps {
  requests: FundRequest[];
  onOpenDetail: (requestId: string) => void;
}

export function HistoryView({ requests, onOpenDetail }: HistoryViewProps) {
  const [query, setQuery] = useState<string>('');

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q)
      );
    });
  }, [requests, query]);

  return (
    <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
      <header className="hidden lg:flex bg-[#FFFFFF] border-b border-[#BEC9C6] px-8 py-6 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-[28px] leading-[34px] tracking-[-0.25px] font-semibold text-[#191C1B]">
            Riwayat &amp; Jejak Audit Persetujuan
          </h1>
          <p className="font-body text-[14px] leading-[20px] text-[#3F4947] mt-1">
            Catatan seluruh transaksi pengajuan dana dan keputusan tiap jenjang
            SIT Qudwah
          </p>
        </div>

        <div className="relative w-72">
          <Search
            className="w-4 h-4 text-[#3F4947] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor atau judul pengajuan..."
            aria-label="Cari riwayat"
            className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] pl-9 pr-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
          />
        </div>
      </header>

      <header className="lg:hidden sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#BEC9C6] px-4 py-3 flex items-center gap-2">
        <SchoolLogo className="w-9 h-11" />
        <div className="min-w-0">
          <p className="font-label text-[12px] font-medium text-[#3F4947]">
            SIT Qudwah Sungai Rengit
          </p>
          <h1 className="font-title text-[16px] font-semibold text-[#191C1B]">
            Riwayat Persetujuan
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 lg:px-8 py-4 lg:py-6 max-w-7xl w-full mx-auto flex flex-col gap-4">
        <div className="lg:hidden relative">
          <Search
            className="w-4 h-4 text-[#3F4947] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor atau judul..."
            aria-label="Cari riwayat mobile"
            className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] pl-9 pr-3 py-2 text-[14px]"
          />
        </div>

        <div className="flex flex-col gap-3">
          {sorted.length === 0 ? (
            <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-8 text-center flex flex-col items-center gap-2">
              <p className="font-title text-[16px] font-semibold text-[#191C1B]">
                {requests.length === 0
                  ? 'Belum ada riwayat pengajuan dana'
                  : 'Tidak ada riwayat yang cocok'}
              </p>
              <p className="font-body text-[14px] text-[#3F4947]">
                {requests.length === 0
                  ? 'Riwayat dan jejak audit persetujuan akan tampil di sini setelah ada pengajuan yang dibuat.'
                  : 'Coba ubah kata kunci pencarian kode atau judul.'}
              </p>
            </div>
          ) : (
            sorted.map((req) => {
              const total = calculateRequestTotal(req.items);
              const lastDone = [...req.stages]
                .reverse()
                .find((s) => s.state === 'done' || s.state === 'revisi');

            return (
              <button
                key={req.id}
                type="button"
                onClick={() => onOpenDetail(req.id)}
                className="w-full text-left rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F2F4F2] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-medium text-[#3F4947]">
                      {req.code}
                    </span>
                    <span className="text-[#3F4947]">·</span>
                    <span className="font-label text-[12px] font-medium text-[#191C1B]">
                      {req.schoolUnit}
                    </span>
                    <span className="text-[#3F4947]">·</span>
                    <span className="font-label text-[12px] text-[#3F4947]">
                      {req.budgetCategoryName}
                    </span>
                  </div>
                  <p className="font-title text-[16px] font-semibold text-[#191C1B] mt-0.5">
                    {req.title}
                  </p>
                  <p className="font-body text-[13px] text-[#3F4947] mt-0.5">
                    Terakhir: {lastDone?.personName || req.requesterName} (
                    {lastDone?.timestamp || req.submittedDate})
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-label text-[15px] font-semibold text-[#191C1B] tabular-nums">
                      {formatRupiah(total)}
                    </p>
                    <p
                      className={`font-label text-[12px] font-medium ${
                        req.status === 'disetujui'
                          ? 'text-[#14532D]'
                          : req.status === 'revisi'
                          ? 'text-[#BA1A1A]'
                          : 'text-[#92400E]'
                      }`}
                    >
                      {getStatusLabel(req)}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-5 h-5 text-[#3F4947]"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })
          )}
        </div>
      </main>
    </div>
  );
}

interface ProfileViewProps {
  currentUser: UserProfile;
  accounts: UserAccount[];
  onAddAccount: (payload: {
    name: string;
    role: RoleId;
    title: string;
    unit: string;
    email: string;
    password: string;
  }) => { ok: boolean; error?: string };
  onUpdateAccount: (
    accountId: string,
    payload: {
      name: string;
      role: RoleId;
      title: string;
      unit: string;
      email: string;
      password: string;
    }
  ) => { ok: boolean; error?: string };
  onDeleteAccount: (accountId: string) => void;
  onSelectTab: (tab: AppNavTab) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<{ ok: boolean; error?: string }>;
  onResetData: () => void;
  onLogout: () => void;
}

const ROLE_DEFAULT_TITLES: Record<RoleId, string> = {
  guru: 'Guru / Staf Pengaju',
  sarana: 'Kepala Seksi Sarana',
  'bendahara-sekolah': 'Bendahara Sekolah',
  'bendahara-umum': 'Bendahara Umum',
  direktur: 'Direktur SIT Qudwah Sungai Rengit',
};

export function ProfileView({
  currentUser,
  accounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSelectTab,
  onExportBackup,
  onImportBackup,
  onResetData,
  onLogout,
}: ProfileViewProps) {
  const isDirector = currentUser.role === 'direktur';
  const [backupError, setBackupError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<RoleId>('guru');
  const [newTitle, setNewTitle] = useState<string>(ROLE_DEFAULT_TITLES.guru);
  const [newUnit, setNewUnit] = useState<string>(SCHOOL_UNITS[0]);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Edit account modal state
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(
    null
  );
  const [editName, setEditName] = useState<string>('');
  const [editRole, setEditRole] = useState<RoleId>('guru');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>(SCHOOL_UNITS[0]);
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [editError, setEditError] = useState<string>('');

  const handleRoleChange = (role: RoleId) => {
    setNewRole(role);
    setNewTitle(ROLE_DEFAULT_TITLES[role]);
  };

  const handleOpenEdit = (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditRole(acc.role);
    setEditTitle(acc.title);
    setEditUnit(acc.unit);
    setEditEmail(acc.email);
    setEditPassword(acc.password);
    setEditError('');
  };

  const handleEditRoleChange = (role: RoleId) => {
    setEditRole(role);
    setEditTitle(ROLE_DEFAULT_TITLES[role]);
  };

  const handleSubmitEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector || !editingAccount) return;

    if (!editName.trim() || !editEmail.trim() || !editPassword.trim()) {
      setEditError('Nama lengkap, email, dan kata sandi wajib diisi.');
      return;
    }
    if (editPassword.trim().length < 6) {
      setEditError('Kata sandi minimal 6 karakter.');
      return;
    }

    const result = onUpdateAccount(editingAccount.id, {
      name: editName.trim(),
      role: editRole,
      title: editTitle.trim() || ROLE_DEFAULT_TITLES[editRole],
      unit: editUnit.trim() || 'SIT Qudwah',
      email: editEmail.trim(),
      password: editPassword.trim(),
    });

    if (!result.ok) {
      setEditError(result.error || 'Gagal memperbarui akun.');
      return;
    }

    setEditingAccount(null);
    setEditError('');
  };

  const handleSubmitNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) return;

    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Nama lengkap, email, dan kata sandi wajib diisi.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setFormError('Kata sandi minimal 6 karakter.');
      return;
    }

    const result = onAddAccount({
      name: newName.trim(),
      role: newRole,
      title: newTitle.trim() || ROLE_DEFAULT_TITLES[newRole],
      unit: newUnit.trim() || 'SIT Qudwah',
      email: newEmail.trim(),
      password: newPassword.trim(),
    });

    if (!result.ok) {
      setFormError(result.error || 'Gagal menambahkan akun.');
      return;
    }

    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setFormError('');
    setShowAddForm(false);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
      <header className="hidden lg:flex bg-[#FFFFFF] border-b border-[#BEC9C6] px-8 py-6 items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-[28px] leading-[34px] font-semibold text-[#191C1B]">
            {isDirector ? 'Profil & Manajemen Akun' : 'Profil Akun Pengguna'}
          </h1>
          <p className="font-body text-[14px] text-[#3F4947] mt-1">
            {isDirector
              ? 'Kelola akses pengguna portal KasSekolah SIT Qudwah Sungai Rengit'
              : 'Informasi akun aktif Anda pada portal SIT Qudwah Sungai Rengit'}
          </p>
        </div>
      </header>

      <header className="lg:hidden sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#BEC9C6] px-4 py-3 flex items-center gap-2">
        <SchoolLogo className="w-9 h-11" />
        <div className="min-w-0">
          <p className="font-label text-[12px] font-medium text-[#3F4947]">
            SIT Qudwah Sungai Rengit
          </p>
          <h1 className="font-title text-[16px] font-semibold text-[#191C1B]">
            {isDirector ? 'Kelola Akun' : 'Profil Saya'}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 lg:px-8 py-4 lg:py-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
        {/* Active Account Card */}
        <section className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#CDE8E2] text-[#1D3531] flex items-center justify-center font-title text-[16px] font-semibold">
              {currentUser.avatar}
            </div>
            <div>
              <h2 className="font-title text-[18px] font-semibold text-[#191C1B]">
                {currentUser.name}
              </h2>
              <p className="font-body text-[14px] text-[#3F4947]">
                {currentUser.title} · {currentUser.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2 font-label text-[14px] font-semibold text-[#191C1B] hover:bg-[#FFDAD6] hover:text-[#410002]"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Keluar ke Halaman Login</span>
          </button>
        </section>

        {/* Local Backup & Restore (Gratis / Penyimpanan Perangkat) */}
        <section className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-title text-[16px] font-semibold text-[#191C1B]">
                Cadangan &amp; Pemulihan Data Lokal
              </h2>
              <p className="font-body text-[13px] text-[#3F4947] mt-0.5">
                Simpan atau pindahkan data pengajuan, pos anggaran, dan akun ke
                berkas JSON langsung dari perangkat tanpa layanan berbayar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-3.5 py-2 font-label text-[13px] font-semibold hover:bg-[#0F5C53]"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Unduh Cadangan (.json)</span>
              </button>
              <label className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3.5 py-2 font-label text-[13px] font-semibold text-[#191C1B] hover:bg-[#F2F4F2] cursor-pointer">
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Pulihkan dari File</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setBackupError('');
                    const res = await onImportBackup(file);
                    if (!res.ok) {
                      setBackupError(res.error || 'Gagal memulihkan cadangan.');
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          {backupError && (
            <div
              role="alert"
              className="rounded-[8px] bg-[#FFDAD6] text-[#410002] px-3 py-2 text-[13px] font-medium"
            >
              {backupError}
            </div>
          )}
        </section>

        {/* Mobile Quick Link to Pos Anggaran */}
        <button
          type="button"
          onClick={() => onSelectTab('anggaran')}
          className="lg:hidden w-full rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <PieChart className="w-5 h-5 text-[#00433C]" aria-hidden="true" />
            <div className="text-left">
              <p className="font-title text-[15px] font-semibold text-[#191C1B]">
                Lihat Pos Anggaran Sekolah
              </p>
              <p className="font-body text-[12px] text-[#3F4947]">
                Pagu &amp; sisa anggaran TA 2026
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#3F4947]" aria-hidden="true" />
        </button>

        {/* Account Management Section — Strictly restricted to Direktur */}
        {isDirector ? (
          <section className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#00433C]" aria-hidden="true" />
                <div>
                  <h2 className="font-title text-[16px] font-semibold text-[#191C1B]">
                    Daftar &amp; Penambahan Akun Pengguna
                  </h2>
                  <p className="font-body text-[13px] text-[#3F4947]">
                    Khusus Direktur: tambahkan akun Guru/Staf atau pemeriksa baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setShowAddForm((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold hover:bg-[#0F5C53] whitespace-nowrap"
              >
                {showAddForm ? (
                  <>
                    <X className="w-4 h-4" aria-hidden="true" />
                    <span>Tutup Form</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Tambah Akun Baru</span>
                  </>
                )}
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleSubmitNewAccount}
                className="rounded-[10px] border border-[#BEC9C6] bg-[#F8FAF8] p-4 flex flex-col gap-3"
              >
                <h3 className="font-title text-[15px] font-semibold text-[#191C1B]">
                  Form Akun Pengguna Baru
                </h3>

                {formError && (
                  <div
                    role="alert"
                    className="rounded-[8px] bg-[#FFDAD6] text-[#410002] px-3 py-2 text-[13px] font-medium"
                  >
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="acc-name"
                      className="font-label text-[13px] font-semibold text-[#191C1B]"
                    >
                      Nama Lengkap
                    </label>
                    <input
                      id="acc-name"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Contoh: Ust. Muhammad Fajar"
                      className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="acc-role"
                      className="font-label text-[13px] font-semibold text-[#191C1B]"
                    >
                      Peran Akses
                    </label>
                    <select
                      id="acc-role"
                      value={newRole}
                      onChange={(e) => handleRoleChange(e.target.value as RoleId)}
                      className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                    >
                      <option value="guru">Guru / Staf Pengaju</option>
                      <option value="sarana">Kepala Seksi Sarana</option>
                      <option value="bendahara-sekolah">
                        Bendahara Sekolah
                      </option>
                      <option value="bendahara-umum">Bendahara Umum</option>
                      <option value="direktur">
                        Direktur SIT Qudwah Sungai Rengit
                      </option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="acc-title"
                      className="font-label text-[13px] font-semibold text-[#191C1B]"
                    >
                      Jabatan
                    </label>
                    <input
                      id="acc-title"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="acc-unit"
                      className="font-label text-[13px] font-semibold text-[#191C1B]"
                    >
                      Unit Sekolah / Kerja
                    </label>
                    <select
                      id="acc-unit"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                    >
                      {SCHOOL_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="Yayasan SIT Qudwah">
                        Yayasan SIT Qudwah
                      </option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="acc-email"
                      className="font-label text-[13px] font-semibold text-[#191C1B]"
                    >
                      Email Masuk
                    </label>
                    <input
                      id="acc-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="nama@sitqudwah.sch.id"
                      className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="acc-password"
                      className="font-label text-[13px] font-semibold text-[#191C1B]"
                    >
                      Kata Sandi
                    </label>
                    <input
                      id="acc-password"
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold text-[#191C1B] hover:bg-[#F2F4F2]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold hover:bg-[#0F5C53]"
                  >
                    Simpan Akun Baru
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-[#BEC9C6] border border-[#BEC9C6] rounded-[10px] overflow-hidden">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#ECEEEC] text-[#191C1B] flex items-center justify-center font-label text-[13px] font-semibold shrink-0">
                      {acc.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="font-title text-[14px] font-semibold text-[#191C1B] truncate">
                        {acc.name}
                      </p>
                      <p className="font-body text-[12px] text-[#3F4947] truncate">
                        {acc.title} · {acc.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-label text-[12px] font-medium text-[#3F4947]">
                      {acc.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(acc)}
                      aria-label={`Edit akun ${acc.name}`}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-[#BEC9C6] bg-[#FFFFFF] px-2.5 py-1.5 font-label text-[12px] font-semibold text-[#191C1B] hover:bg-[#CDE8E2] hover:border-[#00433C]"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    {!acc.isDefault && (
                      <button
                        type="button"
                        onClick={() => onDeleteAccount(acc.id)}
                        aria-label={`Hapus akun ${acc.name}`}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] text-[#3F4947] hover:bg-[#FFDAD6] hover:text-[#410002]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ECEEEC] text-[#3F4947] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-title text-[16px] font-semibold text-[#191C1B]">
                Penambahan Akun Khusus Direktur
              </h2>
              <p className="font-body text-[14px] text-[#3F4947] mt-0.5">
                Hanya Direktur SIT Qudwah Sungai Rengit yang berwenang
                menambahkan atau mengelola akun pengguna lain. Jika membutuhkan
                akun baru, silakan hubungi Direktur.
              </p>
            </div>
          </section>
        )}

        {/* Reset Data Pengajuan */}
        <section className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-title text-[15px] font-semibold text-[#191C1B]">
              Kosongkan Data Pengajuan
            </h3>
            <p className="font-body text-[13px] text-[#3F4947]">
              Hapus seluruh daftar pengajuan dan kembalikan pagu terpakai ke
              kondisi kosong.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetData}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold text-[#191C1B] hover:bg-[#F2F4F2]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset Data</span>
          </button>
        </section>
      </main>

      {/* Modal Edit Akun Pengguna (Khusus Direktur) */}
      {isDirector && editingAccount && (
        <div
          className="fixed inset-0 z-50 bg-[#191C1B]/45 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-account-title"
        >
          <form
            onSubmit={handleSubmitEditAccount}
            className="w-full max-w-xl rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-6 flex flex-col gap-4 my-auto"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#BEC9C6] pb-3">
              <div>
                <h2
                  id="edit-account-title"
                  className="font-headline text-[20px] font-semibold text-[#191C1B]"
                >
                  Edit Akun Pengguna
                </h2>
                <p className="font-body text-[13px] text-[#3F4947]">
                  Perbarui data profil, peran akses, email, atau kata sandi akun
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                aria-label="Tutup dialog edit akun"
                className="w-8 h-8 inline-flex items-center justify-center rounded-[8px] text-[#3F4947] hover:bg-[#F2F4F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div
                role="alert"
                className="rounded-[8px] bg-[#FFDAD6] text-[#410002] px-3 py-2 text-[13px] font-medium"
              >
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-acc-name"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Nama Lengkap
                </label>
                <input
                  id="edit-acc-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-acc-role"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Peran Akses
                </label>
                <select
                  id="edit-acc-role"
                  value={editRole}
                  disabled={editingAccount.email.toLowerCase() === currentUser.email.toLowerCase()}
                  onChange={(e) =>
                    handleEditRoleChange(e.target.value as RoleId)
                  }
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C] disabled:bg-[#F2F4F2] disabled:text-[#3F4947]"
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
                  htmlFor="edit-acc-title"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Jabatan
                </label>
                <input
                  id="edit-acc-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-acc-unit"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Unit Sekolah / Kerja
                </label>
                <select
                  id="edit-acc-unit"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                >
                  {SCHOOL_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="Yayasan SIT Qudwah">Yayasan SIT Qudwah</option>
                  <option value="Tata Usaha">Tata Usaha</option>
                  <option value="Sarana & Prasarana">Sarana &amp; Prasarana</option>
                  <option value="Keuangan Unit">Keuangan Unit</option>
                  <option value="Keuangan Yayasan">Keuangan Yayasan</option>
                  <option value="Pimpinan Yayasan">Pimpinan Yayasan</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-acc-email"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Email Masuk
                </label>
                <input
                  id="edit-acc-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-acc-password"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Kata Sandi
                </label>
                <input
                  id="edit-acc-password"
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#BEC9C6] pt-3">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold text-[#191C1B] hover:bg-[#F2F4F2]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold hover:bg-[#0F5C53]"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
