import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileEdit,
  FileText,
  Hourglass,
  Printer,
  RotateCcw,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  calculateRequestTotal,
  formatRupiah,
  getStatusLabel,
  TIER_CONFIGS,
} from '../data/seedData';
import { FundRequest, LineItem, RoleId, UserAccount } from '../types/kassekolah';
import { SchoolLogo } from './SchoolLogo';

type Html2PdfWorker = {
  set: (options: Record<string, unknown>) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  outputPdf: (type: 'blob') => Promise<Blob>;
};
type Html2PdfFactory = () => Html2PdfWorker;
declare global { interface Window { html2pdf?: Html2PdfFactory; } }
const loadHtml2Pdf = async (): Promise<Html2PdfFactory> => {
  if (window.html2pdf) return window.html2pdf;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Tidak dapat memuat pembuat PDF. Periksa koneksi internet.'));
    document.head.appendChild(script);
  });
  if (!window.html2pdf) throw new Error('Pembuat PDF tidak tersedia.');
  return window.html2pdf;
};

interface RequestDetailViewProps {
  request: FundRequest;
  currentRole: RoleId;
  currentUserName: string;
  accounts: UserAccount[];
  onBack: () => void;
  onApproveStage: (requestId: string, note: string) => void;
  onRequestRevision: (requestId: string, note: string) => void;
  onResubmit: (requestId: string) => void;
  onUpdateRevision: (requestId: string, updates: Pick<FundRequest, 'title' | 'targetDate' | 'attachmentName' | 'items'>) => Promise<{ ok: boolean; error?: string }>;
}

export function RequestDetailView({
  request,
  currentRole,
  currentUserName,
  accounts,
  onBack,
  onApproveStage,
  onRequestRevision,
  onResubmit,
  onUpdateRevision,
}: RequestDetailViewProps) {
  const [actionModal, setActionModal] = useState<'approve' | 'revisi' | null>(
    null
  );
  const [noteInput, setNoteInput] = useState<string>('');
  const [noteError, setNoteError] = useState<string>('');
  const [showAttachmentModal, setShowAttachmentModal] =
    useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showRevisionEditor, setShowRevisionEditor] = useState<boolean>(false);
  const [revisionSaveError, setRevisionSaveError] = useState('');
  const [savingRevision, setSavingRevision] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const pdfDocumentRef = useRef<HTMLDivElement>(null);
  const [revisionTitle, setRevisionTitle] = useState(request.title);
  const [revisionTargetDate, setRevisionTargetDate] = useState(request.targetDate);
  const [revisionAttachment, setRevisionAttachment] = useState(request.attachmentName);
  const [revisionItems, setRevisionItems] = useState<LineItem[]>(request.items.map((item) => ({ ...item })));

  const documentDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  const totalAmount = calculateRequestTotal(request.items);
  const isAboveTwoMillion = totalAmount > 2_000_000;
  const statusLabel = getStatusLabel(request);

  const stageBendaharaSekolah = request.stages.find((s) => s.step === 3);
  const stageBendaharaUmum = request.stages.find((s) => s.step === 4);
  const stageDirektur = request.stages.find((s) => s.step === 5);

  const treasurerSignerRoleLabel = isAboveTwoMillion
    ? 'Bendahara Umum'
    : 'Bendahara';
  const treasurerSignerSubLabel = isAboveTwoMillion
    ? 'Otorisasi di atas Rp 2.000.000'
    : 'Otorisasi maksimal Rp 2.000.000';
  const treasurerSignerName = isAboveTwoMillion
    ? stageBendaharaUmum?.personName || 'Bendahara Umum'
    : stageBendaharaSekolah?.personName || 'Bendahara Sekolah';
  const directorSignerName = stageDirektur?.personName || 'Direktur SIT Qudwah';
  const treasurerSignerRole = isAboveTwoMillion ? 'bendahara-umum' : 'bendahara-sekolah';
  const treasurerSignerNiy = accounts.find((account) => account.name === treasurerSignerName && account.role === treasurerSignerRole)?.niy || 'Belum tersedia';
  const directorSignerNiy = accounts.find((account) => account.name === directorSignerName && account.role === 'direktur')?.niy || 'Belum tersedia';
  const requesterSignerNiy = accounts.find((account) => account.name === request.requesterName)?.niy || 'Belum tersedia';

  const completedCount = request.stages.filter(
    (s) => s.state === 'done'
  ).length;
  const progressPercent =
    request.status === 'disetujui'
      ? 100
      : Math.round((completedCount / 5) * 100);

  const activeTierConfig = TIER_CONFIGS.find(
    (t) => t.stageStep === request.currentStageStep
  );
  const activeStage = request.stages.find((stage) => stage.step === request.currentStageStep);
  const canReviewCurrentStage = currentRole !== 'guru' && request.status === 'diproses' && activeStage?.personName === currentUserName;

  const primaryApproveLabel = activeTierConfig
    ? request.currentStageStep === 5
      ? 'Setujui Pencairan Dana'
      : `Teruskan ke ${activeTierConfig.nextStageLabel}`
    : 'Setujui';

  const activeStageSubtitle =
    request.status === 'disetujui'
      ? 'Seluruh 5 tahap telah disetujui · Dana siap dicairkan'
      : request.status === 'revisi'
      ? `Dikembalikan untuk revisi oleh ${request.revisionBy || 'Pemeriksa'}`
      : `Tahap ${request.currentStageStep} dari 5 · Menunggu pemeriksaan ${
          activeTierConfig?.role || 'Pemeriksa'
        }`;

  const handleOpenAction = (mode: 'approve' | 'revisi') => {
    setNoteInput('');
    setNoteError('');
    setActionModal(mode);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionModal === 'revisi' && !noteInput.trim()) {
      setNoteError('Tuliskan alasan atau poin revisi yang diperlukan.');
      return;
    }
    if (actionModal === 'approve') {
      onApproveStage(request.id, noteInput.trim());
    } else if (actionModal === 'revisi') {
      onRequestRevision(request.id, noteInput.trim());
    }
    setActionModal(null);
  };

  const badgeStyle =
    request.status === 'disetujui'
      ? 'bg-[#DCFCE7] text-[#14532D]'
      : request.status === 'revisi'
      ? 'bg-[#FFDAD6] text-[#410002]'
      : 'bg-[#FEF3C7] text-[#78350F]';

  return (
    <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
      {/* Desktop Contextual Header */}
      <header className="no-print hidden lg:flex bg-[#FFFFFF] border-b border-[#BEC9C6] px-8 py-6 flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali ke daftar pengajuan"
            className="inline-flex items-center justify-center w-10 h-10 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] hover:bg-[#F2F4F2] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] leading-[16px] font-medium text-[#3F4947]">
                {request.code}
              </span>
              <span
                role="status"
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-label text-[12px] leading-[16px] font-medium ${badgeStyle}`}
              >
                {statusLabel}
              </span>
            </div>
            <h1 className="font-headline text-[28px] leading-[34px] tracking-[-0.25px] font-semibold text-[#191C1B] mt-1 text-balance">
              {request.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className={`inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
              request.status === 'disetujui'
                ? 'bg-[#00433C] text-[#FFFFFF] hover:bg-[#0F5C53]'
                : 'border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] hover:bg-[#F2F4F2]'
            }`}
          >
            <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Cetak Lembar Tanda Tangan</span>
          </button>

          {canReviewCurrentStage && (
            <>
              <button
                type="button"
                onClick={() => handleOpenAction('revisi')}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] px-4 py-2 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#F2F4F2] whitespace-nowrap shrink-0"
              >
                <FileEdit className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Minta Revisi</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAction('approve')}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{primaryApproveLabel}</span>
              </button>
            </>
          )}

          {request.status === 'revisi' && (
            <>
            <button
              type="button"
              onClick={() => { setRevisionTitle(request.title); setRevisionTargetDate(request.targetDate); setRevisionAttachment(request.attachmentName); setRevisionItems(request.items.map((item) => ({ ...item }))); setShowRevisionEditor(true); }}
              className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#00433C] text-[#00433C] bg-white px-4 py-2 font-label text-[14px] leading-[20px] font-semibold hover:bg-[#E8F3F0] whitespace-nowrap shrink-0"
            >
              <FileEdit className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Revisi Pengajuan</span>
            </button>
            <button
              type="button"
              onClick={() => onResubmit(request.id)}
              className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] leading-[20px] font-semibold transition-colors duration-150 hover:bg-[#0F5C53] whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Ajukan Ulang Pengajuan</span>
            </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Sticky Contextual Header */}
      <header className="no-print lg:hidden sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#BEC9C6] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali"
            className="inline-flex items-center justify-center w-9 h-9 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <SchoolLogo className="w-8 h-10" />
          <div className="min-w-0">
            <p className="font-mono text-[12px] leading-[16px] font-medium text-[#3F4947] truncate">
              {request.code} · SIT Qudwah
            </p>
            <h1 className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B] truncate">
              Lacak Persetujuan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            aria-label="Cetak lembar tanda tangan"
            className="inline-flex items-center justify-center w-9 h-9 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B]"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
          </button>
          <span
            role="status"
            className={`inline-flex items-center rounded-full px-2.5 py-1 font-label text-[12px] leading-[16px] font-medium shrink-0 tabular-nums ${badgeStyle}`}
          >
            {request.status === 'disetujui'
              ? '5/5 Selesai'
              : request.status === 'revisi'
              ? 'Revisi'
              : `Tahap ${request.currentStageStep}/5`}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="no-print flex-1 px-4 lg:px-8 py-4 lg:py-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
        {/* Mobile Nominal Summary Card */}
        <section
          aria-label="Ringkasan Pengajuan Mobile"
          className="lg:hidden rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 flex flex-col gap-1"
        >
          <p className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
            {request.schoolUnit} · {request.budgetCategoryName}
          </p>
          <h2 className="font-title text-[18px] leading-[24px] font-semibold text-[#191C1B] text-balance">
            {request.title}
          </h2>
          <p className="font-display text-[28px] leading-[34px] tracking-[-0.25px] font-bold text-[#00433C] tabular-nums mt-1">
            {formatRupiah(totalAmount)}
          </p>
        </section>

        {/* Kolom Kiri (2/3): Alur Persetujuan 5 Tahap & Rincian Barang */}
        <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-6">
          {request.status === 'revisi' && request.revisionNote && (
            <div
              role="alert"
              className="rounded-[12px] border border-[#BA1A1A]/30 bg-[#FFDAD6] p-4 flex items-start gap-3"
            >
              <AlertCircle
                className="w-5 h-5 text-[#BA1A1A] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="font-title text-[15px] font-semibold text-[#410002]">
                  Catatan Revisi ({request.revisionBy})
                </p>
                <p className="font-body text-[14px] text-[#410002] mt-0.5">
                  {request.revisionNote}
                </p>
              </div>
            </div>
          )}

          {/* Kartu Alur Persetujuan Berjenjang SIT Qudwah */}
          <section
            aria-label="Alur Persetujuan Berjenjang"
            className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 lg:p-6 flex flex-col gap-4"
          >
            <header className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-title text-[16px] lg:text-[18px] leading-[24px] font-semibold text-[#191C1B]">
                  <span className="hidden lg:inline">
                    Alur Persetujuan Berjenjang
                  </span>
                  <span className="lg:hidden">Alur Persetujuan SIT Qudwah</span>
                </h2>
                <p className="hidden lg:block font-body text-[14px] leading-[20px] text-[#3F4947]">
                  {activeStageSubtitle}
                </p>
              </div>
              <span className="font-label text-[12px] leading-[16px] font-semibold text-[#00433C] tabular-nums shrink-0">
                {progressPercent}% selesai
              </span>
            </header>

            <ol className="flex flex-col gap-4">
              {request.stages.map((stage, index) => {
                const isLast = index === request.stages.length - 1;
                const isDone = stage.state === 'done';
                const isActive = stage.state === 'active';
                const isRevisi = stage.state === 'revisi';

                return (
                  <li key={stage.step} className="flex items-start gap-3 lg:gap-4">
                    {isDone ? (
                      <span className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#DCFCE7] text-[#14532D] flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" aria-hidden="true" />
                      </span>
                    ) : isActive ? (
                      <span className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#FEF3C7] text-[#78350F] flex items-center justify-center shrink-0">
                        <Hourglass className="w-4 h-4" aria-hidden="true" />
                      </span>
                    ) : isRevisi ? (
                      <span className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#FFDAD6] text-[#410002] flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-[#ECEEEC] text-[#3F4947] flex items-center justify-center shrink-0 font-label text-[13px] lg:text-[14px] font-semibold tabular-nums">
                        {stage.step}
                      </span>
                    )}

                    <div
                      className={`flex-1 min-w-0 ${
                        !isLast ? 'border-b border-[#BEC9C6] pb-3' : ''
                      } flex flex-wrap items-center justify-between gap-2`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`font-title text-[14px] lg:text-[16px] leading-[20px] lg:leading-[22px] font-semibold ${
                            isDone || isActive || isRevisi
                              ? 'text-[#191C1B]'
                              : 'text-[#3F4947]'
                          }`}
                        >
                          {stage.roleLabel}
                        </p>
                        <p
                          className={`font-body text-[12px] lg:text-[14px] leading-[18px] lg:leading-[20px] ${
                            isActive
                              ? 'text-[#78350F] lg:text-[#3F4947]'
                              : isRevisi
                              ? 'text-[#410002]'
                              : 'text-[#3F4947]'
                          }`}
                        >
                          {stage.personName}
                          {stage.step === 1 ? ` · ${stage.personTitle}` : ''}
                          {stage.note ? ` · ${stage.note}` : ''}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isDone && stage.timestamp && (
                          <span className="font-label text-[12px] leading-[16px] font-medium text-[#14532D] tabular-nums">
                            {stage.timestamp}
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center rounded-full bg-[#FEF3C7] text-[#78350F] px-2.5 py-0.5 font-label text-[12px] leading-[16px] font-medium">
                            Sedang Ditinjau
                          </span>
                        )}
                        {isRevisi && (
                          <span className="inline-flex items-center rounded-full bg-[#FFDAD6] text-[#410002] px-2.5 py-0.5 font-label text-[12px] leading-[16px] font-medium">
                            Perlu Revisi
                          </span>
                        )}
                        {stage.state === 'pending' && (
                          <span className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                            Menunggu
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Rincian Item Belanja */}
          <section
            aria-label="Rincian Item Belanja"
            className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 lg:p-6 flex flex-col gap-4"
          >
            <h2 className="font-title text-[16px] lg:text-[18px] leading-[24px] font-semibold text-[#191C1B]">
              Rincian Belanja yang Diajukan
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#F2F4F2] border-b border-[#BEC9C6]">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 lg:px-4 py-2.5 font-label text-[12px] leading-[16px] font-semibold text-[#3F4947]"
                    >
                      Nama Barang
                    </th>
                    <th
                      scope="col"
                      className="px-3 lg:px-4 py-2.5 font-label text-[12px] leading-[16px] font-semibold text-[#3F4947] text-right"
                    >
                      Jumlah
                    </th>
                    <th
                      scope="col"
                      className="px-3 lg:px-4 py-2.5 font-label text-[12px] leading-[16px] font-semibold text-[#3F4947] text-right"
                    >
                      Harga Satuan
                    </th>
                    <th
                      scope="col"
                      className="px-3 lg:px-4 py-2.5 font-label text-[12px] leading-[16px] font-semibold text-[#3F4947] text-right"
                    >
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BEC9C6]">
                  {request.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 lg:px-4 py-2.5 font-body text-[14px] leading-[20px] text-[#191C1B]">
                        {item.name}
                      </td>
                      <td className="px-3 lg:px-4 py-2.5 font-body text-[14px] leading-[20px] text-[#3F4947] text-right tabular-nums whitespace-nowrap">
                        {item.quantity} {item.unitLabel}
                      </td>
                      <td className="px-3 lg:px-4 py-2.5 font-body text-[14px] leading-[20px] text-[#3F4947] text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="px-3 lg:px-4 py-2.5 font-label text-[14px] leading-[20px] font-semibold text-[#191C1B] text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-[#BEC9C6] bg-[#F2F4F2]">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 lg:px-4 py-3 font-title text-[15px] lg:text-[16px] font-semibold text-[#191C1B]"
                    >
                      Total Pengajuan
                    </td>
                    <td className="px-3 lg:px-4 py-3 font-title text-[16px] lg:text-[18px] font-semibold text-[#00433C] text-right tabular-nums whitespace-nowrap">
                      {formatRupiah(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        {/* Kolom Kanan (1/3): Ringkasan Dokumen & Lampiran */}
        <aside
          aria-label="Informasi Pengajuan"
          className="flex flex-col gap-4"
        >
          <div className="rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-4 lg:p-6 flex flex-col gap-4">
            <h2 className="font-title text-[16px] leading-[22px] font-semibold text-[#191C1B]">
              Ringkasan Pengajuan
            </h2>
            <dl className="flex flex-col gap-3">
              <div className="flex justify-between gap-2 border-b border-[#BEC9C6] pb-2">
                <dt className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                  Unit yang Mengajukan
                </dt>
                <dd className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B] text-right">
                  {request.schoolUnit}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#BEC9C6] pb-2">
                <dt className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                  Pos Anggaran
                </dt>
                <dd className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B] text-right">
                  {request.budgetCategoryName}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#BEC9C6] pb-2">
                <dt className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                  Bagian Pengaju
                </dt>
                <dd className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B] text-right">
                  {request.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-[#BEC9C6] pb-2">
                <dt className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                  Target Pakai
                </dt>
                <dd className="font-label text-[14px] leading-[20px] font-semibold text-[#191C1B] tabular-nums text-right">
                  {request.targetDate}
                </dd>
              </div>
              <div className="flex justify-between items-center gap-2 border-b border-[#BEC9C6] pb-2">
                <dt className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                  Lampiran RAB
                </dt>
                <dd>
                  <button
                    type="button"
                    onClick={() => setShowAttachmentModal(true)}
                    className="inline-flex items-center gap-1 font-label text-[14px] leading-[20px] font-semibold text-[#00433C] hover:underline text-right"
                  >
                    <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{request.attachmentName}</span>
                  </button>
                </dd>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <dt className="font-label text-[12px] leading-[16px] font-medium text-[#3F4947]">
                  Penandatangan Lembar Cetak
                </dt>
                <dd className="font-body text-[13px] text-[#191C1B]">
                  Pengaju, {treasurerSignerRoleLabel} (
                  {isAboveTwoMillion ? '> Rp 2 jt' : '≤ Rp 2 jt'}), &amp;
                  Direktur
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </main>

      {/* Mobile Sticky Bottom Action Bar */}
      {canReviewCurrentStage && (
        <footer className="no-print lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-[#FFFFFF] border-t border-[#BEC9C6] p-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleOpenAction('revisi')}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] px-4 py-2.5 font-label text-[14px] font-semibold"
          >
            <span>Minta Revisi</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAction('approve')}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2.5 font-label text-[14px] font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Setujui</span>
          </button>
        </footer>
      )}

      {request.status === 'revisi' && (
        <footer className="no-print lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-[#FFFFFF] border-t border-[#BEC9C6] p-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setRevisionTitle(request.title); setRevisionTargetDate(request.targetDate); setRevisionAttachment(request.attachmentName); setRevisionItems(request.items.map((item) => ({ ...item }))); setShowRevisionEditor(true); }}
            className="w-full inline-flex items-center justify-center gap-1 rounded-[8px] border border-[#00433C] text-[#00433C] bg-white px-3 py-2.5 font-label text-[13px] font-semibold"
          >
            <FileEdit className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Revisi</span>
          </button>
          <button
            type="button"
            onClick={() => onResubmit(request.id)}
            className="w-full inline-flex items-center justify-center gap-1 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-3 py-2.5 font-label text-[13px] font-semibold"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ajukan Ulang</span>
          </button>
        </footer>
      )}

      {request.status === 'disetujui' && (
        <footer className="no-print lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-[#FFFFFF] border-t border-[#BEC9C6] p-3">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2.5 font-label text-[14px] font-semibold"
          >
            <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Cetak Lembar Tanda Tangan</span>
          </button>
        </footer>
      )}

      {/* Modal Konfirmasi Persetujuan / Revisi */}
      {actionModal && (
        <div
          className="no-print fixed inset-0 z-50 bg-[#191C1B]/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
        >
          <form
            onSubmit={handleConfirmAction}
            className="w-full max-w-md rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-6 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  id="action-modal-title"
                  className="font-title text-[18px] font-semibold text-[#191C1B]"
                >
                  {actionModal === 'approve'
                    ? 'Konfirmasi Persetujuan Jenjang'
                    : 'Permintaan Revisi Pengajuan'}
                </h3>
                <p className="font-body text-[13px] text-[#3F4947] mt-0.5">
                  {request.code} · {request.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                aria-label="Tutup dialog"
                className="w-8 h-8 inline-flex items-center justify-center rounded-[8px] text-[#3F4947] hover:bg-[#F2F4F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="modal-note"
                className="font-label text-[14px] font-semibold text-[#191C1B]"
              >
                {actionModal === 'approve'
                  ? 'Catatan Pemeriksa (Opsional)'
                  : 'Alasan Revisi (Wajib diisi)'}
              </label>
              <textarea
                id="modal-note"
                rows={3}
                value={noteInput}
                onChange={(e) => {
                  setNoteInput(e.target.value);
                  setNoteError('');
                }}
                placeholder={
                  actionModal === 'approve'
                    ? 'Contoh: Anggaran tersedia, silakan diteruskan...'
                    : 'Tuliskan bagian rincian atau lampiran yang perlu diperbaiki...'
                }
                className="w-full rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] p-3 font-body text-[14px] text-[#191C1B] placeholder:text-[#3F4947] focus:border-[#00433C] focus:outline-none focus:ring-1 focus:ring-[#00433C]"
              />
              {noteError && (
                <p className="text-[12px] font-medium text-[#BA1A1A]">
                  {noteError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#191C1B] px-4 py-2 font-label text-[14px] font-semibold hover:bg-[#F2F4F2]"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`rounded-[8px] px-4 py-2 font-label text-[14px] font-semibold text-[#FFFFFF] ${
                  actionModal === 'approve'
                    ? 'bg-[#00433C] hover:bg-[#0F5C53]'
                    : 'bg-[#BA1A1A] hover:bg-[#93000A]'
                }`}
              >
                {actionModal === 'approve'
                  ? primaryApproveLabel
                  : 'Kirim Permintaan Revisi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Pratinjau Lampiran RAB */}
      {showAttachmentModal && (
        <div
          className="no-print fixed inset-0 z-50 bg-[#191C1B]/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rab-modal-title"
        >
          <div className="w-full max-w-lg rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2 border-b border-[#BEC9C6] pb-3">
              <div className="flex items-center gap-2.5">
                <FileText
                  className="w-5 h-5 text-[#00433C] shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <h3
                    id="rab-modal-title"
                    className="font-title text-[16px] font-semibold text-[#191C1B]"
                  >
                    {request.attachmentName}
                  </h3>
                  <p className="font-label text-[12px] text-[#3F4947]">
                    Dokumen Pendukung · {request.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                aria-label="Tutup lampiran"
                className="w-8 h-8 inline-flex items-center justify-center rounded-[8px] text-[#3F4947] hover:bg-[#F2F4F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-[8px] border border-[#BEC9C6] bg-[#F8FAF8] p-4 flex flex-col gap-3">
              <div className="flex justify-between text-[13px] border-b border-[#BEC9C6] pb-2">
                <span className="text-[#3F4947]">Unit Sekolah</span>
                <span className="font-semibold text-[#191C1B]">
                  {request.schoolUnit}
                </span>
              </div>
              <div className="flex justify-between text-[13px] border-b border-[#BEC9C6] pb-2">
                <span className="text-[#3F4947]">Pengaju</span>
                <span className="font-semibold text-[#191C1B]">
                  {request.requesterName} ({request.unit})
                </span>
              </div>
              <div className="flex justify-between text-[13px] border-b border-[#BEC9C6] pb-2">
                <span className="text-[#3F4947]">Jumlah Item</span>
                <span className="font-semibold text-[#191C1B] tabular-nums">
                  {request.items.length} jenis barang
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="font-semibold text-[#191C1B]">
                  Estimasi Total RAB
                </span>
                <span className="font-bold text-[#00433C] tabular-nums">
                  {formatRupiah(totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAttachmentModal(false)}
              className="w-full rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[14px] font-semibold hover:bg-[#0F5C53]"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Cetak Hasil Akhir Pengajuan */}
      {showPrintModal && (
        <div
          className="no-print fixed inset-0 z-50 bg-[#191C1B]/55 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-modal-title"
        >
          <div className="w-full max-w-4xl rounded-[12px] border border-[#BEC9C6] bg-[#FFFFFF] flex flex-col max-h-[92vh] overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-[#BEC9C6] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAF8]">
              <div>
                <h3
                  id="print-modal-title"
                  className="font-headline text-[18px] font-semibold text-[#191C1B]"
                >
                  Pratinjau Cetak Hasil Akhir Pengajuan
                </h3>
                <p className="font-body text-[13px] text-[#3F4947]">
                  Total {formatRupiah(totalAmount)} ({treasurerSignerSubLabel})
                  · Penandatangan: Pengaju, {treasurerSignerRoleLabel}, &amp;
                  Direktur
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={generatingPdf}
                  onClick={async () => {
                    if (!pdfDocumentRef.current) {
                      setPdfMessage('Dokumen belum siap dibuat menjadi PDF.');
                      return;
                    }
                    setGeneratingPdf(true);
                    setPdfMessage('Sedang membuat PDF...');
                    try {
                      const html2pdf = await loadHtml2Pdf();
                      const blob = await html2pdf().set({
                        margin: [8, 8, 8, 8],
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                        pagebreak: { mode: ['css', 'legacy'] },
                      }).from(pdfDocumentRef.current).outputPdf('blob');
                      const safeCode = request.code.replace(/[^a-zA-Z0-9-_]/g, '_');
                      const datePart = new Date().toISOString().slice(0, 10);
                      const fileName = `Pengajuan_${safeCode}_${datePart}.pdf`;
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = fileName;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(url);
                      setPdfMessage('PDF berhasil dibuat dan diunduh. Silakan unggah ke folder arsip Google Drive.');
                    } catch (error) {
                      setPdfMessage(error instanceof Error ? error.message : 'Gagal membuat PDF.');
                    } finally {
                      setGeneratingPdf(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[#00433C] text-[#00433C] px-4 py-2 font-label text-[13px] font-semibold hover:bg-[#E8F2EF] disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>{generatingPdf ? 'Membuat PDF...' : 'Unduh PDF Pengajuan'}</span>
                </button>
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold hover:bg-[#0F5C53]"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>Buka Google Drive</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[#00433C] text-[#FFFFFF] px-4 py-2 font-label text-[13px] font-semibold hover:bg-[#0F5C53]"
                >
                  <Printer className="w-4 h-4" aria-hidden="true" />
                  <span>Cetak Manual / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  aria-label="Tutup pratinjau cetak"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-[8px] border border-[#BEC9C6] bg-[#FFFFFF] text-[#3F4947] hover:bg-[#F2F4F2]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {pdfMessage && (
                <div role="status" className="px-6 pb-3 text-[12px] text-[#00433C]">
                  <p>{pdfMessage}</p>
                  <p className="mt-1">Setelah PDF terunduh, buka Google Drive, masuk ke folder arsip pengajuan dana SIT Qudwah, lalu unggah file PDF tersebut.</p>
                </div>
              )}
            </div>

            <div className="p-4 lg:p-6 overflow-y-auto bg-[#ECEEEC]">
              <div ref={pdfDocumentRef} className="bg-[#FFFFFF] border border-[#BEC9C6] p-6 lg:p-8 mx-auto max-w-[210mm] text-[#191C1B]">
                {/* Formal Document Preview */}
                <div className="flex items-center justify-between border-b-2 border-[#00433C] pb-4 mb-5 gap-4">
                  <div className="flex items-center gap-3">
                    <SchoolLogo className="w-12 h-14" />
                    <div>
                      <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-[#00433C]">
                        Yayasan Keluarga Kita Sungai Rengit
                      </p>
                      <h4 className="font-headline text-[18px] font-bold text-[#191C1B]">
                        SIT Qudwah Sungai Rengit
                      </h4>
                      <p className="font-body text-[12px] text-[#3F4947]">
                        Sistem Pengajuan Dana Sekolah
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-label text-[11px] font-semibold uppercase text-[#3F4947]">
                      Nomor Berkas
                    </p>
                    <p className="font-mono text-[13px] font-bold text-[#191C1B] whitespace-nowrap">
                      {request.code}
                    </p>
                    <p className="font-label text-[12px] font-semibold text-[#00433C] mt-0.5">
                      {statusLabel}
                    </p>
                  </div>
                </div>

                <h5 className="text-center font-headline text-[16px] font-bold uppercase tracking-wide text-[#191C1B] mb-4">
                  Lembar Hasil Akhir Pengajuan Dana Belanja
                </h5>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-[#BEC9C6] rounded-[8px] p-3.5 mb-5 text-[13px]">
                  <div>
                    <span className="text-[#3F4947]">Judul Pengajuan:</span>{' '}
                    <span className="font-semibold text-[#191C1B]">
                      {request.title}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#3F4947]">Unit Sekolah:</span>{' '}
                    <span className="font-semibold text-[#191C1B]">
                      {request.schoolUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#3F4947]">Pengaju:</span>{' '}
                    <span className="font-semibold text-[#191C1B]">
                      {request.requesterName} ({request.unit})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#3F4947]">Pos Anggaran:</span>{' '}
                    <span className="font-semibold text-[#191C1B]">
                      {request.budgetCategoryName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#3F4947]">Tanggal Pengajuan:</span>{' '}
                    <span className="font-semibold text-[#191C1B]">
                      {request.submittedDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#3F4947]">Target Pakai:</span>{' '}
                    <span className="font-semibold text-[#191C1B]">
                      {request.targetDate}
                    </span>
                  </div>
                </div>

                <table className="w-full border-collapse border border-[#BEC9C6] text-[13px] mb-5">
                  <thead className="bg-[#F2F4F2]">
                    <tr>
                      <th className="border border-[#BEC9C6] px-2.5 py-2 text-center w-10">
                        No
                      </th>
                      <th className="border border-[#BEC9C6] px-3 py-2 text-left">
                        Nama Barang / Kebutuhan
                      </th>
                      <th className="border border-[#BEC9C6] px-3 py-2 text-right">
                        Jumlah
                      </th>
                      <th className="border border-[#BEC9C6] px-3 py-2 text-right">
                        Harga Satuan
                      </th>
                      <th className="border border-[#BEC9C6] px-3 py-2 text-right">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="border border-[#BEC9C6] px-2.5 py-2 text-center tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="border border-[#BEC9C6] px-3 py-2">
                          {item.name}
                        </td>
                        <td className="border border-[#BEC9C6] px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {item.quantity} {item.unitLabel}
                        </td>
                        <td className="border border-[#BEC9C6] px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {formatRupiah(item.unitPrice)}
                        </td>
                        <td className="border border-[#BEC9C6] px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatRupiah(item.quantity * item.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F2F4F2]">
                      <td
                        colSpan={4}
                        className="border border-[#BEC9C6] px-3 py-2.5 font-bold text-right"
                      >
                        TOTAL PENGAJUAN DANA
                      </td>
                      <td className="border border-[#BEC9C6] px-3 py-2.5 text-right font-bold text-[#00433C] tabular-nums whitespace-nowrap">
                        {formatRupiah(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mb-5 text-[12px] text-[#3F4947]">
                  <p className="font-semibold text-[#191C1B] mb-1">
                    Ketentuan Otorisasi Tanda Tangan:
                  </p>
                  <p>
                    {isAboveTwoMillion
                      ? 'Total pengajuan di atas Rp 2.000.000 ditandatangani oleh Pengaju, Bendahara Umum, dan Direktur SIT Qudwah.'
                      : 'Total pengajuan maksimal Rp 2.000.000 ditandatangani oleh Pengaju, Bendahara, dan Direktur SIT Qudwah.'}
                  </p>
                </div>

                <p className="text-right text-[12px] text-[#191C1B] mb-4">
                  Sungai Rengit, {documentDate}
                </p>

                <div className="grid grid-cols-3 gap-4 text-center text-[13px]">
                  <div className="flex flex-col items-center">
                    <p className="font-medium text-[#3F4947]">Pengaju,</p>
                    <p className="font-semibold text-[#191C1B]">
                      {request.unit}
                    </p>
                    <div className="h-20" />
                    <p className="font-semibold text-[#191C1B] underline">
                      {request.requesterName}
                    </p>
                    <p className="text-[11px] text-[#3F4947]">NIY: {requesterSignerNiy}</p>
                    <p className="text-[11px] text-[#3F4947]">
                      {request.requesterRole}
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <p className="font-medium text-[#3F4947]">
                      Mengetahui / Menyetujui,
                    </p>
                    <p className="font-semibold text-[#191C1B]">
                      {treasurerSignerRoleLabel}
                    </p>
                    <div className="h-20" />
                    <p className="font-semibold text-[#191C1B] underline">
                      {treasurerSignerName}
                    </p>
                    <p className="text-[11px]">NIY: {treasurerSignerNiy}</p>
                    <p className="text-[11px] text-[#3F4947]">
                      {treasurerSignerSubLabel}
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <p className="font-medium text-[#3F4947]">Menyetujui,</p>
                    <p className="font-semibold text-[#191C1B]">
                      Direktur SIT Qudwah
                    </p>
                    <div className="h-20" />
                    <p className="font-semibold text-[#191C1B] underline">
                      {directorSignerName}
                    </p>
                    <p className="text-[11px]">NIY: {directorSignerNiy}</p>
                    <p className="text-[11px] text-[#3F4947]">
                      Direktur SIT Qudwah Sungai Rengit
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated A4 Print-Only Sheet (Rendered exclusively when printing) */}
      <div className="hidden print:block print-only bg-[#FFFFFF] text-[#000000]">
        <div className="flex items-center justify-between border-b-2 border-[#00433C] pb-4 mb-5 gap-4">
          <div className="flex items-center gap-3">
            <SchoolLogo className="w-12 h-14" />
            <div>
              <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-[#00433C]">
                Yayasan Keluarga Kita Sungai Rengit
              </p>
              <h1 className="font-headline text-[18px] font-bold text-[#191C1B]">
                SIT Qudwah Sungai Rengit
              </h1>
              <p className="font-body text-[12px] text-[#3F4947]">
                Sistem Pengajuan Dana Sekolah
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-label text-[11px] font-semibold uppercase text-[#3F4947]">
              Nomor Berkas
            </p>
            <p className="font-mono text-[13px] font-bold text-[#191C1B] whitespace-nowrap">
              {request.code}
            </p>
            <p className="font-label text-[12px] font-semibold text-[#00433C] mt-0.5">
              {statusLabel}
            </p>
          </div>
        </div>

        <h2 className="text-center font-headline text-[16px] font-bold uppercase tracking-wide text-[#191C1B] mb-4">
          Lembar Hasil Akhir Pengajuan Dana Belanja
        </h2>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-[#BEC9C6] rounded-[8px] p-3.5 mb-5 text-[13px]">
          <div>
            <span className="text-[#3F4947]">Judul Pengajuan:</span>{' '}
            <span className="font-semibold text-[#191C1B]">
              {request.title}
            </span>
          </div>
          <div>
            <span className="text-[#3F4947]">Unit Sekolah:</span>{' '}
            <span className="font-semibold text-[#191C1B]">
              {request.schoolUnit}
            </span>
          </div>
          <div>
            <span className="text-[#3F4947]">Pengaju:</span>{' '}
            <span className="font-semibold text-[#191C1B]">
              {request.requesterName} ({request.unit})
            </span>
          </div>
          <div>
            <span className="text-[#3F4947]">Pos Anggaran:</span>{' '}
            <span className="font-semibold text-[#191C1B]">
              {request.budgetCategoryName}
            </span>
          </div>
          <div>
            <span className="text-[#3F4947]">Tanggal Pengajuan:</span>{' '}
            <span className="font-semibold text-[#191C1B]">
              {request.submittedDate}
            </span>
          </div>
          <div>
            <span className="text-[#3F4947]">Target Pakai:</span>{' '}
            <span className="font-semibold text-[#191C1B]">
              {request.targetDate}
            </span>
          </div>
        </div>

        <table className="w-full border-collapse border border-[#BEC9C6] text-[13px] mb-5">
          <thead className="bg-[#F2F4F2]">
            <tr>
              <th className="border border-[#BEC9C6] px-2.5 py-2 text-center w-10">
                No
              </th>
              <th className="border border-[#BEC9C6] px-3 py-2 text-left">
                Nama Barang / Kebutuhan
              </th>
              <th className="border border-[#BEC9C6] px-3 py-2 text-right">
                Jumlah
              </th>
              <th className="border border-[#BEC9C6] px-3 py-2 text-right">
                Harga Satuan
              </th>
              <th className="border border-[#BEC9C6] px-3 py-2 text-right">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-[#BEC9C6] px-2.5 py-2 text-center tabular-nums">
                  {idx + 1}
                </td>
                <td className="border border-[#BEC9C6] px-3 py-2">
                  {item.name}
                </td>
                <td className="border border-[#BEC9C6] px-3 py-2 text-right tabular-nums whitespace-nowrap">
                  {item.quantity} {item.unitLabel}
                </td>
                <td className="border border-[#BEC9C6] px-3 py-2 text-right tabular-nums whitespace-nowrap">
                  {formatRupiah(item.unitPrice)}
                </td>
                <td className="border border-[#BEC9C6] px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap">
                  {formatRupiah(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F2F4F2]">
              <td
                colSpan={4}
                className="border border-[#BEC9C6] px-3 py-2.5 font-bold text-right"
              >
                TOTAL PENGAJUAN DANA
              </td>
              <td className="border border-[#BEC9C6] px-3 py-2.5 text-right font-bold text-[#00433C] tabular-nums whitespace-nowrap">
                {formatRupiah(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mb-5 text-[12px] text-[#3F4947]">
          <p className="font-semibold text-[#191C1B] mb-1">
            Ringkasan Verifikasi Sistem &amp; Ketentuan Otorisasi:
          </p>
          <p>
            {isAboveTwoMillion
              ? 'Total pengajuan di atas Rp 2.000.000 ditandatangani oleh Pengaju, Bendahara Umum, dan Direktur SIT Qudwah.'
              : 'Total pengajuan maksimal Rp 2.000.000 ditandatangani oleh Pengaju, Bendahara, dan Direktur SIT Qudwah.'}
          </p>
        </div>

        <p className="text-right text-[12px] text-[#191C1B] mb-4">
          Sungai Rengit, {documentDate}
        </p>

        <div className="grid grid-cols-3 gap-4 text-center text-[13px]">
          <div className="flex flex-col items-center">
            <p className="font-medium text-[#3F4947]">Pengaju,</p>
            <p className="font-semibold text-[#191C1B]">{request.unit}</p>
            <div className="h-20" />
            <p className="font-semibold text-[#191C1B] underline">
              {request.requesterName}
            </p>
            <p className="text-[11px] text-[#3F4947]">NIY: {requesterSignerNiy}</p>
            <p className="text-[11px] text-[#3F4947]">
              {request.requesterRole}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <p className="font-medium text-[#3F4947]">
              Mengetahui / Menyetujui,
            </p>
            <p className="font-semibold text-[#191C1B]">
              {treasurerSignerRoleLabel}
            </p>
            <div className="h-20" />
            <p className="font-semibold text-[#191C1B] underline">
              {treasurerSignerName}
            </p>
            <p className="text-[11px]">NIY: {treasurerSignerNiy}</p>
            <p className="text-[11px] text-[#3F4947]">
              {treasurerSignerSubLabel}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <p className="font-medium text-[#3F4947]">Menyetujui,</p>
            <p className="font-semibold text-[#191C1B]">Direktur SIT Qudwah</p>
            <div className="h-20" />
            <p className="font-semibold text-[#191C1B] underline">
              {directorSignerName}
            </p>
            <p className="text-[11px]">NIY: {directorSignerNiy}</p>
            <p className="text-[11px] text-[#3F4947]">
              Direktur SIT Qudwah Sungai Rengit
            </p>
          </div>
        </div>
      </div>

      {showRevisionEditor && request.status === 'revisi' && (
        <div className="no-print fixed inset-0 z-50 bg-[#191C1B]/55 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="revision-editor-title">
          <form className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[12px] bg-white border border-[#BEC9C6] shadow-xl p-5 sm:p-6 flex flex-col gap-4" onSubmit={async (e) => {
            e.preventDefault();
            if (!revisionTitle.trim() || revisionItems.length === 0 || revisionItems.some((item) => !item.name.trim() || item.quantity <= 0 || item.unitPrice <= 0)) {
              setRevisionSaveError('Lengkapi judul dan rincian barang dengan jumlah serta harga yang valid.');
              return;
            }
            setSavingRevision(true);
            setRevisionSaveError('');
            const result = await onUpdateRevision(request.id, { title: revisionTitle.trim(), targetDate: revisionTargetDate.trim(), attachmentName: revisionAttachment.trim(), items: revisionItems.map((item) => ({ ...item, name: item.name.trim() })) });
            setSavingRevision(false);
            if (!result.ok) { setRevisionSaveError(result.error || 'Perubahan revisi gagal disimpan.'); return; }
            setShowRevisionEditor(false);
          }}>
            <div className="flex items-start justify-between gap-3 border-b border-[#BEC9C6] pb-3">
              <div><h2 id="revision-editor-title" className="text-lg font-bold text-[#191C1B]">Revisi Pengajuan Dana</h2><p className="text-sm text-[#3F4947] mt-1">Perbaiki data sesuai catatan pemeriksa, lalu simpan sebelum mengajukan ulang.</p></div>
              <button type="button" onClick={() => setShowRevisionEditor(false)} aria-label="Tutup" className="w-9 h-9 rounded-lg border border-[#BEC9C6] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="rounded-lg bg-[#FFF7E0] border border-[#F0D58A] p-3 text-sm text-[#694B00]"><strong>Catatan pemeriksa:</strong> {request.revisionNote || 'Silakan periksa kembali pengajuan.'}</div>
            {revisionSaveError && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{revisionSaveError}</p>}
            <label className="flex flex-col gap-1 text-sm font-semibold text-[#191C1B]">Judul Pengajuan<input required value={revisionTitle} onChange={(e) => setRevisionTitle(e.target.value)} className="w-full rounded-lg border border-[#BEC9C6] px-3 py-2 font-normal" /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-semibold text-[#191C1B]">Target Pakai<input value={revisionTargetDate} onChange={(e) => setRevisionTargetDate(e.target.value)} className="w-full rounded-lg border border-[#BEC9C6] px-3 py-2 font-normal" /></label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-[#191C1B]">Nama Lampiran RAB<input value={revisionAttachment} onChange={(e) => setRevisionAttachment(e.target.value)} className="w-full rounded-lg border border-[#BEC9C6] px-3 py-2 font-normal" /></label>
            </div>
            <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-sm text-[#191C1B]">Rincian Barang / Jasa</h3><button type="button" onClick={() => setRevisionItems((items) => [...items, { id: `rev-item-${Date.now()}`, name: '', quantity: 1, unitLabel: 'unit', unitPrice: 1000 }])} className="inline-flex items-center gap-1 rounded-lg border border-[#BEC9C6] px-3 py-2 text-sm font-semibold text-[#00433C]"><Plus className="w-4 h-4" /> Tambah Item</button></div>
            {revisionItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 rounded-lg border border-[#BEC9C6] p-3">
                <label className="col-span-12 sm:col-span-5 flex flex-col gap-1 text-xs font-semibold">Nama Barang<input value={item.name} onChange={(e) => setRevisionItems((items) => items.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} className="w-full rounded-md border border-[#BEC9C6] px-2 py-2 text-sm font-normal" /></label>
                <label className="col-span-4 sm:col-span-2 flex flex-col gap-1 text-xs font-semibold">Jumlah<input type="number" min="1" value={item.quantity} onChange={(e) => setRevisionItems((items) => items.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row))} className="w-full rounded-md border border-[#BEC9C6] px-2 py-2 text-sm font-normal" /></label>
                <label className="col-span-4 sm:col-span-2 flex flex-col gap-1 text-xs font-semibold">Satuan<input value={item.unitLabel} onChange={(e) => setRevisionItems((items) => items.map((row, i) => i === index ? { ...row, unitLabel: e.target.value } : row))} className="w-full rounded-md border border-[#BEC9C6] px-2 py-2 text-sm font-normal" /></label>
                <label className="col-span-4 sm:col-span-2 flex flex-col gap-1 text-xs font-semibold">Harga Satuan<input type="number" min="1" value={item.unitPrice} onChange={(e) => setRevisionItems((items) => items.map((row, i) => i === index ? { ...row, unitPrice: Number(e.target.value) } : row))} className="w-full rounded-md border border-[#BEC9C6] px-2 py-2 text-sm font-normal" /></label>
                <div className="col-span-12 sm:col-span-1 flex items-end justify-end"><button type="button" disabled={revisionItems.length === 1} onClick={() => setRevisionItems((items) => items.filter((_, i) => i !== index))} aria-label={`Hapus item ${index + 1}`} className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            ))}
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#BEC9C6] pt-4"><button type="button" onClick={() => setShowRevisionEditor(false)} className="rounded-lg border border-[#BEC9C6] px-4 py-2 text-sm font-semibold">Batal</button><button type="submit" disabled={savingRevision} className="rounded-lg bg-[#00433C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingRevision ? 'Menyimpan…' : 'Simpan Revisi'}</button></div>
          </form>
        </div>
      )}

    </div>
  );
}
