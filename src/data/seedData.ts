import {
  BudgetLine,
  FundRequest,
  LineItem,
  RoleId,
  SchoolUnit,
  TierConfig,
  UserAccount,
  UserProfile,
} from '../types/kassekolah';

export const SCHOOL_UNITS: SchoolUnit[] = [
  'SD IT Qudwah Sungai Rengit',
  'KB Islam Terpadu Qudwah',
];

export const SIT_QUDWAH_LOGO_URL = `${import.meta.env.BASE_URL}logo-sit-qudwah.png`;

export const ROLE_USERS: Record<RoleId, UserProfile> = {
  guru: {
    role: 'guru',
    name: 'Bu Ratna Dewi',
    title: 'Koordinator TU',
    avatar: 'RD',
    email: 'ratna.dewi@sitqudwah.sch.id',
    unit: 'Tata Usaha',
  },
  sarana: {
    role: 'sarana',
    name: 'Eka Priyana',
    title: 'Kepala Seksi Sarana',
    avatar: 'EP',
    email: 'eka.priyana@sitqudwah.sch.id',
    unit: 'Sarana & Prasarana',
  },
  'bendahara-sekolah': {
    role: 'bendahara-sekolah',
    name: 'Rosyidatul Alyah',
    title: 'Bendahara Sekolah',
    avatar: 'RA',
    email: 'rosyidatul.alyah@sitqudwah.sch.id',
    unit: 'Keuangan Unit',
  },
  'bendahara-umum': {
    role: 'bendahara-umum',
    name: 'Pak Ridwan Kamil',
    title: 'Bendahara Umum',
    avatar: 'RK',
    email: 'ridwan.kamil@sitqudwah.sch.id',
    unit: 'Keuangan Yayasan',
  },
  direktur: {
    role: 'direktur',
    name: 'Ust. H. Darmawan',
    title: 'Direktur SIT Qudwah Sungai Rengit',
    avatar: 'HD',
    email: 'ellysumantri86@gmail.com',
    unit: 'Pimpinan Yayasan',
  },
};

export const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'acc-guru',
    ...ROLE_USERS.guru,
    password: 'qudwah2026',
    isDefault: true,
  },
  {
    id: 'acc-sarana',
    ...ROLE_USERS.sarana,
    password: 'qudwah2026',
    isDefault: true,
  },
  {
    id: 'acc-bendahara-sekolah',
    ...ROLE_USERS['bendahara-sekolah'],
    password: 'qudwah2026',
    isDefault: true,
  },
  {
    id: 'acc-umi-laila-sari',
    role: 'bendahara-sekolah',
    name: 'Umi Laila Sari',
    title: 'Pengganti Bendahara Sekolah',
    avatar: 'UL',
    email: 'umi.laila.sari@sitqudwah.sch.id',
    unit: 'Keuangan Unit',
    password: 'qudwah2026',
    isDefault: true,
  },
  {
    id: 'acc-bendahara-umum',
    ...ROLE_USERS['bendahara-umum'],
    password: 'qudwah2026',
    isDefault: true,
  },
  {
    id: 'acc-direktur',
    ...ROLE_USERS.direktur,
    password: 'Sung@irengit20',
    isDefault: true,
  },
];

export const TIER_CONFIGS: TierConfig[] = [
  {
    key: 'sarana',
    stageStep: 2,
    tierNumber: 1,
    shortLabel: '1. Kasi Sarana',
    title: 'Kasi Sarana',
    subtitle: 'Cek stok & kebutuhan',
    user: 'Eka Priyana',
    avatar: 'EP',
    role: 'Kepala Seksi Sarana',
    queueTitle: 'Antrean Kasi Sarana',
    checklistTitle: 'Daftar Periksa Kepala Seksi Sarana',
    approveLabel: 'Setujui & Teruskan ke Bendahara Sekolah',
    nextStageLabel: 'Bendahara Sekolah',
    checks: [
      'Stok barang di gudang sarana sudah dicek dan memang kosong',
      'Spesifikasi teknis barang sesuai kebutuhan kegiatan belajar',
      'Estimasi jumlah unit wajar dan tidak melebihi kebutuhan',
    ],
  },
  {
    key: 'bendahara-sekolah',
    stageStep: 3,
    tierNumber: 2,
    shortLabel: '2. Bend. Sekolah',
    title: 'Bendahara Sekolah',
    subtitle: 'Cek pagu & RAB unit',
    user: 'Rosyidatul Alyah',
    avatar: 'RA',
    role: 'Bendahara Sekolah',
    queueTitle: 'Antrean Bendahara Sekolah',
    checklistTitle: 'Daftar Periksa Bendahara Sekolah',
    approveLabel: 'Setujui & Teruskan ke Bendahara Umum',
    nextStageLabel: 'Bendahara Umum',
    checks: [
      'Sudah mendapat persetujuan Kepala Seksi Sarana',
      'Sisa pagu pos anggaran unit mencukupi untuk nominal ini',
      'Lampiran RAB / penawaran harga toko lengkap dan terbaca',
    ],
  },
  {
    key: 'bendahara-umum',
    stageStep: 4,
    tierNumber: 3,
    shortLabel: '3. Bend. Umum',
    title: 'Bendahara Umum',
    subtitle: 'Cek kas yayasan',
    user: 'Pak Ridwan Kamil',
    avatar: 'RK',
    role: 'Bendahara Umum',
    queueTitle: 'Antrean Bendahara Umum',
    checklistTitle: 'Daftar Periksa Bendahara Umum',
    approveLabel: 'Teruskan ke Direktur SIT Qudwah',
    nextStageLabel: 'Direktur SIT Qudwah',
    checks: [
      'Verifikasi kesesuaian kode akun keuangan yayasan',
      'Ketersediaan kas operasional yayasan untuk pencairan minggu ini',
      'Tidak ada duplikasi pengajuan pada periode yang sama',
    ],
  },
  {
    key: 'direktur',
    stageStep: 5,
    tierNumber: 4,
    shortLabel: '4. Direktur',
    title: 'Direktur SIT Qudwah',
    subtitle: 'Otorisasi akhir dana',
    user: 'Ust. H. Darmawan',
    avatar: 'HD',
    role: 'Direktur SIT Qudwah',
    queueTitle: 'Antrean Persetujuan Direktur',
    checklistTitle: 'Otorisasi Direktur SIT Qudwah Sungai Rengit',
    approveLabel: 'Setujui Pencairan Dana',
    nextStageLabel: 'Pencairan Dana',
    checks: [
      'Telah diverifikasi Kasi Sarana, Bendahara Sekolah, & Bendahara Umum',
      'Sejalan dengan prioritas program kerja SIT Qudwah Sungai Rengit',
    ],
  },
];

export const INITIAL_BUDGET_LINES: BudgetLine[] = [
  {
    id: 'atk',
    name: 'ATK & Fotokopi',
    code: 'POS-5101',
    unit: 'Tata Usaha',
    annualLimit: 24000000,
    usedAmount: 0,
  },
  {
    id: 'lab',
    name: 'Sarana Lab',
    code: 'POS-5204',
    unit: 'Lab IPA',
    annualLimit: 18000000,
    usedAmount: 0,
  },
  {
    id: 'pemeliharaan',
    name: 'Pemeliharaan',
    code: 'POS-5302',
    unit: 'Sarpras',
    annualLimit: 20000000,
    usedAmount: 0,
  },
  {
    id: 'it',
    name: 'Sarana IT',
    code: 'POS-5208',
    unit: 'Tim IT',
    annualLimit: 25000000,
    usedAmount: 0,
  },
  {
    id: 'kesiswaan',
    name: 'Kegiatan Siswa',
    code: 'POS-5401',
    unit: 'Kesiswaan',
    annualLimit: 30000000,
    usedAmount: 0,
  },
];

export const INITIAL_REQUESTS: FundRequest[] = [];


export function calculateRequestTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

export function getStatusLabel(req: FundRequest): string {
  if (req.status === 'disetujui') return 'Disetujui & Cair';
  if (req.status === 'revisi') return 'Perlu Revisi';
  switch (req.currentStageStep) {
    case 2:
      return 'Di Kasi Sarana';
    case 3:
      return 'Di Bendahara Sekolah';
    case 4:
      return 'Di Bendahara Umum';
    case 5:
      return 'Di Direktur SIT Qudwah';
    default:
      return 'Diproses';
  }
}

export const ROMAN_MONTHS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
] as const;

export function generateRequestCode(
  existingRequests: FundRequest[],
  date: Date = new Date()
): string {
  const maxSeq = existingRequests.reduce((max, req) => {
    const match = req.code.match(/^(\d+)\//);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > max) return parsed;
    }
    return max;
  }, existingRequests.length);

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  const romanMonth = ROMAN_MONTHS[date.getMonth()] || 'I';
  const year = date.getFullYear();
  return `${nextSeq}/PENG.DANA/SITQ/${romanMonth}/${year}`;
}

export function formatCurrentTimestamp(): string {
  const now = new Date();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${mins}`;
}
