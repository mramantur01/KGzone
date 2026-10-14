import React from 'react';
import { AUTO_NEWS } from '../../data/mockData';
import { Language } from '../../types/car';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { Eye, Clock, ArrowRight } from 'lucide-react';

interface NewsSectionProps {
  language: Language;
}

export const NewsSection: React.FC<NewsSectionProps> = ({ language }) => {
  const isKg = language === 'kg';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Шапка новостей */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-[#C8102E] uppercase tracking-wider mb-1">
          <KochkorMuyuzIcon size={16} color="#C8102E" />
          <span>KGzone Новости · Кыргызстан</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isKg ? 'Кыргызстандын авто жаңылыктары' : 'Автоновости Кыргызстана и мира'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Свежие изменения в ПДД, рейды ГУОБДД, пошлины на ввоз авто и обзоры автомобильного рынка
        </p>
      </div>

      {/* Сетка статей и новостей */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {AUTO_NEWS.map((item) => (
          <article
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
                <span className="font-bold text-[#C8102E] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  {item.category}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{item.readTime}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    <span>{item.views.toLocaleString()}</span>
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 leading-snug hover:text-[#C8102E] transition-colors cursor-pointer">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
                {item.snippet}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">{item.date}</span>
              <button
                type="button"
                className="font-bold text-[#C8102E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Читать далее</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
