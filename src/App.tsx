import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
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
        // Keep only the primary director account in local app state.
        const migratedAccounts = INITIAL_ACCOUNTS.map((seedAccount) => {
          const existing = parsed.accounts?.find((account) =>
            account.email?.toLowerCase() === seedAccount.email.toLowerCase()
          );
          return existing ? { ...seedAccount, ...existing, role: 'direktur' as RoleId } : seedAccount;
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
  // Supabase session is the source of truth; never trust a cached localStorage login flag.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
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

  const [activeTab, setActiveTab] = useState<AppNavTab>(() => {
    // Simpan halaman terakhir agar tetap sama bila Android membuang WebView di latar belakang.
    try {
      const saved = sessionStorage.getItem('sit_qudwah_active_tab');
      const validTabs: AppNavTab[] = ['pengajuan', 'persetujuan', 'anggaran', 'riwayat', 'profil', 'detail'];
      if (saved && validTabs.includes(saved as AppNavTab)) return saved as AppNavTab;
    } catch { /* gunakan halaman awal */ }
    return currentRole === 'guru'
      ? (initial.requests.length > 0 ? 'detail' : 'pengajuan')
      : 'persetujuan';
  });
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    initial.requests[0]?.id || ''
  );
  const [selectedTier, setSelectedTier] = useState<TierKey>(() =>
    currentRole === 'guru' ? 'sarana' : currentRole
  );
  const [toastMessage, setToastMessage] = useState<string>('');

  // Restore a real Supabase session after refresh and keep app state in sync with Auth.
  useEffect(() => {
    if (!supabase) {
      setIsLoggedIn(false);
      return;
    }

    let active = true;
    const loadAuthenticatedProfile = async (userId: string, initializeNavigation = false) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!active) return;
      if (error || !profile) {
        setIsLoggedIn(false);
        setToastMessage('Sesi ditemukan, tetapi profil pengguna tidak dapat dibaca. Hubungi pengelola.');
        await supabase.auth.signOut();
        return;
      }

      // Setelah profil tervalidasi, ambil data operasional dari database.
      const [requestResult, budgetResult] = await Promise.all([
        supabase
          .from('fund_requests')
          .select('*, request_items(*), approval_stages(*)')
          .order('created_at', { ascending: false }),
        supabase.from('budget_lines').select('*').order('name'),
      ]);

      if (!active) return;

      if (requestResult.error) {
        setToastMessage(`Data pengajuan belum dapat dimuat: ${requestResult.error.message}`);
      } else {
        const cloudRequests: FundRequest[] = (requestResult.data || []).map((row: any) => ({
          id: row.id,
          code: row.code,
          title: row.title,
          schoolUnit: row.school_unit,
          budgetCategoryId: row.budget_category_id,
          budgetCategoryName: row.budget_category_name,
          unit: row.unit || '',
          requesterName: row.requester_name,
          requesterNiy: row.requester_niy || '',
          requesterRole: row.requester_role,
          submittedDate: row.submitted_date,
          targetDate: row.target_date,
          attachmentName: row.attachment_name || '',
          status: row.status,
          currentStageStep: row.current_stage_step,
          revisionNote: row.revision_note || undefined,
          revisionBy: row.revision_by || undefined,
          items: (row.request_items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: Number(item.quantity),
            unitLabel: item.unit_label || '',
            unitPrice: Number(item.unit_price),
          })),
          stages: (row.approval_stages || [])
            .sort((a: any, b: any) => a.step - b.step)
            .map((stage: any) => ({
              step: stage.step,
              roleKey: stage.role_key,
              roleLabel: stage.role_label,
              personName: stage.person_name,
              personTitle: stage.person_title || '',
              personNiy: stage.person_niy || '',
              state: stage.state,
              note: stage.note || undefined,
              timestamp: stage.timestamp_label || undefined,
            })),
        }));
        setRequests(cloudRequests);
        if (initializeNavigation && cloudRequests.length > 0) {
          setSelectedRequestId(cloudRequests[0].id);
        }
      }

      if (budgetResult.error) {
        setToastMessage(`Data anggaran belum dapat dimuat: ${budgetResult.error.message}`);
      } else if ((budgetResult.data || []).length > 0) {
        setBudgetLines(budgetResult.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          code: row.code || '',
          unit: row.unit || '',
          annualLimit: Number(row.annual_limit),
          usedAmount: Number(row.used_amount),
        })));
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      if (profilesError) {
        setToastMessage(`Daftar petugas belum dapat dimuat: ${profilesError.message}`);
      }
      const visibleProfiles = (profileRows || [profile]).map((row: any): UserAccount => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        title: row.title || '',
        unit: row.unit || '',
        niy: row.niy || '',
        avatar: row.avatar || makeAvatarInitials(row.name),
        password: '',
        isDefault: false,
      }));
      const account: UserAccount = visibleProfiles.find((item) => item.id === profile.id) || {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        title: profile.title || '',
        unit: profile.unit || '',
        niy: profile.niy || '',
        avatar: profile.avatar || makeAvatarInitials(profile.name),
        password: '',
        isDefault: false,
      };
      // Keep all active staff profiles available so routing can select a real,
      // non-requesting reviewer with the required role.
      setAccounts(visibleProfiles);
      setCurrentAccountId(account.id);
      setIsLoggedIn(true);
      // Tentukan tab awal hanya saat sesi pertama kali dipulihkan.
      // Event autentikasi berikutnya (misalnya setelah kembali dari aplikasi lain)
      // tidak boleh mengubah halaman yang sedang dibuka pengguna.
      if (initializeNavigation && account.role !== 'guru' && account.role !== 'direktur') {
        setSelectedTier(account.role);
      }
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setIsLoggedIn(false);
        setToastMessage('Tidak dapat memulihkan sesi. Silakan masuk kembali.');
        return;
      }
      if (data.session?.user) {
        void loadAuthenticatedProfile(data.session.user.id, true);
      } else {
        setIsLoggedIn(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (active) setIsLoggedIn(false);
        return;
      }
      // Perubahan token saat tab/aplikasi kembali aktif tidak boleh memuat ulang profil,
      // karena itu dapat mengembalikan pengguna ke tab awal dan mengganti pengajuan terpilih.
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void loadAuthenticatedProfile(session.user.id, false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('sit_qudwah_active_tab', activeTab); } catch { /* storage may be unavailable */ }
  }, [activeTab]);

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
    setAccounts((prev) => [
      ...prev.filter((item) =>
        item.id !== account.id &&
        item.email?.toLowerCase() !== account.email.toLowerCase()
      ),
      account,
    ]);
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
    void supabase?.auth.signOut();
    setIsLoggedIn(false);
    setToastMessage('');
  };



  const handleAddAccount = async (payload: {
    name: string;
    role: RoleId;
    title: string;
    unit: string;
    niy: string;
    email: string;
    password: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (currentUser.role !== 'direktur') {
      return { ok: false, error: 'Hanya Direktur yang dapat menambahkan akun.' };
    }
    if (!supabase) return { ok: false, error: 'Koneksi Supabase belum tersedia.' };
    const { data, error } = await supabase.functions.invoke('manage-staff-account', {
      body: {
        action: 'create',
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        role: payload.role,
        title: payload.title.trim(),
        unit: payload.unit.trim(),
        niy: payload.niy.trim(),
      },
    });
    if (error || data?.error) {
      let serverMessage = data?.error as string | undefined;
      let serverDetail = '';
      // Supabase FunctionsHttpError keeps the response body in error.context.
      if (error && !serverMessage) {
        try {
          const response = (error as any).context;
          if (response && typeof response.clone === 'function') {
            const body = await response.clone().json();
            serverMessage = body?.error || body?.message;
            if (body?.detail) serverDetail = String(body.detail);
            if (body?.diagnostic) serverDetail = JSON.stringify(body.diagnostic);
          }
        } catch {
          // Fall back to the SDK error message below.
        }
      }
      const status = (error as any)?.context?.status;
      const message = serverMessage || error?.message || 'Gagal membuat akun.';
      const statusText = status ? ` (HTTP ${status})` : '';
      return { ok: false, error: `${message}${statusText}${serverDetail ? ` — ${serverDetail}` : ''}` };
    }
    const created = data.profile;
    const newAccount: UserAccount = {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      title: created.title,
      unit: created.unit,
      niy: payload.niy.trim(),
      avatar: makeAvatarInitials(created.name),
      password: '',
      isDefault: false,
    };
    setAccounts((prev) => [...prev.filter((item) => item.id !== newAccount.id), newAccount]);
    setToastMessage(`Akun ${newAccount.name} berhasil dibuat. Petugas dapat login menggunakan email dan kata sandi yang ditetapkan.`);
    return { ok: true };
  };

  const handleUpdateAccount = async (
    accountId: string,
    payload: {
      name: string;
      role: RoleId;
      title: string;
      unit: string;
      niy: string;
      email: string;
      password: string;
    }
  ): Promise<{ ok: boolean; error?: string }> => {
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
    if (!supabase) return { ok: false, error: 'Koneksi Supabase belum tersedia.' };
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
              niy: payload.niy.trim(),
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

  const handleDeleteRequest = (requestId: string) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    if (!targetRequest || targetRequest.requesterName !== currentUser.name) {
      setToastMessage('Anda hanya dapat menghapus pengajuan milik sendiri.');
      return;
    }
    if (targetRequest.status === 'disetujui') {
      setToastMessage('Pengajuan yang sudah disetujui tidak dapat dihapus.');
      return;
    }
    setRequests((prev) => prev.filter((req) => req.id !== requestId));
    if (selectedRequestId === requestId) {
      setSelectedRequestId('');
      setActiveTab('pengajuan');
    }
    setToastMessage(`Pengajuan "${targetRequest.title}" berhasil dihapus.`);
  };

  const handleOpenDetail = (requestId: string) => {
    setSelectedRequestId(requestId);
    setActiveTab('detail');
  };

  const handleApproveStage = async (requestId: string, note: string) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    const activeStage = targetRequest?.stages.find((stage) => stage.step === targetRequest.currentStageStep);
    if (!targetRequest || currentUser.role === 'guru' || targetRequest.status !== 'diproses' || activeStage?.personName !== currentUser.name) {
      setToastMessage('Anda tidak memiliki wewenang untuk memeriksa tahap pengajuan ini. Pengajuan harus diperiksa oleh petugas pada jenjang yang sedang aktif.');
      return;
    }
    if (!supabase) { setToastMessage('Koneksi database belum tersedia.'); return; }
    const { error: reviewError } = await supabase.rpc('review_fund_request', {
      p_request_id: requestId,
      p_action: 'approve',
      p_note: note,
      p_timestamp: formatCurrentTimestamp(),
    });
    if (reviewError) { setToastMessage(`Gagal menyimpan persetujuan: ${reviewError.message}`); return; }
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

  const handleRequestRevision = async (requestId: string, note: string) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    const activeStage = targetRequest?.stages.find((stage) => stage.step === targetRequest.currentStageStep);
    if (!targetRequest || currentUser.role === 'guru' || targetRequest.status !== 'diproses' || activeStage?.personName !== currentUser.name) {
      setToastMessage('Anda tidak memiliki wewenang untuk meminta revisi pada tahap ini.');
      return;
    }
    if (!supabase) { setToastMessage('Koneksi database belum tersedia.'); return; }
    const { error: reviewError } = await supabase.rpc('review_fund_request', {
      p_request_id: requestId,
      p_action: 'revision',
      p_note: note,
      p_timestamp: formatCurrentTimestamp(),
    });
    if (reviewError) { setToastMessage(`Gagal mengirim revisi: ${reviewError.message}`); return; }
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

  const handleUpdateRevision = async (
    requestId: string,
    updates: Pick<FundRequest, 'title' | 'targetDate' | 'attachmentName' | 'items'>
  ): Promise<{ ok: boolean; error?: string }> => {
    const targetRequest = requests.find((req) => req.id === requestId);
    if (!targetRequest || targetRequest.status !== 'revisi' || targetRequest.requesterName !== currentUser.name) {
      return { ok: false, error: 'Hanya pengaju yang bersangkutan yang dapat mengubah pengajuan revisi.' };
    }
    if (!supabase) return { ok: false, error: 'Koneksi database belum tersedia.' };
    const { error } = await supabase.rpc('save_fund_request_revision', {
      p_request_id: requestId,
      p_title: updates.title,
      p_target_date: updates.targetDate,
      p_attachment_name: updates.attachmentName,
      p_items: updates.items.map((item) => ({
        id: item.id, name: item.name, quantity: item.quantity,
        unitLabel: item.unitLabel, unitPrice: item.unitPrice,
      })),
    });
    if (error) return { ok: false, error: error.message };
    setRequests((prev) => prev.map((req) =>
      req.id === requestId && req.status === 'revisi' ? { ...req, ...updates } : req
    ));
    setToastMessage('Perbaikan revisi berhasil disimpan ke database. Silakan ajukan ulang.');
    return { ok: true };
  };

  const handleResubmit = async (requestId: string) => {
    const targetRequest = requests.find((req) => req.id === requestId);
    if (!targetRequest || targetRequest.status !== 'revisi' || targetRequest.requesterName !== currentUser.name) {
      setToastMessage('Hanya pengaju yang bersangkutan yang dapat mengajukan ulang berkas revisi.');
      return;
    }
    if (!supabase) { setToastMessage('Koneksi database belum tersedia.'); return; }
    const timestamp = formatCurrentTimestamp();
    const { error: resubmitError } = await supabase.rpc('resubmit_fund_request', {
      p_request_id: requestId,
      p_title: targetRequest.title,
      p_target_date: targetRequest.targetDate,
      p_attachment_name: targetRequest.attachmentName,
      p_items: targetRequest.items.map((item) => ({
        id: item.id, name: item.name, quantity: item.quantity,
        unitLabel: item.unitLabel, unitPrice: item.unitPrice,
      })),
      p_timestamp: timestamp,
    });
    if (resubmitError) { setToastMessage(`Gagal mengajukan ulang: ${resubmitError.message}`); return; }
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

  const handleCreateRequest = async (payload: {
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

    const findOtherReviewer = (role: RoleId) =>
      accounts.find((account) => account.role === role && account.id !== currentUser.id);
    // Each approval step must be assigned to a real account with that step's
    // role. If the requester occupies that role, a second account of the same
    // role is required so nobody can approve their own request.
    const stageTwoReviewer = findOtherReviewer('sarana');
    const stageThreeReviewer = findOtherReviewer('bendahara-sekolah');
    const bendUmumAcc = findOtherReviewer('bendahara-umum');
    const direkturAcc = findOtherReviewer('direktur');
    const missingReviewer = [
      !stageTwoReviewer && 'Kepala Seksi Sarana',
      !stageThreeReviewer && 'Bendahara Sekolah',
      !bendUmumAcc && 'Bendahara Umum',
      !direkturAcc && 'Direktur',
    ].filter(Boolean);
    if (missingReviewer.length) {
      setToastMessage(
        `Pengajuan belum dapat dikirim. Akun pemeriksa aktif belum tersedia untuk: ${missingReviewer.join(', ')}. Jika pengaju merangkap jabatan tersebut, buat akun petugas pengganti dengan jabatan yang sama terlebih dahulu.`
      );
      return;
    }

    const newReq: FundRequest = {
      id: `req-${Date.now()}`,
      code,
      title: payload.title,
      schoolUnit: payload.schoolUnit,
      budgetCategoryId: payload.budgetCategoryId,
      budgetCategoryName: budget?.name || 'Operasional',
      unit: payload.unit,
      requesterName: currentUser.name,
      requesterNiy: currentUser.niy || '',
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
          personNiy: currentUser.niy,
          state: 'done',
          timestamp: `Diajukan · ${timestamp}`,
        },
        {
          step: 2,
          roleKey: 'sarana',
          roleLabel: '2. Kepala Seksi Sarana',
          personName: stageTwoReviewer!.name,
          personTitle: stageTwoReviewer!.title || 'Kepala Seksi Sarana',
          state: 'active',
          note: 'Sedang memverifikasi stok & kebutuhan unit',
        },
        {
          step: 3,
          roleKey: 'bendahara-sekolah',
          roleLabel: '3. Bendahara Sekolah',
          personName: stageThreeReviewer!.name,
          personTitle: stageThreeReviewer!.title || 'Bendahara Sekolah',
          state: 'pending',
          note: 'Menunggu persetujuan Kasi Sarana',
        },
        {
          step: 4,
          roleKey: 'bendahara-umum',
          roleLabel: '4. Bendahara Umum',
          personName: bendUmumAcc!.name,
          personTitle: bendUmumAcc!.title || 'Bendahara Umum',
          state: 'pending',
          note: 'Menunggu penerusan dari Bendahara Sekolah',
        },
        {
          step: 5,
          roleKey: 'direktur',
          roleLabel: '5. Direktur SIT Qudwah Sungai Rengit',
          personName: direkturAcc!.name,
          personTitle: direkturAcc!.title || 'Direktur SIT Qudwah',
          state: 'pending',
          note: 'Persetujuan akhir & otorisasi pencairan dana',
        },
      ],
    };

    if (!supabase) { setToastMessage('Koneksi database belum tersedia.'); return; }
    const { error: createError } = await supabase.rpc('create_fund_request', {
      p_id: newReq.id,
      p_code: newReq.code,
      p_title: newReq.title,
      p_school_unit: newReq.schoolUnit,
      p_budget_category_id: newReq.budgetCategoryId,
      p_budget_category_name: newReq.budgetCategoryName,
      p_unit: newReq.unit,
      p_requester_role: newReq.requesterRole,
      p_submitted_date: newReq.submittedDate,
      p_target_date: newReq.targetDate,
      p_attachment_name: newReq.attachmentName,
      p_items: newReq.items.map((item) => ({
        id: item.id, name: item.name, quantity: item.quantity,
        unitLabel: item.unitLabel, unitPrice: item.unitPrice,
      })),
      p_stages: newReq.stages.map((stage) => ({
        step: stage.step, roleKey: stage.roleKey, roleLabel: stage.roleLabel,
        personName: stage.personName, personTitle: stage.personTitle,
        personNiy: stage.personNiy || '', state: stage.state, note: stage.note, timestamp: stage.timestamp,
      })),
    });
    if (createError) { setToastMessage(`Pengajuan gagal disimpan ke database: ${createError.message}`); return; }
    setRequests((prev) => [newReq, ...prev]);
    setSelectedRequestId(newReq.id);
    setActiveTab('detail');
    setToastMessage(`Pengajuan ${code} berhasil dikirim ke ${stageTwoReviewer!.name} (Kepala Seksi Sarana).`);
  };

  const handleAddBudgetLine = async (payload: Omit<BudgetLine, 'id' | 'usedAmount'>): Promise<{ ok: boolean; error?: string }> => {
    if (currentUser.role !== 'direktur' && currentUser.role !== 'bendahara-umum') {
      return { ok: false, error: 'Hanya Direktur atau Bendahara Umum yang dapat menambahkan pos anggaran.' };
    }
    if (!supabase) return { ok: false, error: 'Koneksi database tidak tersedia.' };
    const duplicate = budgetLines.some(
      (line) => line.code.toLowerCase() === payload.code.toLowerCase() ||
        line.name.toLowerCase() === payload.name.toLowerCase()
    );
    if (duplicate) return { ok: false, error: 'Kode atau nama pos anggaran sudah digunakan.' };
    const newLine: BudgetLine = { ...payload, id: crypto.randomUUID(), usedAmount: 0 };
    const { error } = await supabase.rpc('save_budget_line', {
      p_action: 'insert', p_id: newLine.id, p_name: newLine.name,
      p_code: newLine.code, p_unit: newLine.unit, p_annual_limit: newLine.annualLimit
    });
    if (error) return { ok: false, error: error.message };
    setBudgetLines((prev) => [...prev, newLine]);
    setToastMessage(`Pos anggaran "${newLine.name}" berhasil disimpan ke database.`);
    return { ok: true };
  };

  const handleUpdateBudgetLine = async (id: string, payload: Omit<BudgetLine, 'id' | 'usedAmount'>): Promise<{ ok: boolean; error?: string }> => {
    if (currentUser.role !== 'direktur' && currentUser.role !== 'bendahara-umum') {
      return { ok: false, error: 'Hanya Direktur atau Bendahara Umum yang dapat mengubah pos anggaran.' };
    }
    const existing = budgetLines.find((line) => line.id === id);
    if (!existing) return { ok: false, error: 'Pos anggaran tidak ditemukan.' };
    if (!supabase) return { ok: false, error: 'Koneksi database tidak tersedia.' };
    const duplicate = budgetLines.some(
      (line) => line.id !== id && (
        line.code.toLowerCase() === payload.code.toLowerCase() ||
        line.name.toLowerCase() === payload.name.toLowerCase()
      )
    );
    if (duplicate) return { ok: false, error: 'Kode atau nama pos anggaran sudah digunakan oleh pos lain.' };
    const { error } = await supabase.rpc('save_budget_line', {
      p_action: 'update', p_id: id, p_name: payload.name,
      p_code: payload.code, p_unit: payload.unit, p_annual_limit: payload.annualLimit
    });
    if (error) return { ok: false, error: error.message };
    setBudgetLines((prev) => prev.map((line) => line.id === id ? { ...line, ...payload } : line));
    setToastMessage(`Pos anggaran "${payload.name}" berhasil diperbarui di database.`);
    return { ok: true };
  };

  const handleDeleteBudgetLine = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (currentUser.role !== 'direktur' && currentUser.role !== 'bendahara-umum') {
      return { ok: false, error: 'Hanya Direktur atau Bendahara Umum yang dapat menghapus pos anggaran.' };
    }
    if (!supabase) return { ok: false, error: 'Koneksi database tidak tersedia.' };
    const { error } = await supabase.rpc('delete_budget_line', { p_id: id });
    if (error) return { ok: false, error: error.message };
    setBudgetLines((prev) => prev.filter((line) => line.id !== id));
    setToastMessage('Pos anggaran berhasil dihapus.');
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
            onDeleteRequest={handleDeleteRequest}
            onCreateRequest={handleCreateRequest}
          />
        )}

        {activeTab === 'persetujuan' && (
          <TierReviewView
            requests={requests}
            currentUserName={currentUser.name}
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
              accounts={accounts}
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
          <BudgetView budgetLines={budgetLines} requests={requests} currentUser={currentUser} onAddBudgetLine={handleAddBudgetLine} onUpdateBudgetLine={handleUpdateBudgetLine} onDeleteBudgetLine={handleDeleteBudgetLine} />
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
