import React, { useState } from 'react';
import { Flag, X, Loader2, CheckCircle2 } from 'lucide-react';
import { REPORT_REASONS, sendReport } from '../../api/reports';

interface Props {
  kind: 'part' | 'car';
  listingId: string;
  listingTitle: string;
  className?: string;
}

// "Пожаловаться" link + small dialog. Complaints go to the admin queue (and Telegram, if set up).
export const ReportListingButton: React.FC<Props> = ({ kind, listingId, listingTitle, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const close = () => {
    setOpen(false);
    setError(null);
    if (sent) { setSent(false); setReason(''); setComment(''); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) { setError('Выберите причину жалобы'); return; }
    setSending(true);
    setError(null);
    try {
      await sendReport({ kind, listingId, listingTitle, reason, comment, contact });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Не удалось отправить жалобу');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-red-400 cursor-pointer ${className}`}
      >
        <Flag size={12} />
        <span>Пожаловаться</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={close}>
          <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-bold text-sm">Жалоба на объявление</span>
              <button type="button" onClick={close} className="p-1 rounded hover:bg-slate-100 cursor-pointer" aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>
            {sent ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                <p className="text-sm font-semibold">Спасибо! Жалоба отправлена модератору.</p>
                <button type="button" onClick={close} className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold cursor-pointer">
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="p-4 space-y-3 text-sm">
                <p className="text-xs text-slate-500 line-clamp-2" data-no-i18n>{listingTitle}</p>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-red-600" />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Подробности (необязательно)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={80}
                  placeholder="Ваш телефон для ответа (необязательно)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sending && <Loader2 size={16} className="animate-spin" />}
                  <span>Отправить жалобу</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
