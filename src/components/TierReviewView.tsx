import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileEdit,
  Inbox,
} from 'lucide-react';
import {
  calculateRequestTotal,
  formatRupiah,
  TIER_CONFIGS,
} from '../data/seedData';
import { FundRequest, TierKey } from '../types/kassekolah';
import { SchoolLogo } from './SchoolLogo';

interface TierReviewViewProps {
  requests: FundRequest[];
  currentUserName: string;
  selectedTier: TierKey;
  onSelectTier: (tier: TierKey) => void;
  onApproveStage: (requestId: string, note: string) => void;
  onRequestRevision: (requestId: string, note: string) => void;
  onOpenDetail: (requestId: string) => void;
}

export function TierReviewView({
  requests,
  currentUserName,
  selectedTier,
  onSelectTier,
  onApproveStage,
  onRequestRevision,
  onOpenDetail,
}: TierReviewViewProps) {
  const activeTier =
    TIER_CONFIGS.find((t) => t.key === selectedTier) || TIER_CONFIGS[0];

  const tierQueue = requests.filter(
    (r) => {
      const assignedReviewer = r.stages.find((stage) => stage.step === r.currentStageStep);
      return r.status === 'diproses' && r.currentStageStep === activeTier.stageStep && assignedReviewer?.personName === currentUserName;
    }
  );

  const totalPendingAllTiers = requests.filter(
    (r) => r.status === 'diproses'
  ).length;

  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    tierQueue[0]?.id || ''
  );
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({
    0: true,
  });
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Keep selectedRequestId valid when tier or queue changes
  useEffect(() => {
    if (!tierQueue.some((r) => r.id === selectedRequestId)) {
      setSelectedRequestId(tierQueue[0]?.id || '');
    }
    setCheckedItems({ 0: true });
    setNotes('');
    setValidationError('');
  }, [selectedTier, tierQueue.length]);

  const selectedRequest =
    tierQueue.find((r) => r.id === selectedRequestId) || tierQueue[0] || null;

  const handleToggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    setValidationError('');
    onApproveStage(selectedRequest.id, notes.trim());
    setNotes('');
  };

  const handleRevision = () => {
    if (!selectedRequest) return;
    if (!notes.trim()) {
      setValidationError(
        'Silakan isi Catatan Pemeriksa terlebih dahulu untuk alasan revisi.'
      );
      return;
    }
    setValidationError('');
    onRequestRevision(selectedRequest.id, notes.trim());
    setNotes('');
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
      {/* Desktop Header */}
      <header className="hidden lg:flex bg-[#FFFFFF] border-b border-[#BEC9C6] px-8 py-6 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-[28px] leading-[34px] tracking-[-0.25px] font-semibold text-[#191C1B] text-balance">
            Review &amp; Pengecekan Tiap Jenjang
          </h1>
          <p className="font-body text-[14px] leading-[20px] text-[#3F4947] mt-1">
            Pilih jenjang pemeriksa untuk memverifikasi kelayakan pengajuan dana
            belanja sekolah
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            role="status"
            className="inline-flex items-center rounded-full bg-[#FEF3C7] text-[#78350F] px-4 py-1 font-label text-[12px] leading-[16px] font-medium tabular-nums"
          >
            {totalPendingAllTiers} pengajuan menunggu tinjauan
          </span>
        </div>
      </header>

      {/* Mobile Sticky Header */}
      <header className="lg:hidden sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#BEC9C6] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SchoolLogo className="w-9 h-11" />
          <div className="min-w-0">
            <p className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947] truncate">
              SIT Qudwah Sungai Rengit
            </p>
            <h1 className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B] truncate">
              Review Tiap Jenjang
            </h1>
          </div>
        </div>
        <span
          role="status"
          className="inline-flex items-center rounded-full bg-[#FEF3C7] text-[#78350F] px-2.5 py-1 font-label text-[12px] leading-[16px] font-medium shrink-0 tabular-nums"
        >
          {tierQueue.length} Berkas
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 lg:px-8 py-4 lg:py-6 max-w-7xl w-full mx-auto flex flex-col gap-4 lg:gap-6">
        {/* Desktop: 4 Tier Selector Cards */}
        <section
          aria-label="Pilih Jenjang Pemeriksa"
          className="hidden lg:grid grid-cols-4 gap-3"
        >
          {TIER_CONFIGS.map((tier) => {
            const count = requests.filter(
              (r) => r.status === 'diproses' && r.currentStageStep === tier.stageStep
            ).length;
            const isActive = tier.key === selectedTier;

            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => onSelectTier(tier.key)}
                aria-pressed={isActive}
                className={`text-left rounded-[12px] border p-4 flex flex-col gap-1 transition-colors duration-150 ${
                  isActive
                    ? 'border-[#00433C] bg-[#CDE8E2] text-[#1D3531]'
                    : 'border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] hover:bg-[#F2F4F2]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-label text-[12px] leading-[16px] font-medium ${
                      isActive ? 'text-[#1D3531]' : 'text-[#3F4947]'
                    }`}
                  >
                    Jenjang {tier.tierNumber}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-label text-[12px] leading-[16px] font-medium tabular-nums ${
                      isActive
                        ? 'bg-[#00433C] text-[#FFFFFF]'
                        : 'bg-[#ECEEEC] text-[#3F4947]'
                    }`}
                  >
                    {count}
                  </span>
                </div>
                <p className="font-title text-[16px] leading-[22px] font-semibold">
                  {tier.title}
                </p>
                <p
                  className={`font-label text-[12px] leading-[16px] font-medium ${
                    isActive ? 'text-[#1D3531]' : 'text-[#3F4947]'
                  }`}
                >
                  {tier.subtitle}
                </p>
              </button>
            );
          })}
        </section>

        {/* Mobile: Horizontal Scrollable Tier Chips */}
        <section
          aria-label="Pilih Jenjang Pemeriksa Mobile"
          className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1"
        >
          {TIER_CONFIGS.map((tier) => {
            const count = requests.filter(
              (r) => r.status === 'diproses' && r.currentStageStep === tier.stageStep
            ).length;
            const isActive = tier.key === selectedTier;
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => onSelectTier(tier.key)}
                aria-pressed={isActive}
                className={`shrink-0 rounded-full px-4 py-1.5 font-label text-[12px] leading-[16px] font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#00433C] text-[#FFFFFF]'
                    : 'border border-[#BEC9C6] bg-[#FFFFFF] text-[#3F4947]'
                }`}
              >
                {tier.shortLabel} ({count})
              </button>
            );
          })}
        </section>

        {/* Desktop 2-Column Workspace & Mobile Stacked Workspace */}
        {tierQueue.length === 0 || !selectedRequest ? (
          <section className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#14532D] flex items-center justify-center">
              <Inbox className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="font-title text-[18px] font-semibold text-[#191C1B]">
              Tidak ada berkas di {activeTier.title}
            </h2>
            <p className="font-body text-[14px] text-[#3F4947] max-w-md">
              Semua pengajuan untuk jenjang {activeTier.role} telah selesai
              diperiksa. Pilih jenjang lain di atas untuk melihat antrean
              berikutnya.
            </p>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* Queue List (Left 5 cols on desktop, compact selector on mobile if >1) */}
            <section
              aria-label="Antrean Pemeriksaan"
              className="lg:col-span-5 rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#BEC9C6] pb-2">
                <h2 className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B]">
                  {activeTier.queueTitle}
                </h2>
                <span className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947] tabular-nums">
                  {tierQueue.length} berkas
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {tierQueue.map((item) => {
                  const isSelected = item.id === selectedRequest.id;
                  const itemTotal = calculateRequestTotal(item.items);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedRequestId(item.id);
                        setValidationError('');
                      }}
                      className={`w-full text-left rounded-[12px] border p-4 flex flex-col gap-1 transition-colors duration-150 ${
                        isSelected
                          ? 'border-[#00433C] bg-[#CDE8E2]'
                          : 'border-[#BEC9C6] bg-[#FFFFFF] hover:bg-[#F2F4F2]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] leading-[16px] font-medium text-[#3F4947]">
                          {item.code}
                        </span>
                        <span className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947] tabular-nums">
                          {item.submittedDate}
                        </span>
                      </div>
                      <p className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B]">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947] truncate">
                          {item.schoolUnit} · {item.budgetCategoryName}
                        </span>
                        <span className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B] tabular-nums shrink-0">
                          {formatRupiah(itemTotal)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Inspection Sheet (Right 7 cols on desktop) */}
            <section
              aria-label="Lembar Pemeriksaan Jenjang"
              className="lg:col-span-7 rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 lg:p-6 flex flex-col gap-5"
            >
              {/* Selected Item Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#BEC9C6] pb-4">
                <div>
                  <p className="font-mono text-[12px] leading-[16px] font-medium text-[#3F4947]">
                    {selectedRequest.code} · Diajukan{' '}
                    {selectedRequest.submittedDate}
                  </p>
                  <h2 className="font-headline text-[22px] leading-[28px] font-semibold text-[#191C1B] mt-1">
                    {selectedRequest.title}
                  </h2>
                  <p className="font-body text-[14px] leading-[20px] text-[#3F4947] mt-1">
                    {selectedRequest.schoolUnit} · Pengaju:{' '}
                    {selectedRequest.requesterName} ({selectedRequest.unit})
                  </p>
                </div>

                <div className="lg:text-right">
                  <p className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                    Total Pengajuan
                  </p>
                  <p className="font-headline text-[24px] lg:text-[28px] leading-[32px] font-semibold text-[#00433C] tabular-nums">
                    {formatRupiah(calculateRequestTotal(selectedRequest.items))}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenDetail(selectedRequest.id)}
                    className="inline-flex items-center gap-1 mt-1 font-label text-[12px] font-semibold text-[#00433C] hover:underline"
                  >
                    <span>Lihat Detail &amp; Alur 5 Tahap</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="flex flex-col gap-2">
                <h3 className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B]">
                  {activeTier.checklistTitle}
                </h3>
                <div className="flex flex-col gap-2.5 rounded-[8px] bg-[#F2F4F2] p-4">
                  {activeTier.checks.map((checkText, idx) => (
                    <label
                      key={checkText}
                      className="flex items-start gap-2.5 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checkedItems[idx])}
                        onChange={() => handleToggleCheck(idx)}
                        className="mt-0.5 w-4 h-4 rounded-[4px] border-[#BEC9C6] text-[#00433C] focus:ring-[#00433C]"
                      />
                      <span className="font-body text-[14px] leading-[20px] text-[#191C1B]">
                        {checkText}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="review-notes"
                  className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B]"
                >
                  Catatan Pemeriksa
                </label>
                <textarea
                  id="review-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="Tuliskan hasil pengecekan atau alasan revisi bila ada..."
                  className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] p-3 font-body text-[14px] leading-[20px] text-[#191C1B] placeholder:text-[#3F4947] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
                />
                {validationError && (
                  <p className="text-[12px] font-medium text-[#BA1A1A]">
                    {validationError}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:justify-end gap-2 border-t border-[#BEC9C6] pt-4">
                <button
                  type="button"
                  onClick={handleRevision}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] px-4 py-2 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#F2F4F2] whitespace-nowrap"
                >
                  <FileEdit className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Minta Revisi</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] whitespace-nowrap"
                >
                  <CheckCircle2
                    className="w-4 h-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="hidden lg:inline">
                    {activeTier.approveLabel}
                  </span>
                  <span className="lg:hidden">Setujui</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
