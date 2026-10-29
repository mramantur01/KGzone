import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { getCatalogStatus, type CatalogStatus } from '../../api/catalog';

// Admin view: is a parts catalog (Laximo / TecDoc) connected, and what is still needed
export const CatalogStatusCard: React.FC = () => {
  const [s, setS] = useState<CatalogStatus | null>(null);
  useEffect(() => { getCatalogStatus().then(setS).catch(() => setS(null)); }, []);
  if (!s) return null;
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2">
      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
        <BookOpen size={15} className="text-[#C8102E]" />
        <span>Каталог запчастей (VIN и OEM)</span>
        <span className={`ml-auto px-2 py-0.5 rounded-full font-bold ${s.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          {s.configured ? `Подключён: ${s.provider}` : 'Не подключён'}
        </span>
      </div>
      {s.available.map((p) => (
        <div key={p.id} className="text-slate-600">
          <b data-no-i18n>{p.name}</b>: {p.configured ? 'ключи заданы' : 'ключи не заданы'}{s.selected === p.id ? ' · выбран' : ''}
        </div>
      ))}
      {!s.configured && (
        <p className="text-slate-500">
          Сейчас работает только поиск аналогов среди объявлений KGzone по OEM и кросс-номерам. Для подбора по VIN и номеру кузова
          нужен договор с Laximo или TecDoc и их ключи доступа. Ключи вводятся в настройках сервера (Vercel), не на сайте.
        </p>
      )}
    </div>
  );
};
