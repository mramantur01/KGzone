import React from 'react';
import { Language } from '../../types/car';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { Newspaper } from 'lucide-react';

interface NewsSectionProps {
  language: Language;
}

// News will be published by the editors; until then show an honest empty state (no invented articles)
export const NewsSection: React.FC<NewsSectionProps> = ({ language }) => {
  const isKg = language === 'kg';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-[#C8102E] uppercase tracking-wider mb-1">
          <KochkorMuyuzIcon size={16} color="#C8102E" />
          <span>KGzone Новости</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isKg ? 'Авто жаңылыктар' : 'Автоновости'}
        </h2>
      </div>

      <div className="p-10 text-center bg-white rounded-xl border border-slate-200">
        <Newspaper size={36} className="mx-auto text-slate-300 mb-3" />
        <p className="font-bold text-slate-800">{isKg ? 'Жаңылыктар жакында чыгат' : 'Раздел новостей скоро заработает'}</p>
        <p className="text-sm text-slate-500 mt-1">
          {isKg ? 'Азырынча жаңылык жок.' : 'Пока здесь нет публикаций. Мы не размещаем выдуманные новости — только проверенные материалы со ссылкой на источник.'}
        </p>
      </div>
    </div>
  );
};
