import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import {
  BudgetView,
  HistoryView,
  ProfileView,
} from './components/BudgetAndHistoryViews';
import { DashboardRequestsView } from './components/DashboardRequestsView';
import { LoginView } from './components/LoginView';
import { RequestDetailView } from './components/RequestDetailView';
import { DesktopSidebar, MobileBottomNav } from './components/Sidebar';
import { TierReviewView } from './components/TierReviewView';
import {
  calculateRequestTotal,
  formatCurrentTimestamp,
  generateRequestCode,
  INITIAL_ACCOUNTS,
  INITIAL_BUDGET_LINES,
  INITIAL_REQUESTS,
  ROLE_USERS,
  TIER_CONFIGS,
} from './data/seedData';
import {
  AppNavTab,
  BudgetLine,
  FundRequest,
  LineItem,
  LocalBackupSnapshot,
  RoleId,
  SchoolUnit,
  TierKey,
  UserAccount,
} from './types/kassekolah';

const STORAGE_KEY = 'kassekolah_sit_qudwah_state_v3';

interface PersistedState {
  isLoggedIn: boolean;
  currentAccountId: string;
  accounts: UserAccount[];
  requests: FundRequest[];
  budgetLines: BudgetLine[];
}

function makeAvatarInitials(name: string): string {
  const cleaned = name
    .replace(/^(Ust\.|Bu|Pak|H\.|Hj\.)\s+/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (
        Array.isArray(parsed.requests) &&
        Array.isArray(parsed.budgetLines) &&
        Array.isArray(parsed.accounts) &&
        parsed.accounts.length > 0 &&
        parsed.currentAccountId
      ) {
        const migratedAccounts = [...parsed.accounts];
        INITIAL_ACCOUNTS.forEach((seedAccount) => {
          const existingIndex = migratedAccounts.findIndex((account) => account.id === seedAccount.id);
          if (existingIndex === -1) {
            migratedAccounts.push(seedAccount);
          } else if (['acc-sarana', 'acc-bendahara-sekolah'].includes(seedAccount.id)) {
            migratedAccounts[existingIndex] = {
              ...migratedAccounts[existingIndex],
              ...seedAccount,
              password: migratedAccounts[existingIndex].password,
            };
          }
        });
        return {
          isLoggedIn: Boolean(parsed.isLoggedIn),
          currentAccountId: parsed.currentAccountId,
          accounts: migratedAccounts,
          requests: parsed.requests.map((r) => ({
            ...r,
            schoolUnit: r.schoolUnit || 'SD IT Qudwah Sungai Rengit',
          })),
          budgetLines: parsed.budgetLines,
        };
      }
    }
  } catch {
    // Fallback to seed data
  }
  return {
    isLoggedIn: false,
    currentAccountId: INITIAL_ACCOUNTS[0].id,
    accounts: INITIAL_ACCOUNTS,
    requests: INITIAL_REQUESTS,
    budgetLines: INITIAL_BUDGET_LINES,
  };
}

export default function App() {
  const [initial] = useState<PersistedState>(() => loadInitialState());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(initial.isLoggedIn);
  const [accounts, setAccounts] = useState<UserAccount[]>(initial.accounts);
  const [currentAccountId, setCurrentAccountId] = useState<string>(
    initial.currentAccountId
  );
  const [requests, setRequests] = useState<FundRequest[]>(initial.requests);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>(
    initial.budgetLines
  );

  const currentAccount =
    accounts.find((a) => a.id === currentAccountId) || accounts[0];
  const currentRole = currentAccount.role;

  const [activeTab, setActiveTab] = useState<AppNavTab>(() =>
    currentRole === 'guru'
      ? initial.requests.length > 0
        ? 'detail'
        : 'pengajuan'
      : 'persetujuan'
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    initial.requests[0]?.id || ''
  );
  const [selectedTier, setSelectedTier] = useState<TierKey>(() =>
    currentRole === 'guru' ? 'sarana' : currentRole
  );
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isLoggedIn,
          currentAccountId,
          accounts,
          requests,
          budgetLines,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [isLoggedIn, currentAccountId, accounts, requests, budgetLines]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const currentUser = currentAccount || ROLE_USERS.guru;
  const pendingApprovalCount = requests.filter(
    (r) => r.status === 'diproses'
  ).length;

  const handleLogin = (account: UserAccount) => {
    setCurrentAccountId(account.id);
    setIsLoggedIn(true);
    if (account.role !== 'guru' && account.role !== 'direktur') {
      setSelectedTier(account.role);
    }
    // Semua petugas dapat mengajukan dari kapasitas jabatan masing-masing.
    // Menu Persetujuan tetap tersedia untuk menjalankan tugas pemeriksaan.
    setActiveTab('pengajuan');
    setToastMessage(`Selamat datang, ${account.name}.`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToastMessage('');
  };

  const handleAddAccount = (payload: {
    name: string;
    role: RoleId;
    title: string;
    unit: string;
    email: string;
    password: string;
  }): { ok: boolean; error?: string } => {
    if (currentUser.role !== 'direktur') {
      return {
        ok: false,
        error: 'Hanya Direktur SIT Qudwah yang berwenang menambahkan akun baru.',
      };
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const exists = accounts.some(
      (acc) => acc.email.toLowerCase() === normalizedEmail
    );
    if (exists) {
      return {
        ok: false,
        error: 'Email tersebut sudah terdaftar pada akun lain.',
      };
    }

    const newAccount: UserAccount = {
      id: `acc-${Date.now()}`,
      name: payload.name,
      role: payload.role,
      title: payload.title,
      unit: payload.unit,
      email: payload.email.trim(),
      password: payload.password,
      avatar: makeAvatarInitials(payload.name),
      isDefault: false,
    };

    setAccounts((prev) => [...prev, newAccount]);
    setToastMessage(
      `Akun baru untuk ${newAccount.name} (${newAccount.email}) berhasil ditambahkan.`
    );
    return { ok: true };
  };

  const handleUpdateAccount = (
    accountId: string,
    payload: {
      name: string;
      role: RoleId;
      title: string;
      unit: string;
      email: string;
      password: string;
    }
  ): { ok: boolean; error?: string } => {
    if (currentUser.role !== 'direktur') {
      return {
        ok: false,
        error: 'Hanya Direktur SIT Qudwah yang berwenang mengubah data akun.',
      };
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const duplicate = accounts.some(
      (acc) => acc.id !== accountId && acc.email.toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      return {
        ok: false,
        error: 'Email tersebut sudah terdaftar pada akun lain.',
      };
    }

    const target = accounts.find((a) => a.id === accountId);
    if (!target) {
      return { ok: false, error: 'Akun tidak ditemukan.' };
    }

    const safeRole: RoleId =
      accountId === currentUser.id ? 'direktur' : payload.role;

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              name: payload.name.trim(),
              role: safeRole,
              title: payload.title.trim() || acc.title,
              unit: payload.unit.trim() || acc.unit,
              email: payload.email.trim(),
              password: payload.password,
              avatar: makeAvatarInitials(payload.name),
            }
          : acc
      )
    );
    setToastMessage(`Data akun ${payload.name.trim()} berhasil diperbarui.`);
    return { ok: true };
  };

  const handleDeleteAccount = (accountId: string) => {
    if (currentUser.role !== 'direktur') return;
    const target = accounts.find((a) => a.id === accountId);
    if (!target || target.isDefault || target.id === currentUser.id) return;
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setToastMessage(`Akun ${target.name} telah dihapus.`);
  };

  const handleOpenDetail = (requestId: string) => {
    setSelectedRequestId(requestId);
    setActiveTab('detail');
  };

  const handleApproveStage = (requestId: string, note: string) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    const activeStage = targetRequest?.stages.find((stage) => stage.step === targetRequest.currentStageStep);
    if (!targetRequest || targetRequest.status !== 'diproses' || activeStage?.personName !== currentUser.name) {
      setToastMessage('Anda tidak memiliki wewenang untuk memeriksa tahap pengajuan ini. Pengajuan harus diperiksa oleh petugas pada jenjang yang sedang aktif.');
      return;
    }
    const timestamp = formatCurrentTimestamp();
    let approvedTitle = '';
    let completedFully = false;
    let targetCategoryId = '';
    let requestAmount = 0;

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId || req.status !== 'diproses') return req;

        approvedTitle = req.title;
        targetCategoryId = req.budgetCategoryId;
        requestAmount = calculateRequestTotal(req.items);

        const currentStep = req.currentStageStep;
        const nextStep = (currentStep + 1) as 1 | 2 | 3 | 4 | 5 | 6;
        completedFully = currentStep >= 5;

        const updatedStages = req.stages.map((stage) => {
          if (stage.step === currentStep) {
            return {
              ...stage,
              state: 'done' as const,
              note: note ? `Catatan: ${note}` : stage.note,
              timestamp: `Disetujui · ${timestamp}`,
            };
          }
          if (stage.step === nextStep && !completedFully) {
            const nextTier = TIER_CONFIGS.find((t) => t.stageStep === nextStep);
            return {
              ...stage,
              state: 'active' as const,
              note: nextTier
                ? `Sedang diperiksa ${nextTier.role}`
                : 'Sedang ditinjau',
            };
          }
          return stage;
        });

        return {
          ...req,
          status: completedFully ? 'disetujui' : 'diproses',
          currentStageStep: nextStep,
          stages: updatedStages,
        };
      })
    );

    if (completedFully && targetCategoryId && requestAmount > 0) {
      setBudgetLines((prev) =>
        prev.map((b) =>
          b.id === targetCategoryId
            ? { ...b, usedAmount: b.usedAmount + requestAmount }
            : b
        )
      );
      setToastMessage(
        `Pengajuan "${approvedTitle}" telah diotorisasi Direktur & siap dicairkan.`
      );
    } else if (approvedTitle) {
      setToastMessage(
        `Pengajuan "${approvedTitle}" disetujui dan diteruskan ke jenjang berikutnya.`
      );
    }
  };

  const handleRequestRevision = (requestId: string, note: string) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    const activeStage = targetRequest?.stages.find((stage) => stage.step === targetRequest.currentStageStep);
    if (!targetRequest || targetRequest.status !== 'diproses' || activeStage?.personName !== currentUser.name) {
      setToastMessage('Anda tidak memiliki wewenang untuk meminta revisi pada tahap ini.');
      return;
    }
    const timestamp = formatCurrentTimestamp();
    let revisedTitle = '';

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        revisedTitle = req.title;
        const currentStep = req.currentStageStep;
        const activeStage = req.stages.find((s) => s.step === currentStep);
        const reviewerLabel =
          activeStage?.personName || currentUser.name;

        const updatedStages = req.stages.map((stage) => {
          if (stage.step === currentStep) {
            return {
              ...stage,
              state: 'revisi' as const,
              note: `Revisi: ${note}`,
              timestamp: `Dikembalikan · ${timestamp}`,
            };
          }
          return stage;
        });

        return {
          ...req,
          status: 'revisi',
          revisionNote: note,
          revisionBy: reviewerLabel,
          stages: updatedStages,
        };
      })
    );

    if (revisedTitle) {
      setToastMessage(
        `Permintaan revisi untuk "${revisedTitle}" telah dikirim ke pengaju.`
      );
    }
  };

  const handleUpdateRevision = (
    requestId: string,
    updates: Pick<FundRequest, 'title' | 'targetDate' | 'attachmentName' | 'items'>
  ) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    if (!targetRequest || targetRequest.status !== 'revisi' || targetRequest.requesterName !== currentUser.name) {
      setToastMessage('Hanya pengaju yang bersangkutan yang dapat mengubah pengajuan revisi.');
      return;
    }
    setRequests((prev) =>
      prev.map((req) =>
        req.id === requestId && req.status === 'revisi'
          ? { ...req, ...updates }
          : req
      )
    );
    setToastMessage('Perbaikan pengajuan berhasil disimpan. Silakan ajukan ulang setelah selesai.');
  };

  const handleResubmit = (requestId: string) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    if (!targetRequest || targetRequest.status !== 'revisi' || targetRequest.requesterName !== currentUser.name) {
      setToastMessage('Hanya pengaju yang bersangkutan yang dapat mengajukan ulang berkas revisi.');
      return;
    }
    const timestamp = formatCurrentTimestamp();
    let title = '';

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        title = req.title;
        const updatedStages = req.stages.map((stage) => {
          if (stage.step === 1) {
            return {
              ...stage,
              state: 'done' as const,
              timestamp: `Diajukan ulang · ${timestamp}`,
            };
          }
          if (stage.step === 2) {
            return {
              ...stage,
              state: 'active' as const,
              note: 'Menunggu pemeriksaan ulang Kepala Seksi Sarana',
              timestamp: undefined,
            };
          }
          return {
            ...stage,
            state: 'pending' as const,
            timestamp: undefined,
          };
        });

        return {
          ...req,
          status: 'diproses',
          currentStageStep: 2,
          revisionNote: undefined,
          revisionBy: undefined,
          stages: updatedStages,
        };
      })
    );

    setToastMessage(
      `Pengajuan "${title}" berhasil diajukan ulang ke Kasi Sarana.`
    );
  };

  const handleCreateRequest = (payload: {
    requesterRole: string;
    title: string;
    schoolUnit: SchoolUnit;
    budgetCategoryId: string;
    unit: string;
    targetDate: string;
    attachmentName: string;
    items: Omit<LineItem, 'id'>[];
  }) => {
    const code = generateRequestCode(requests);
    const timestamp = formatCurrentTimestamp();
    const shortDate = timestamp.split(',')[0];
    const budget = budgetLines.find((b) => b.id === payload.budgetCategoryId);

    const saranaAcc = accounts.find((a) => a.role === 'sarana');
    const bendSekAcc = accounts.find((a) => a.role === 'bendahara-sekolah' && a.id !== 'acc-umi-laila-sari');
    const bendUmumAcc = accounts.find((a) => a.role === 'bendahara-umum');
    const direkturAcc = accounts.find((a) => a.role === 'direktur');
    const umiLailaAcc = accounts.find((a) => a.id === 'acc-umi-laila-sari');
    const requestByEka = currentUser.name === 'Eka Priyana';
    const requestByRosyidatul = currentUser.name === 'Rosyidatul Alyah';
    const stageTwoReviewer = requestByEka
      ? accounts.find((a) => a.name === 'Rosyidatul Alyah') || saranaAcc
      : saranaAcc;
    const stageThreeReviewer = requestByEka || requestByRosyidatul
      ? umiLailaAcc || bendSekAcc
      : bendSekAcc;

    const newReq: FundRequest = {
      id: `req-${Date.now()}`,
      code,
      title: payload.title,
      schoolUnit: payload.schoolUnit,
      budgetCategoryId: payload.budgetCategoryId,
      budgetCategoryName: budget?.name || 'Operasional',
      unit: payload.unit,
      requesterName: currentUser.name,
      requesterRole: payload.requesterRole,
      submittedDate: shortDate,
      targetDate: payload.targetDate,
      attachmentName: payload.attachmentName,
      status: 'diproses',
      currentStageStep: 2,
      items: payload.items.map((item, idx) => ({
        ...item,
        id: `item-${Date.now()}-${idx}`,
      })),
      stages: [
        {
          step: 1,
          roleKey: 'guru',
          roleLabel: '1. Guru / Staf Pengaju',
          personName: currentUser.name,
          personTitle: currentUser.title,
          state: 'done',
          timestamp: `Diajukan · ${timestamp}`,
        },
        {
          step: 2,
          roleKey: 'sarana',
          roleLabel: '2. Kepala Seksi Sarana',
          personName: stageTwoReviewer?.name || 'Eka Priyana',
          personTitle: requestByEka ? 'Pengganti Kepala Seksi Sarana' : (stageTwoReviewer?.title || 'Kepala Seksi Sarana'),
          state: 'active',
          note: 'Sedang memverifikasi stok & kebutuhan unit',
        },
        {
          step: 3,
          roleKey: 'bendahara-sekolah',
          roleLabel: '3. Bendahara Sekolah',
          personName: stageThreeReviewer?.name || 'Rosyidatul Alyah',
          personTitle: (requestByEka || requestByRosyidatul) ? 'Pengganti Bendahara Sekolah' : (stageThreeReviewer?.title || 'Bendahara Sekolah'),
          state: 'pending',
          note: 'Menunggu persetujuan Kasi Sarana',
        },
        {
          step: 4,
          roleKey: 'bendahara-umum',
          roleLabel: '4. Bendahara Umum',
          personName: bendUmumAcc?.name || 'Pak Ridwan Kamil',
          personTitle: bendUmumAcc?.title || 'Bendahara Umum',
          state: 'pending',
          note: 'Menunggu penerusan dari Bendahara Sekolah',
        },
        {
          step: 5,
          roleKey: 'direktur',
          roleLabel: '5. Direktur SIT Qudwah Sungai Rengit',
          personName: direkturAcc?.name || 'Ust. H. Darmawan',
          personTitle: direkturAcc?.title || 'Direktur SIT Qudwah',
          state: 'pending',
          note: 'Persetujuan akhir & otorisasi pencairan dana',
        },
      ],
    };

    setRequests((prev) => [newReq, ...prev]);
    setSelectedRequestId(newReq.id);
    setActiveTab('detail');
    setToastMessage(`Pengajuan ${code} berhasil dikirim ke Kasi Sarana.`);
  };

  const handleAddBudgetLine = (payload: Omit<BudgetLine, 'id' | 'usedAmount'>): { ok: boolean; error?: string } => {
    if (currentUser.role !== 'direktur' && currentUser.role !== 'bendahara-umum') {
      return { ok: false, error: 'Hanya Direktur atau Bendahara Umum yang dapat menambahkan pos anggaran.' };
    }
    const duplicate = budgetLines.some(
      (line) => line.code.toLowerCase() === payload.code.toLowerCase() ||
        line.name.toLowerCase() === payload.name.toLowerCase()
    );
    if (duplicate) return { ok: false, error: 'Kode atau nama pos anggaran sudah digunakan.' };
    const newLine: BudgetLine = {
      ...payload,
      id: `budget-${Date.now()}`,
      usedAmount: 0,
    };
    setBudgetLines((prev) => [...prev, newLine]);
    setToastMessage(`Pos anggaran "${newLine.name}" berhasil ditambahkan.`);
    return { ok: true };
  };

  const handleUpdateBudgetLine = (id: string, payload: Omit<BudgetLine, 'id' | 'usedAmount'>): { ok: boolean; error?: string } => {
    if (currentUser.role !== 'direktur' && currentUser.role !== 'bendahara-umum') {
      return { ok: false, error: 'Hanya Direktur atau Bendahara Umum yang dapat mengubah pos anggaran.' };
    }
    const existing = budgetLines.find((line) => line.id === id);
    if (!existing) return { ok: false, error: 'Pos anggaran tidak ditemukan.' };
    const duplicate = budgetLines.some(
      (line) => line.id !== id && (
        line.code.toLowerCase() === payload.code.toLowerCase() ||
        line.name.toLowerCase() === payload.name.toLowerCase()
      )
    );
    if (duplicate) return { ok: false, error: 'Kode atau nama pos anggaran sudah digunakan oleh pos lain.' };
    if (payload.annualLimit < existing.usedAmount) {
      return { ok: false, error: 'Pagu tahunan tidak boleh lebih kecil dari dana yang sudah terpakai.' };
    }
    const pendingAmount = requests
      .filter((request) => request.budgetCategoryId === id && request.status === 'diproses')
      .reduce((sum, request) => sum + calculateRequestTotal(request.items), 0);
    if (payload.annualLimit < existing.usedAmount + pendingAmount) {
      return { ok: false, error: 'Pagu tahunan tidak boleh lebih kecil dari dana yang sedang dalam proses.' };
    }
    setBudgetLines((prev) => prev.map((line) => line.id === id ? { ...line, ...payload } : line));
    setToastMessage(`Pos anggaran "${payload.name}" berhasil diperbarui.`);
    return { ok: true };
  };

  const handleResetData = () => {
    setRequests(INITIAL_REQUESTS);
    setBudgetLines(INITIAL_BUDGET_LINES);
    setSelectedRequestId('');
    setToastMessage('Seluruh data pengajuan telah dikosongkan.');
  };

  const handleExportBackup = () => {
    const payload: LocalBackupSnapshot = {
      version: 3,
      updatedAt: formatCurrentTimestamp(),
      accounts,
      requests,
      budgetLines,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'KasSekolah_SIT_Qudwah_Backup.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToastMessage('Berkas cadangan data berhasil diunduh.');
  };

  const handleImportBackup = async (
    file: File
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<LocalBackupSnapshot>;
      if (
        !parsed ||
        !Array.isArray(parsed.accounts) ||
        !Array.isArray(parsed.requests) ||
        !Array.isArray(parsed.budgetLines)
      ) {
        return {
          ok: false,
          error: 'Format berkas cadangan JSON tidak valid.',
        };
      }
      if (parsed.accounts.length > 0) {
        setAccounts(parsed.accounts);
      }
      setRequests(parsed.requests);
      if (parsed.budgetLines.length > 0) {
        setBudgetLines(parsed.budgetLines);
      }
      setSelectedRequestId(parsed.requests[0]?.id || '');
      setToastMessage(
        `Data berhasil dipulihkan (${parsed.requests.length} pengajuan).`
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Gagal membaca berkas cadangan JSON.',
      };
    }
  };

  if (!isLoggedIn) {
    return <LoginView accounts={accounts} onLogin={handleLogin} />;
  }

  const activeRequest =
    requests.find((r) => r.id === selectedRequestId) || requests[0];

  return (
    <div className="min-h-screen flex bg-[#F8FAF8] text-[#191C1B]">
      <DesktopSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalCount={pendingApprovalCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {activeTab === 'pengajuan' && (
          <DashboardRequestsView
            requests={requests}
            budgetLines={budgetLines}
            currentUser={currentUser}
            onOpenDetail={handleOpenDetail}
            onCreateRequest={handleCreateRequest}
          />
        )}

        {activeTab === 'persetujuan' && (
          <TierReviewView
            requests={requests}
            selectedTier={selectedTier}
            onSelectTier={setSelectedTier}
            onApproveStage={handleApproveStage}
            onRequestRevision={handleRequestRevision}
            onOpenDetail={handleOpenDetail}
          />
        )}

        {activeTab === 'detail' &&
          (activeRequest ? (
            <RequestDetailView
              request={activeRequest}
              currentRole={currentRole}
              currentUserName={currentUser.name}
              onBack={() => setActiveTab('pengajuan')}
              onApproveStage={handleApproveStage}
              onRequestRevision={handleRequestRevision}
              onResubmit={handleResubmit}
              onUpdateRevision={handleUpdateRevision}
            />
          ) : (
            <div className="flex-1 px-4 lg:px-8 py-12 max-w-2xl w-full mx-auto flex flex-col items-center justify-center text-center gap-3">
              <p className="font-title text-[18px] font-semibold text-[#191C1B]">
                Belum ada pengajuan yang dipilih
              </p>
              <p className="font-body text-[14px] text-[#3F4947]">
                Buat pengajuan dana baru atau pilih dari daftar pengajuan.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('pengajuan')}
                className="rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] font-semibold hover:bg-[#0F5C53]"
              >
                Buka Daftar Pengajuan
              </button>
            </div>
          ))}

        {activeTab === 'anggaran' && (
          <BudgetView budgetLines={budgetLines} requests={requests} currentUser={currentUser} onAddBudgetLine={handleAddBudgetLine} onUpdateBudgetLine={handleUpdateBudgetLine} />
        )}

        {activeTab === 'riwayat' && (
          <HistoryView
            requests={requests}
            onOpenDetail={handleOpenDetail}
          />
        )}

        {activeTab === 'profil' && (
          <ProfileView
            currentUser={currentUser}
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onSelectTab={setActiveTab}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetData={handleResetData}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Show mobile bottom nav except on detail screen where mobile action footer lives */}
      {activeTab !== 'detail' && (
        <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 max-w-sm rounded-[10px] border border-[#00433C]/20 bg-[#00433C] text-[#FFFFFF] px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          <CheckCircle2
            className="w-5 h-5 text-[#90D3C7] shrink-0"
            aria-hidden="true"
          />
          <p className="font-body text-[13px] leading-[18px] flex-1">
            {toastMessage}
          </p>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            aria-label="Tutup notifikasi"
            className="text-[#90D3C7] hover:text-[#FFFFFF] p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
