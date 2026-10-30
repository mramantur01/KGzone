import React, { useState } from 'react';
import { X, ShieldCheck, Search, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Language } from '../../types/car';
import { decodeVin } from '../../utils/vin';
import { decodeFrame, type FrameMatch } from '../../data/frameCodes';
import { findCatalogVehicles, type CatalogVehicle } from '../../api/catalog';

// Honest "check before you buy" tool. The site has NO access to government registries
// (arrests, liens, fines, registration history), so it never shows such results. It decodes
// the VIN / frame number (to compare with the documents and the seller's ad) and explains how
// to check the car officially.

interface CarCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialPlate?: string;
}

type Result =
  | { kind: 'vehicles'; source: string; vehicles: CatalogVehicle[] }
  | { kind: 'frames'; frames: FrameMatch[] }
  | { kind: 'basic'; brand: string | null; year: number | null; region: string | null }
  | { kind: 'none' };

const CHECKLIST = [
  'Сверьте VIN / номер кузова на машине (стойка, моторный щит, табличка) с техпаспортом — номера должны совпадать и не иметь следов перебивки.',
  'Проверьте автомобиль на арест и залог официально: в ГУ «Унаа» (ЦОН) по госномеру или VIN. Продавец может получить выписку и показать вам.',
  'Попросите у продавца техпаспорт и документы на растаможку; для авто на учёте РФ/ЕАЭС уточните условия переоформления.',
  'Сделайте компьютерную диагностику и замер толщины краски в независимом сервисе, а не у знакомых продавца.',
  'Не переводите предоплату незнакомым людям. Деньги — только при оформлении сделки.',
];

export const CarCheckModal: React.FC<CarCheckModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  if (!isOpen) return null;

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase().replace(/\s/g, '');
    if (!q) return;
    setBusy(true);
    setResult(null);
    try {
      const vin = decodeVin(q);
      if (vin) {
        try {
          const r = await findCatalogVehicles(q);
          if (r.vehicles.length) { setResult({ kind: 'vehicles', source: r.provider, vehicles: r.vehicles }); return; }
        } catch { /* free database unavailable: use the basic decoding */ }
        setResult({ kind: 'basic', brand: vin.brand, year: vin.year, region: vin.region });
        return;
      }
      const frames = decodeFrame(q);
      setResult(frames.length ? { kind: 'frames', frames } : { kind: 'none' });
    } finally {
      setBusy(false);
    }
  };

  const line = (v: CatalogVehicle) => [v.brand, v.model, v.modification, v.year, v.engine, v.bodyCode].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-emerald-700 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={20} className="shrink-0" />
            <div className="min-w-0">
              <div className="font-extrabold">Проверка авто перед покупкой</div>
              <div className="text-[11px] text-white/80">Расшифровка VIN / номера кузова и что проверить официально</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer shrink-0" aria-label="Закрыть"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
            KGzone не имеет доступа к базам МВД и ГУ «Унаа», поэтому не показывает аресты, залоги и штрафы. Такие сведения проверяйте только официально — ниже написано как.
          </p>

          <form onSubmit={check} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="VIN (17 символов) или номер кузова, например NZE141-1234567"
              maxLength={25}
              className="flex-1 min-w-0 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono uppercase"
            />
            <button type="submit" disabled={busy} className="px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>Расшифровать</span>
            </button>
          </form>

          {result && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-1">
              {result.kind === 'vehicles' && (
                <>
                  <div className="text-xs text-slate-500">По VIN ({result.source}):</div>
                  {result.vehicles.map((v) => <div key={v.ref} className="font-semibold" data-no-i18n>{line(v)}</div>)}
                </>
              )}
              {result.kind === 'frames' && (
                <>
                  <div className="text-xs text-slate-500">По коду кузова (справочник KGzone):</div>
                  {result.frames.map((m) => (
                    <div key={m.title} className="font-semibold" data-no-i18n>{m.brand} {m.title} · {m.years} · {m.engine}</div>
                  ))}
                </>
              )}
              {result.kind === 'basic' && (
                <div className="font-semibold">
                  Производитель: <span data-no-i18n>{result.brand || 'не определён'}</span>
                  {result.year ? `, модельный год ${result.year}` : ''}
                  {result.region ? ` · ${result.region}` : ''}
                </div>
              )}
              {result.kind === 'none' && <div className="text-slate-600">Номер не распознан. Проверьте, что VIN из 17 символов (без I, O, Q) или код кузова введён полностью.</div>}
              {result.kind !== 'none' && (
                <div className="flex items-start gap-1.5 text-xs text-slate-600 pt-1">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Сравните эти данные с техпаспортом и объявлением: модель, год и двигатель должны совпадать.</span>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="font-bold text-sm mb-2 flex items-center gap-1.5"><AlertTriangle size={15} className="text-amber-500" />Что проверить перед покупкой</div>
            <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
              {CHECKLIST.map((t) => <li key={t}>{t}</li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
