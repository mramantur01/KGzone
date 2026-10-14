import React, { useState } from 'react';
import { Tag, Sparkles, Copy, Check, Clock, ArrowRight, ShieldCheck, Gift } from 'lucide-react';
import { PROMOTIONS_DATA } from '../../data/workshopData';
import { Language } from '../../types/car';

interface PromotionsSectionProps {
  language: Language;
  onApplyPromo?: (promoCode: string) => void;
  onNavigateToWorkshop?: () => void;
}

export const PromotionsSection: React.FC<PromotionsSectionProps> = ({
  language,
  onApplyPromo,
  onNavigateToWorkshop,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isKg = language === 'kg';
  const isEn = language === 'en';

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText?.(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
    if (onApplyPromo) onApplyPromo(code);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 py-10 min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Заголовок акций */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full text-xs font-bold mb-3">
            <Gift size={14} />
            <span>{isKg ? 'Атайын сунуштар жана арзандатуулар' : isEn ? 'Hot Deals & Promotions' : 'Акции и специальные предложения'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            {isKg ? 'СТО жана тетиктерге үнөмдүү баалар' : 'Экономьте на обслуживании и ремонте авто'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isKg 
              ? 'Промокоддорду көчүрүп алыңыз жана СТОго жазылууда же тетиктерди алууда кошумча арзандатууларга ээ болуңуз.'
              : 'Активируйте эксклюзивные промокоды для бесплатной диагностики, скидок на оригинальные масла Shell и обслуживание батарей гибридов.'}
          </p>
        </div>

        {/* Сетка акций */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROMOTIONS_DATA.map((promo) => (
            <div
              key={promo.id}
              className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-16/9 overflow-hidden">
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 bg-[#C8102E] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    {promo.badge}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                    {promo.validUntil}
                  </span>
                </div>

                <div className="p-5">
                  <div className="text-xs font-bold text-[#C8102E] mb-1">
                    {promo.serviceCategory}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug mb-2">
                    {isKg && promo.titleKg ? promo.titleKg : promo.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {promo.description}
                  </p>
                </div>
              </div>

              {/* Промокод и кнопка записи */}
              <div className="p-5 pt-0">
                <div className="bg-slate-50 dark:bg-slate-700/60 rounded-xl p-3 border border-dashed border-slate-300 dark:border-slate-600 mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Промокод
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {promo.promoCode}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(promo.promoCode)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode === promo.promoCode ? (
                      <>
                        <Check size={13} className="text-emerald-500" />
                        <span>Скопирован!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Скопировать</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={onNavigateToWorkshop}
                  className="w-full py-2.5 bg-[#C8102E] hover:bg-[#a60d26] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{isKg ? 'Акция менен жазылуу' : 'Воспользоваться акцией на СТО'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Инфо-блок о гарантии качества */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-[#C8102E] flex items-center justify-center mb-2">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Гарантия на работы</h4>
            <p className="text-xs text-slate-500 mt-1">Официальная гарантия сервиса до 12 месяцев на все узлы и агрегаты</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2">
              <Clock size={24} />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Точно в срок</h4>
            <p className="text-xs text-slate-500 mt-1">Фиксированные сроки ремонта без задержек с фотоотчетом в Telegram/WhatsApp</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-2">
              <Sparkles size={24} />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Оригинальные расходники</h4>
            <p className="text-xs text-slate-500 mt-1">Прямые поставки масел и запчастей с сертификатами соответствия</p>
          </div>
        </div>

      </div>
    </div>
  );
};
