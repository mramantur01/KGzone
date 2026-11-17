import React, { useState } from 'react';
import { Clock, Loader2, CheckCircle2 } from 'lucide-react';
import type { AutoPartItem } from '../../types/car';
import { reservePart, hhmm, isActiveUntil } from '../../api/market';

// "Забронировать на 2 часа": the seller gets the buyer's name and phone and puts the part aside
export const ReservePart: React.FC<{ part: AutoPartItem; isKg: boolean; disabled?: boolean }> = ({ part, isKg, disabled }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [until, setUntil] = useState<string | null>(null);

  if (until) {
    return (
      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-xs text-emerald-300 flex items-start gap-2">
        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
        <span>{isKg ? `Брондолду ${hhmm(until)} чейин. Сатуучу атыңызды жана телефонуңузду алды — тетикти сизге калтырат.` : `Забронировано до ${hhmm(until)}. Продавец получил ваше имя и телефон и отложит деталь для вас.`}</span>
      </div>
    );
  }
  if (isActiveUntil(part.reservedUntil)) {
    return (
      <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-2">
        <Clock size={14} className="shrink-0" />
        {isKg ? `Бул тетик ${hhmm(part.reservedUntil)} чейин брондолгон` : `Эту деталь уже забронировали до ${hhmm(part.reservedUntil)}`}
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="w-full py-2.5 px-4 rounded-xl border border-amber-500/60 text-amber-300 hover:bg-amber-400/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
        <Clock size={15} />
        {isKg ? '2 саатка брондоо — барганча калтырышат' : 'Забронировать на 2 часа — отложат до вашего приезда'}
      </button>
    );
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { setUntil((await reservePart(part.id, name.trim(), phone.trim(), part.title, part.storeName || part.companyName)).reservedUntil); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="p-3 rounded-xl bg-neutral-900/80 border border-amber-500/40 space-y-2">
      <div className="text-xs font-bold text-amber-300">{isKg ? 'Продавецке атыңыз жана телефонуңуз жөнөтүлөт' : 'Продавец получит ваше имя и телефон'}</div>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder={isKg ? 'Атыңыз' : 'Ваше имя'} className="kgz-input px-3 py-2 rounded-lg bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={30} inputMode="tel" placeholder="+996 ..." className="kgz-input px-3 py-2 rounded-lg bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white text-sm" />
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer">
          {busy && <Loader2 size={14} className="animate-spin" />}{isKg ? 'Брондоо' : 'Забронировать'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-bold cursor-pointer">{isKg ? 'Жокко чыгаруу' : 'Отмена'}</button>
      </div>
    </form>
  );
};
