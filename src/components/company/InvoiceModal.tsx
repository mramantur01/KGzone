import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Printer } from 'lucide-react';
import type { CompanyInfo } from '../../api/company';

interface Line { name: string; qty: string; price: string }
export type DocKind = 'invoice' | 'waybill';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const money = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Sum in words (сом, тыйын) for the invoice
function inWords(total: number): string {
  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const onesF = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  const plural = (n: number, f: [string, string, string]) => (n % 10 === 1 && n % 100 !== 11 ? f[0] : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? f[1] : f[2]);
  const triple = (n: number, fem: boolean) => {
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
    return [hundreds[h], t === 1 ? teens[o] : tens[t], t === 1 ? '' : (fem ? onesF : ones)[o]].filter(Boolean).join(' ');
  };
  const som = Math.floor(total);
  const tyiyn = Math.round((total - som) * 100);
  if (som === 0) return `ноль сом ${String(tyiyn).padStart(2, '0')} тыйын`;
  const parts: string[] = [];
  const mln = Math.floor(som / 1_000_000), th = Math.floor((som % 1_000_000) / 1000), rest = som % 1000;
  if (mln) parts.push(triple(mln, false), plural(mln, ['миллион', 'миллиона', 'миллионов']));
  if (th) parts.push(triple(th, true), plural(th, ['тысяча', 'тысячи', 'тысяч']));
  if (rest) parts.push(triple(rest, false));
  const words = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${words[0].toUpperCase()}${words.slice(1)} сом ${String(tyiyn).padStart(2, '0')} тыйын`;
}

/** Invoice (счёт на оплату) or waybill (накладная) with the company's details; printed or saved as PDF from the browser */
export const InvoiceModal: React.FC<{ info: CompanyInfo; kind: DocKind; buyer: string; lines: Line[]; onClose: () => void }> = ({ info, kind, buyer: buyer0, lines: lines0, onClose }) => {
  const [buyer, setBuyer] = useState(buyer0);
  const [lines, setLines] = useState<Line[]>(lines0.length ? lines0 : [{ name: '', qty: '1', price: '' }]);
  const [number, setNumber] = useState(() => `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`);
  const [basis, setBasis] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = lines.map((l) => ({ ...l, q: Math.max(0, Number(l.qty) || 0), p: Math.max(0, Number(String(l.price).replace(',', '.')) || 0) })).filter((l) => l.name.trim() && l.q > 0);
  const total = rows.reduce((n, l) => n + l.q * l.p, 0);
  const title = kind === 'invoice' ? 'Счёт на оплату' : 'Накладная';
  const c = info.company;

  const print = () => {
    const date = new Date().toLocaleDateString('ru-RU');
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)} № ${esc(number)}</title>
<style>
  @page { size: A4; margin: 15mm; } body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
  h1 { font-size: 18px; margin: 14px 0 10px; } table { width: 100%; border-collapse: collapse; }
  .grid td { padding: 3px 0; vertical-align: top; } .items th, .items td { border: 1px solid #000; padding: 5px 6px; }
  .items th { background: #f1f1f1; } .r { text-align: right; } .muted { color: #555; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; gap: 30px; } .sign div { flex: 1; border-top: 1px solid #000; padding-top: 4px; }
  .bar { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; color: #fff; padding: 10px; text-align: center; font-family: Arial; }
  .bar button { background: #fbbf24; border: 0; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  @media print { .bar { display: none; } } @media screen { body { padding-top: 50px; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">🖨 Распечатать или сохранить в PDF</button></div>
<table class="grid">
  <tr><td style="width:140px" class="muted">${kind === 'invoice' ? 'Поставщик' : 'Отправитель'}:</td><td><b>${esc(c.name)}</b>, ИНН ${esc(c.inn)}<br>${esc(c.legalAddress || c.actualAddress)}${c.contactPhone ? `, тел. +${esc(String(c.contactPhone).replace(/^\+/, ''))}` : ''}</td></tr>
  ${kind === 'invoice' && c.bankDetails ? `<tr><td class="muted">Банковские реквизиты:</td><td>${esc(c.bankDetails)}</td></tr>` : ''}
  <tr><td class="muted">${kind === 'invoice' ? 'Покупатель' : 'Получатель'}:</td><td><b>${esc(buyer || '—')}</b></td></tr>
  ${basis ? `<tr><td class="muted">Основание:</td><td>${esc(basis)}</td></tr>` : ''}
</table>
<h1>${esc(title)} № ${esc(number)} от ${esc(date)}</h1>
<table class="items">
  <thead><tr><th style="width:30px">№</th><th>Наименование</th><th style="width:60px">Кол-во</th><th style="width:40px">Ед.</th><th style="width:100px">Цена, сом</th><th style="width:110px">Сумма, сом</th></tr></thead>
  <tbody>${rows.map((l, i) => `<tr><td class="r">${i + 1}</td><td>${esc(l.name)}</td><td class="r">${l.q}</td><td>шт</td><td class="r">${money(l.p)}</td><td class="r">${money(l.q * l.p)}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="5" class="r"><b>Итого:</b></td><td class="r"><b>${money(total)}</b></td></tr></tfoot>
</table>
<p>Всего наименований ${rows.length}, на сумму ${money(total)} сом.<br><b>${esc(inWords(total))}</b></p>
${kind === 'invoice' ? '<p class="muted">Без НДС. Счёт действителен 5 банковских дней.</p>' : ''}
<div class="sign">${kind === 'invoice'
      ? '<div>Руководитель</div><div>Бухгалтер</div>'
      : '<div>Отпустил</div><div>Получил</div>'}</div>
<p class="muted" style="margin-top:30px;font-size:10px">Документ подготовлен в кабинете компании на KGzone.</p>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Браузер заблокировал новое окно. Разрешите всплывающие окна для этого сайта.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const setLine = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const input = 'w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]';

  // Rendered into <body> so it is not inside the client form (Enter must not submit it)
  return createPortal(
    <div data-invoice-modal className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-white px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="font-black text-base text-slate-900">{title}</div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 cursor-pointer" aria-label="Закрыть"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          {kind === 'invoice' && !c.bankDetails && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Банковские реквизиты не заполнены (или ваша роль их не видит). Добавьте их в «Данные компании».</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-600 mb-1">Номер</label><input value={number} onChange={(e) => setNumber(e.target.value)} className={input} /></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1">{kind === 'invoice' ? 'Покупатель' : 'Получатель'}</label><input value={buyer} onChange={(e) => setBuyer(e.target.value)} className={input} data-no-i18n /></div>
          </div>
          <div><label className="block text-xs font-bold text-slate-600 mb-1">Основание (необязательно)</label><input value={basis} onChange={(e) => setBasis(e.target.value)} placeholder="Договор № 12 от 01.11.2026" className={input} /></div>
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_70px_110px_32px] gap-2 text-[11px] font-bold text-slate-500"><span>Наименование</span><span>Кол-во</span><span>Цена, сом</span><span /></div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_90px_32px] sm:grid-cols-[1fr_70px_110px_32px] gap-2 items-center">
                <input value={l.name} onChange={(e) => setLine(i, 'name', e.target.value)} placeholder="Товар" className={input} data-no-i18n />
                <input value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} inputMode="numeric" className={input} />
                <input value={l.price} onChange={(e) => setLine(i, 'price', e.target.value)} inputMode="decimal" className={input} />
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-600 cursor-pointer" aria-label="Удалить строку"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setLines((ls) => [...ls, { name: '', qty: '1', price: '' }])} className="text-sm font-bold text-[#1d6fb8] hover:underline cursor-pointer inline-flex items-center gap-1"><Plus size={14} />Добавить строку</button>
          </div>
          <div className="text-right text-sm">Итого: <b className="text-lg">{money(total)} сом</b><div className="text-xs text-slate-500">{inWords(total)}</div></div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 sm:px-5 py-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 cursor-pointer">Закрыть</button>
          <button type="button" disabled={!rows.length} onClick={print} className="px-5 py-2.5 rounded-lg bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"><Printer size={15} />Печать / PDF</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
