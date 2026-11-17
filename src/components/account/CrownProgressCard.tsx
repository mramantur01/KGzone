import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { call } from '../../api/admin';

interface CrownInfo {
  applicable: boolean;
  has?: boolean;
  by?: 'auto' | 'admin';
  locked?: boolean;
  ok?: boolean;
  items?: { key: string; label: string; ok: boolean; value: string }[];
}

/** Private sellers: what is needed for the crown, with their own numbers. The site gives and takes it by itself. */
export const CrownProgressCard: React.FC = () => {
  const [info, setInfo] = useState<CrownInfo | null>(null);
  useEffect(() => { call<CrownInfo>('/api/my/crown').then(setInfo).catch(() => setInfo(null)); }, []);
  if (!info?.applicable || !info.items) return null;
  const done = info.items.filter((i) => i.ok).length;
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border ${info.has ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">👑</span>
        <div className="flex-1">
          <div className="font-black text-slate-900">
            {info.has ? 'Вы проверенный продавец' : 'Как получить корону проверенного продавца'}
          </div>
          <div className="text-xs text-slate-500">
            {info.has
              ? (info.by === 'admin' ? 'Корону выдал администратор KGzone.' : 'Корону выдал сайт сам. Она останется, пока выполнены все условия.')
              : info.locked ? 'Корону снял администратор. Чтобы вернуть, напишите в поддержку.'
                : `Выполнено ${done} из ${info.items.length}. Когда выполните все — корона появится сама.`}
          </div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-amber-400" style={{ width: `${Math.round((done / info.items.length) * 100)}%` }} />
      </div>
      <ul className="mt-3 space-y-1.5">
        {info.items.map((i) => (
          <li key={i.key} className="flex items-start gap-2 text-sm">
            {i.ok ? <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" /> : <Circle size={17} className="text-slate-300 shrink-0 mt-0.5" />}
            <span className={`flex-1 ${i.ok ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>{i.label}</span>
            <span className={`text-xs font-bold whitespace-nowrap ${i.ok ? 'text-emerald-700' : 'text-slate-500'}`} data-no-i18n>{i.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
