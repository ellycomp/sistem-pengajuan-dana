export type RoleId =
  | 'guru'
  | 'sarana'
  | 'bendahara-sekolah'
  | 'bendahara-umum'
  | 'direktur';

export type TierKey =
  | 'sarana'
  | 'bendahara-sekolah'
  | 'bendahara-umum'
  | 'direktur';

export type RequestStatus =
  | 'diproses'
  | 'revisi'
  | 'disetujui';

export type StageState = 'done' | 'active' | 'pending' | 'revisi';

export type AppNavTab =
  | 'pengajuan'
  | 'persetujuan'
  | 'anggaran'
  | 'riwayat'
  | 'detail'
  | 'profil';

export interface UserProfile {
  role: RoleId;
  name: string;
  title: string;
  avatar: string;
  email: string;
  unit: string;
  niy?: string;
}

export interface UserAccount extends UserProfile {
  id: string;
  password: string;
  isDefault?: boolean;
}

export interface ApprovalStage {
  step: number;
  roleKey: RoleId;
  roleLabel: string;
  personName: string;
  personTitle: string;
  personNiy?: string;
  state: StageState;
  note?: string;
  timestamp?: string;
}

export type SchoolUnit =
  | 'SD IT Qudwah Sungai Rengit'
  | 'KB Islam Terpadu Qudwah';

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
}

export interface FundRequest {
  id: string;
  code: string;
  title: string;
  schoolUnit: SchoolUnit;
  budgetCategoryId: string;
  budgetCategoryName: string;
  unit: string;
  requesterName: string;
  requesterNiy: string;
  requesterRole: string;
  submittedDate: string;
  targetDate: string;
  attachmentName: string;
  status: RequestStatus;
  currentStageStep: 1 | 2 | 3 | 4 | 5 | 6; // 6 means fully approved / disbursed
  revisionNote?: string;
  revisionBy?: string;
  items: LineItem[];
  stages: ApprovalStage[];
}

export interface BudgetLine {
  id: string;
  name: string;
  code: string;
  unit: string;
  annualLimit: number;
  usedAmount: number;
}

export interface TierConfig {
  key: TierKey;
  stageStep: 2 | 3 | 4 | 5;
  tierNumber: number;
  shortLabel: string;
  title: string;
  subtitle: string;
  user: string;
  avatar: string;
  role: string;
  queueTitle: string;
  checklistTitle: string;
  approveLabel: string;
  nextStageLabel: string;
  checks: string[];
}

export interface LocalBackupSnapshot {
  version: number;
  updatedAt: string;
  accounts: UserAccount[];
  requests: FundRequest[];
  budgetLines: BudgetLine[];
}
