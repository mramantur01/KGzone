import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, Eye, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import type { MyPart } from '../../api/myListings';

const DAYS = 14;
const dayKeys = () => Array.from({ length: DAYS }, (_, i) => new Date(Date.now() - (DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10));
const sumDays = (m: Record<string, number> | undefined, keys: string[]) => keys.reduce((n, k) => n + (m?.[k] || 0), 0);

// Seller's statistics: views and what buyers pressed (WhatsApp, call, cart) over the last 14 days
export const SellerStatsCard: React.FC<{ parts: MyPart[] }> = ({ parts }) => {
  const [open, setOpen] = useState(false);
  const keys = useMemo(dayKeys, []);
  const data = useMemo(() => {
    const perDay = keys.map((k) => ({ k, views: parts.reduce((n, p) => n + (p.viewsByDay?.[k] || 0), 0), contacts: parts.reduce((n, p) => n + (p.contactsByDay?.[k] || 0), 0) }));
    const ch = parts.reduce((a, p) => ({ whatsapp: a.whatsapp + (p.contactChannels?.whatsapp || 0), call: a.call + (p.contactChannels?.call || 0), cart: a.cart + (p.contactChannels?.cart || 0) }), { whatsapp: 0, call: 0, cart: 0 });
    const top = parts
      .map((p) => ({ p, views: sumDays(p.viewsByDay, keys), contacts: sumDays(p.contactsByDay, keys) }))
      .filter((x) => x.views || x.contacts)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    return { perDay, ch, top, views: perDay.reduce((n, d) => n + d.views, 0), contacts: perDay.reduce((n, d) => n + d.contacts, 0) };
  }, [parts, keys]);
  const max = Math.max(1, ...data.perDay.map((d) => d.views));

  if (!parts.length) return null;
  return (
    <div className="mx-3 sm:mx-5 mt-3 rounded-xl border border-slate-200 bg-slate-50">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full px-3 py-2.5 flex items-center gap-2 text-sm cursor-pointer">
        <BarChart3 size={16} className="text-[#1d6fb8] shrink-0" />
        <b className="text-slate-900">Статистика за 14 дней:</b>
        <span className="text-slate-600">{data.views.toLocaleString('ru-RU')} просмотров · {data.contacts.toLocaleString('ru-RU')} обращений</span>
        <ChevronDown size={16} className={`ml-auto text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div>
            <div className="flex items-end gap-1 h-20" aria-label="Просмотры по дням">
              {data.perDay.map((d) => (
                <div key={d.k} className="flex-1 flex flex-col items-center justify-end h-full" title={`${new Date(d.k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}: ${d.views} просм., ${d.contacts} обращ.`}>
                  <div className="w-full rounded-t bg-[#1d6fb8]/80" style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{new Date(keys[0]).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
              <span>сегодня</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              [Eye, 'Просмотры', data.views],
              [MessageCircle, 'WhatsApp', data.ch.whatsapp],
              [Phone, 'Звонки', data.ch.call],
              [ShoppingBag, 'В корзину', data.ch.cart],
            ].map(([Icon, label, n]: any) => (
              <div key={label} className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center gap-1 text-slate-500"><Icon size={12} />{label}</div>
                <div className="text-lg font-black text-slate-900">{Number(n).toLocaleString('ru-RU')}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">WhatsApp, звонки и корзина считаются за всё время.</p>
          {data.top.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1">Чаще всего смотрят</div>
              <ul className="space-y-1 text-xs">
                {data.top.map(({ p, views, contacts }) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-slate-800" data-no-i18n>{p.title}</span>
                    <span className="text-slate-500 whitespace-nowrap">{views} просм.</span>
                    <span className="text-slate-500 whitespace-nowrap">{contacts} обращ.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
