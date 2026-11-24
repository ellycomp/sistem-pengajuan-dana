import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Plus,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  calculateRequestTotal,
  formatRupiah,
  generateRequestCode,
  getStatusLabel,
} from '../data/seedData';
import {
  BudgetLine,
  FundRequest,
  LineItem,
  RequestStatus,
  SchoolUnit,
  UserProfile,
} from '../types/kassekolah';
import { SchoolLogo } from './SchoolLogo';

interface DashboardRequestsViewProps {
  requests: FundRequest[];
  budgetLines: BudgetLine[];
  requestUnits: string[];
  onAddRequestUnit: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onEditRequestUnit: (oldName: string, newName: string) => Promise<{ ok: boolean; error?: string }>;
  onDeactivateRequestUnit: (name: string) => Promise<{ ok: boolean; error?: string }>;
  currentUser: UserProfile;
  onOpenDetail: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  onCreateRequest: (payload: {
    requesterRole: string;
    title: string;
    schoolUnit: SchoolUnit;
    budgetCategoryId: string;
    unit: string;
    targetDate: string;
    attachmentName: string;
    items: Omit<LineItem, 'id'>[];
  }) => void;
}

export function DashboardRequestsView({
  requests,
  budgetLines,
  requestUnits,
  onAddRequestUnit,
  onEditRequestUnit,
  onDeactivateRequestUnit,
  currentUser,
  onOpenDetail,
  onDeleteRequest,
  onCreateRequest,
}: DashboardRequestsViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>(
    'all'
  );
  const [schoolUnitFilter, setSchoolUnitFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [requestToDelete, setRequestToDelete] = useState<FundRequest | null>(null);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editedUnitName, setEditedUnitName] = useState<string>('');
  const [unitEditError, setUnitEditError] = useState<string>('');
  const [savingUnitEdit, setSavingUnitEdit] = useState<boolean>(false);
  const requesterRoleOptions = currentUser.name === 'Rosyidatul Alyah'
    ? ['Wali Kelas 1', 'Wakil Bidang Akademik']
    : currentUser.name === 'Eka Priyana'
    ? ['Guru Kelas PAUD', 'Wakil Bidang Sarpras']
    : [currentUser.title];
  const [requesterRole, setRequesterRole] = useState<string>(requesterRoleOptions[0]);

  // Create form state
  const [title, setTitle] = useState<string>('');
  const [schoolUnit, setSchoolUnit] = useState<string>(
    requestUnits.includes(currentUser.unit) ? currentUser.unit : (requestUnits[0] || '')
  );
  const [budgetCategoryId, setBudgetCategoryId] = useState<string>(
    budgetLines[0]?.id || 'atk'
  );
  const [unit, setUnit] = useState<string>(requestUnits.includes(currentUser.unit) ? currentUser.unit : (requestUnits[0] || ''));
  const [targetDate, setTargetDate] = useState<string>('30 Nov 2026');
  const [attachmentName, setAttachmentName] = useState<string>(
    'RAB_Pengajuan_Unit.pdf'
  );
  const [draftItems, setDraftItems] = useState<
    { name: string; quantity: number; unitLabel: string; unitPrice: number }[]
  >([{ name: '', quantity: 1, unitLabel: 'unit', unitPrice: 100000 }]);
  const [formError, setFormError] = useState<string>('');

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (schoolUnitFilter !== 'all' && req.unit !== schoolUnitFilter)
        return false;
      if (!q) return true;
      return (
        req.code.toLowerCase().includes(q) ||
        req.title.toLowerCase().includes(q) ||
        req.unit.toLowerCase().includes(q) ||
        req.unit.toLowerCase().includes(q) ||
        req.requesterName.toLowerCase().includes(q)
      );
    });
  }, [requests, searchQuery, statusFilter, schoolUnitFilter]);

  const stats = useMemo(() => {
    const pendingCount = requests.filter((r) => r.status === 'diproses').length;
    const revisiCount = requests.filter((r) => r.status === 'revisi').length;
    const approvedCount = requests.filter(
      (r) => r.status === 'disetujui'
    ).length;
    const totalPendingAmount = requests
      .filter((r) => r.status === 'diproses')
      .reduce((sum, r) => sum + calculateRequestTotal(r.items), 0);

    return {
      totalCount: requests.length,
      pendingCount,
      revisiCount,
      approvedCount,
      totalPendingAmount,
    };
  }, [requests]);

  const draftTotal = draftItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const handleAddDraftItem = () => {
    setDraftItems((prev) => [
      ...prev,
      { name: '', quantity: 1, unitLabel: 'buah', unitPrice: 50000 },
    ]);
  };

  const handleRemoveDraftItem = (idx: number) => {
    if (draftItems.length <= 1) return;
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateDraftItem = (
    idx: number,
    field: 'name' | 'quantity' | 'unitLabel' | 'unitPrice',
    value: string
  ) => {
    setDraftItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'quantity' || field === 'unitPrice') {
          return { ...item, [field]: Math.max(0, Number(value) || 0) };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Judul pengajuan wajib diisi.');
      return;
    }
    const validItems = draftItems.filter(
      (i) => i.name.trim() && i.quantity > 0 && i.unitPrice > 0
    );
    if (validItems.length === 0) {
      setFormError(
        'Minimal satu item barang dengan nama, jumlah, dan harga satuan valid.'
      );
      return;
    }

    onCreateRequest({
      requesterRole,
      title: title.trim(),
      schoolUnit,
      budgetCategoryId,
      unit: unit.trim() || currentUser.unit,
      targetDate: targetDate.trim() || '30 Nov 2026',
      attachmentName: attachmentName.trim() || 'RAB_Lampiran.pdf',
      items: validItems.map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity,
        unitLabel: i.unitLabel.trim() || 'unit',
        unitPrice: i.unitPrice,
      })),
    });

    setTitle('');
    setDraftItems([
      { name: '', quantity: 1, unitLabel: 'unit', unitPrice: 100000 },
    ]);
    setFormError('');
    setShowCreateModal(false);
  };

  const badgeStyle = (status: RequestStatus) => {
    if (status === 'disetujui') return 'bg-[#DCFCE7] text-[#14532D]';
    if (status === 'revisi') return 'bg-[#FFDAD6] text-[#410002]';
    return 'bg-[#FEF3C7] text-[#78350F]';
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
      {/* Desktop Header */}
      <header className="hidden lg:flex bg-[#FFFFFF] border-b border-[#BEC9C6] px-8 py-6 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-[28px] leading-[34px] tracking-[-0.25px] font-semibold text-[#191C1B] text-balance">
            Daftar Pengajuan Dana Sekolah
          </h1>
          <p className="font-body text-[14px] leading-[20px] text-[#3F4947] mt-1">
            Pantau status pengajuan 5 tahap dari unit pengaju hingga otorisasi
            Direktur SIT Qudwah
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2.5 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Ajukan Dana Baru</span>
        </button>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#BEC9C6] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SchoolLogo className="w-9 h-11" />
          <div className="min-w-0">
            <p className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947] truncate">
              SIT Qudwah Sungai Rengit
            </p>
            <h1 className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B] truncate">
              Pengajuan Dana
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-3 py-2 font-label text-[13px] font-semibold shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Ajukan</span>
        </button>
      </header>

      <main className="flex-1 px-4 lg:px-8 py-4 lg:py-6 max-w-7xl w-full mx-auto flex flex-col gap-4 lg:gap-6">
        {currentUser.role === 'direktur' && (
          <section className="rounded-[12px] border border-[#BEC9C6] bg-white p-4 flex flex-col gap-3">
            <div>
              <h2 className="font-headline text-[16px] font-semibold text-[#191C1B]">Kelola Unit Pengaju</h2>
              <p className="font-body text-[12px] text-[#3F4947]">Khusus Direktur. Menonaktifkan unit tidak menghapus riwayat pengajuan sebelumnya.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {requestUnits.map((unitName) => (
                <span key={unitName} className="inline-flex items-center gap-2 rounded-full bg-[#E8F2EF] px-3 py-1.5 text-[12px] font-medium text-[#00433C]">
                  {unitName}
                  <button type="button" aria-label={`Edit ${unitName}`} title="Edit nama unit" onClick={() => {
                    setEditingUnit(unitName);
                    setEditedUnitName(unitName);
                    setUnitEditError('');
                  }} className="inline-flex items-center justify-center rounded p-1 hover:bg-white"><Pencil className="w-3.5 h-3.5" aria-hidden="true" /></button>
                  <button type="button" aria-label={`Nonaktifkan ${unitName}`} onClick={async () => {
                    if (window.confirm(`Nonaktifkan unit "${unitName}"? Riwayat lama tetap ada.`)) {
                      const result = await onDeactivateRequestUnit(unitName);
                      if (!result.ok) window.alert(result.error || 'Unit gagal dinonaktifkan.');
                    }
                  }} className="font-bold text-[#9B1C1C]">×</button>
                </span>
              ))}
              <button type="button" onClick={async () => {
                const name = window.prompt('Masukkan nama Unit Pengaju baru:');
                if (name === null) return;
                const result = await onAddRequestUnit(name);
                if (!result.ok) window.alert(result.error || 'Unit gagal ditambahkan.');
              }} className="rounded-full border border-dashed border-[#00433C] px-3 py-1.5 text-[12px] font-semibold text-[#00433C]">+ Tambah Unit</button>
            </div>
          </section>
        )}

        {/* KPI Summary Strip */}
        <section
          aria-label="Ringkasan Pengajuan"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1">
            <span className="font-label text-[12px] font-medium text-[#3F4947]">
              Total Berkas
            </span>
            <span className="font-headline text-[24px] leading-[30px] font-semibold text-[#191C1B] tabular-nums">
              {stats.totalCount}
            </span>
          </div>
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1">
            <span className="font-label text-[12px] font-medium text-[#3F4947]">
              Dalam Proses
            </span>
            <span className="font-headline text-[24px] leading-[30px] font-semibold text-[#92400E] tabular-nums">
              {stats.pendingCount}
            </span>
          </div>
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1">
            <span className="font-label text-[12px] font-medium text-[#3F4947]">
              Perlu Revisi
            </span>
            <span className="font-headline text-[24px] leading-[30px] font-semibold text-[#BA1A1A] tabular-nums">
              {stats.revisiCount}
            </span>
          </div>
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1">
            <span className="font-label text-[12px] font-medium text-[#3F4947]">
              Dana Diproses
            </span>
            <span className="font-headline text-[20px] lg:text-[22px] leading-[30px] font-semibold text-[#00433C] tabular-nums truncate">
              {formatRupiah(stats.totalPendingAmount)}
            </span>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section
          aria-label="Filter Pengajuan"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-1 p-1 bg-[#ECEEEC] rounded-[8px] overflow-x-auto">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'diproses', label: 'Diproses' },
                { id: 'revisi', label: 'Perlu Revisi' },
                { id: 'disetujui', label: 'Disetujui' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-[6px] font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#FFFFFF] text-[#191C1B]'
                      : 'text-[#3F4947] hover:text-[#191C1B]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={schoolUnitFilter}
              onChange={(e) =>
                setSchoolUnitFilter(e.target.value)
              }
              aria-label="Filter unit yang mengajukan"
              className="rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 font-body text-[13px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
            >
              <option value="all">Semua Unit Sekolah</option>
              {requestUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <Search
                className="w-4 h-4 text-[#3F4947] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor surat atau judul..."
                aria-label="Cari pengajuan dana"
                className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] pl-9 pr-3 py-2 font-body text-[14px] text-[#191C1B] placeholder:text-[#3F4947] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
              />
            </div>
          </div>
        </section>

        {/* Desktop Table */}
        <section
          aria-label="Tabel Pengajuan Dana"
          className="hidden lg:block rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] overflow-hidden"
        >
          {filteredRequests.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center gap-3">
              <p className="font-title text-[16px] font-semibold text-[#191C1B]">
                {requests.length === 0
                  ? 'Belum ada data pengajuan dana'
                  : 'Tidak ada pengajuan yang cocok'}
              </p>
              <p className="font-body text-[14px] text-[#3F4947] max-w-md">
                {requests.length === 0
                  ? 'Seluruh daftar pengajuan saat ini masih kosong. Buat pengajuan dana baru untuk memulai alur persetujuan 5 tahap.'
                  : 'Ubah kata kunci pencarian, status, atau filter unit sekolah.'}
              </p>
              {requests.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-1 inline-flex items-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] font-semibold hover:bg-[#0F5C53]"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Ajukan Dana Baru</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSchoolUnitFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-1 inline-flex items-center gap-2 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] px-4 py-2 font-label text-[13px] font-semibold hover:bg-[#F2F4F2]"
                >
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#F2F4F2] border-b border-[#BEC9C6]">
                <tr>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947]">
                    Kode
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947]">
                    Judul Pengajuan
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947]">
                    Unit / Pos
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947]">
                    Tahap Saat Ini
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947] text-right">
                    Nominal
                  </th>
                  <th className="px-4 py-3 font-label text-[12px] font-semibold text-[#3F4947] text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C6]">
                {filteredRequests.map((req) => {
                  const total = calculateRequestTotal(req.items);
                  return (
                    <tr
                      key={req.id}
                      onClick={() => onOpenDetail(req.id)}
                      className="hover:bg-[#F8FAF8] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono text-[12px] font-medium text-[#3F4947] whitespace-nowrap">
                        {req.code}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-title text-[14px] font-semibold text-[#191C1B]">
                          {req.title}
                        </p>
                        <p className="font-body text-[12px] text-[#3F4947]">
                          {req.requesterName} · {req.submittedDate}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-body text-[13px] font-medium text-[#191C1B]">
                          {req.unit}
                        </p>
                        <p className="font-body text-[12px] text-[#3F4947]">
                          {req.unit} · {req.budgetCategoryName}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-label text-[12px] font-medium whitespace-nowrap ${badgeStyle(
                            req.status
                          )}`}
                        >
                          {getStatusLabel(req)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-label text-[14px] font-semibold text-[#191C1B] text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(total)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-3">
                          <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDetail(req.id); }} className="inline-flex items-center gap-1 font-label text-[13px] font-semibold text-[#00433C] hover:underline whitespace-nowrap">
                            <span>Detail Alur</span><ChevronRight className="w-4 h-4" aria-hidden="true" />
                          </button>
                          {req.requesterName === currentUser.name && req.status !== 'disetujui' && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setRequestToDelete(req); }} aria-label={`Hapus pengajuan ${req.code}`} className="inline-flex items-center gap-1 font-label text-[13px] font-semibold text-[#BA1A1A] hover:underline whitespace-nowrap">
                              <Trash2 className="w-4 h-4" aria-hidden="true" /><span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Mobile Card List */}
        <section
          aria-label="Daftar Pengajuan Mobile"
          className="lg:hidden flex flex-col gap-3"
        >
          {filteredRequests.length === 0 ? (
            <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-6 text-center flex flex-col items-center gap-2.5">
              <p className="font-title text-[15px] font-semibold text-[#191C1B]">
                {requests.length === 0
                  ? 'Belum ada data pengajuan dana'
                  : 'Tidak ada pengajuan ditemukan'}
              </p>
              <p className="font-body text-[13px] text-[#3F4947]">
                {requests.length === 0
                  ? 'Tekan tombol di bawah untuk membuat pengajuan dana baru.'
                  : 'Ubah kata kunci atau filter unit sekolah.'}
              </p>
              {requests.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Ajukan Dana Baru</span>
                </button>
              )}
            </div>
          ) : (
            filteredRequests.map((req) => {
              const total = calculateRequestTotal(req.items);
              return (
                <div key={req.id} className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-2">
                  <button type="button" onClick={() => onOpenDetail(req.id)} className="w-full text-left flex flex-col gap-2 hover:bg-[#F8FAF8] transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-medium text-[#3F4947] truncate max-w-[65%]">{req.code}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-label text-[11px] font-medium shrink-0 ${badgeStyle(req.status)}`}>{getStatusLabel(req)}</span>
                    </div>
                    <p className="font-title text-[16px] font-semibold text-[#191C1B]">{req.title}</p>
                    <div className="flex items-center justify-between gap-2 border-t border-[#BEC9C6] pt-2">
                      <span className="font-label text-[12px] text-[#3F4947] truncate">{req.unit} · {req.budgetCategoryName}</span>
                      <span className="font-label text-[14px] font-semibold text-[#00433C] tabular-nums shrink-0">{formatRupiah(total)}</span>
                    </div>
                  </button>
                  {req.requesterName === currentUser.name && req.status !== 'disetujui' && (
                    <div className="flex justify-end border-t border-[#BEC9C6] pt-2">
                      <button type="button" onClick={() => setRequestToDelete(req)} className="inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 font-label text-[12px] font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />Hapus Pengajuan
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* Modal Edit Unit Pengaju */}
      {editingUnit !== null && (
        <div className="fixed inset-0 z-[70] bg-[#191C1B]/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-unit-title">
          <form className="w-full max-w-md rounded-[12px] bg-white p-5 shadow-xl flex flex-col gap-4" onSubmit={async (e) => {
            e.preventDefault();
            const cleanName = editedUnitName.trim();
            if (!cleanName) { setUnitEditError('Nama unit wajib diisi.'); return; }
            if (cleanName === editingUnit) { setEditingUnit(null); return; }
            setSavingUnitEdit(true);
            setUnitEditError('');
            const result = await onEditRequestUnit(editingUnit, cleanName);
            setSavingUnitEdit(false);
            if (!result.ok) { setUnitEditError(result.error || 'Nama unit gagal diubah.'); return; }
            setEditingUnit(null);
          }}>
            <div>
              <h2 id="edit-unit-title" className="font-title text-[18px] font-semibold text-[#191C1B]">Edit Unit Pengaju</h2>
              <p className="mt-1 text-[13px] text-[#3F4947]">Ubah nama unit. Riwayat pengajuan sebelumnya tetap tersimpan.</p>
            </div>
            <input autoFocus type="text" value={editedUnitName} onChange={(e) => setEditedUnitName(e.target.value)} className="w-full rounded-[8px] border border-[#BEC9C6] px-3 py-2.5 text-[14px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]" />
            {unitEditError && <p role="alert" className="rounded-[8px] bg-[#FFDAD6] px-3 py-2 text-[13px] text-[#9B1C1C]">{unitEditError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={savingUnitEdit} onClick={() => setEditingUnit(null)} className="rounded-[8px] border border-[#BEC9C6] px-4 py-2 text-[13px] font-semibold">Batal</button>
              <button type="submit" disabled={savingUnitEdit} className="rounded-[8px] bg-[#00433C] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{savingUnitEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengajuan */}
      {requestToDelete && (
        <div className="fixed inset-0 z-[60] bg-[#191C1B]/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-request-title">
          <div className="w-full max-w-md rounded-[12px] border border-[#BEC9C6] bg-white p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5" aria-hidden="true" /></div>
              <div>
                <h2 id="delete-request-title" className="font-title text-[18px] font-semibold text-[#191C1B]">Hapus Pengajuan Dana?</h2>
                <p className="font-body text-[13px] text-[#3F4947] mt-1">Anda akan menghapus <strong>{requestToDelete.code} — {requestToDelete.title}</strong>. Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRequestToDelete(null)} className="rounded-[8px] border border-[#BEC9C6] px-4 py-2 font-label text-[13px] font-semibold text-[#191C1B] hover:bg-[#F2F4F2]">Batal</button>
              <button type="button" onClick={() => { onDeleteRequest(requestToDelete.id); setRequestToDelete(null); }} className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#BA1A1A] px-4 py-2 font-label text-[13px] font-semibold text-white hover:bg-[#991B1B]"><Trash2 className="w-4 h-4" aria-hidden="true" />Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajukan Dana Baru */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-[#191C1B]/45 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
        >
          <form
            onSubmit={handleSubmitCreate}
            className="w-full max-w-2xl rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-6 flex flex-col gap-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#BEC9C6] pb-3">
              <div>
                <h2
                  id="create-modal-title"
                  className="font-headline text-[20px] font-semibold text-[#191C1B]"
                >
                  Buat Pengajuan Dana Baru
                </h2>
                <p className="font-body text-[13px] text-[#3F4947]">
                  Pengajuan akan otomatis dikirim ke Tahap 2 (Kepala Seksi
                  Sarana)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Tutup form"
                className="w-8 h-8 inline-flex items-center justify-center rounded-[8px] text-[#3F4947] hover:bg-[#F2F4F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-[8px] bg-[#FFDAD6] text-[#410002] px-3 py-2 text-[13px] font-medium"
              >
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 rounded-[8px] border border-[#BEC9C6] bg-[#F2F4F2] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="font-label text-[12px] font-semibold text-[#3F4947]">
                  Nomor Pengajuan Otomatis
                </span>
                <span className="font-mono text-[13px] font-bold text-[#00433C]">
                  {generateRequestCode(requests)}
                </span>
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label
                  htmlFor="req-title"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Judul Kebutuhan Belanja
                </label>
                <input
                  id="req-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pembelian Modul Ajar Semester Genap"
                  className="w-full rounded-[8px] border border-[#BEC9C6] px-3 py-2 text-[14px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label
                  htmlFor="req-requester-role"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Mengajukan Sebagai
                </label>
                <select
                  id="req-requester-role"
                  value={requesterRole}
                  onChange={(e) => setRequesterRole(e.target.value)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] px-3 py-2 text-[14px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                >
                  {requesterRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="req-unit"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Unit Pengaju
                </label>
                <select
                  id="req-unit"
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); setSchoolUnit(e.target.value); }}
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-white px-3 py-2 text-[14px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                >
                  {requestUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="req-target"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Target Pakai
                </label>
                <input
                  id="req-target"
                  type="text"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  placeholder="30 Nov 2026"
                  className="w-full rounded-[8px] border border-[#BEC9C6] px-3 py-2 text-[14px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="req-attachment"
                  className="font-label text-[13px] font-semibold text-[#191C1B]"
                >
                  Nama Lampiran RAB
                </label>
                <input
                  id="req-attachment"
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  className="w-full rounded-[8px] border border-[#BEC9C6] px-3 py-2 text-[14px] text-[#191C1B] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
              </div>
            </div>

            {/* Rincian Item */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label text-[13px] font-semibold text-[#191C1B]">
                  Rincian Barang / Jasa
                </span>
                <button
                  type="button"
                  onClick={handleAddDraftItem}
                  className="inline-flex items-center gap-1 font-label text-[12px] font-semibold text-[#00433C] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {draftItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center rounded-[8px] bg-[#F2F4F2] p-2.5"
                  >
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        handleUpdateDraftItem(idx, 'name', e.target.value)
                      }
                      placeholder="Nama barang"
                      aria-label="Nama barang"
                      className="col-span-12 sm:col-span-5 rounded-[6px] border border-[#BEC9C6] bg-[#FFFFFF] px-2.5 py-1.5 text-[13px]"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateDraftItem(idx, 'quantity', e.target.value)
                      }
                      aria-label="Jumlah"
                      className="col-span-4 sm:col-span-2 rounded-[6px] border border-[#BEC9C6] bg-[#FFFFFF] px-2.5 py-1.5 text-[13px] tabular-nums"
                    />
                    <input
                      type="text"
                      value={item.unitLabel}
                      onChange={(e) =>
                        handleUpdateDraftItem(idx, 'unitLabel', e.target.value)
                      }
                      placeholder="satuan"
                      aria-label="Satuan"
                      className="col-span-4 sm:col-span-2 rounded-[6px] border border-[#BEC9C6] bg-[#FFFFFF] px-2.5 py-1.5 text-[13px]"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleUpdateDraftItem(idx, 'unitPrice', e.target.value)
                      }
                      aria-label="Harga satuan"
                      className="col-span-3 sm:col-span-2 rounded-[6px] border border-[#BEC9C6] bg-[#FFFFFF] px-2.5 py-1.5 text-[13px] tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftItem(idx)}
                      disabled={draftItems.length <= 1}
                      aria-label="Hapus baris"
                      className="col-span-1 inline-flex items-center justify-center w-8 h-8 rounded-[6px] text-[#3F4947] hover:bg-[#FFDAD6] hover:text-[#410002] disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#BEC9C6] pt-3">
              <div>
                <span className="font-label text-[12px] text-[#3F4947] block">
                  Total Pengajuan
                </span>
                <span className="font-headline text-[20px] font-semibold text-[#00433C] tabular-nums">
                  {formatRupiah(draftTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] px-4 py-2 font-label text-[14px] font-semibold hover:bg-[#F2F4F2]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] font-semibold hover:bg-[#0F5C53]"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
