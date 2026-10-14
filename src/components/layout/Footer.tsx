import React from 'react';
import { ShyrdakRibbon, KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import { Language } from '../../types/car';
import { ShieldCheck, MapPin, Clock, Phone, MessageCircle, Wrench, Shield, Tag, HelpCircle, User } from 'lucide-react';

interface FooterProps {
  language: Language;
  onOpenCarCheck: () => void;
  onOpenCustomsCalc: () => void;
  onOpenCabinet?: () => void;
  onOpenParts?: () => void;
  onOpenWorkshop?: () => void;
  onOpenFaq?: () => void;
  onOpenPromotions?: () => void;
  onOpenControlPanel?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  language,
  onOpenCarCheck,
  onOpenCustomsCalc,
  onOpenCabinet,
  onOpenParts,
  onOpenWorkshop,
  onOpenFaq,
  onOpenPromotions,
  onOpenControlPanel,
}) => {
  const isKg = language === 'kg';
  const isEn = language === 'en';

  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
      {/* Кыргызский орнаментальный кант */}
      <ShyrdakRibbon variant="gold" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Колонка 1: О портале */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded bg-[#C8102E] flex items-center justify-center text-white">
                <KochkorMuyuzIcon size={20} color="#FFFFFF" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                KG<span className="text-[#C8102E]">zone</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              {isKg
                ? 'Кыргызстандын башкы унаа порталы. Жаңы жана жүргөн автоунаалар, СТО автосервиси, бажы калькулятору жана Кудайбергендеги тетиктер.'
                : 'KGzone — Автомобильный портал Кыргызстана: авторынок, проверка по базе CarCheck KG, сертифицированный автосервис СТО, калькулятор растаможки и контрактные запчасти.'}
            </p>

            <div className="flex items-center gap-2 text-slate-300 mb-3">
              <TundukIcon size={18} color="#FBBF24" />
              <span className="font-semibold text-white">Бишкек · Ош · Кыргызстан</span>
            </div>

            {/* Быстрая связь в WhatsApp */}
            <a
              href="https://wa.me/996555777999?text=Здравствуйте!%20Хочу%20обратиться%20в%20поддержку%20KGzone"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors"
            >
              <MessageCircle size={14} />
              <span>Написать в WhatsApp</span>
            </a>
          </div>

          {/* Колонка 2: Сервисы и услуги */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              {isKg ? 'Сервистер жана кызматтар' : 'Сервисы и услуги'}
            </h4>
            <ul className="space-y-2 text-slate-400">
              {onOpenWorkshop && (
                <li>
                  <button onClick={onOpenWorkshop} className="hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5">
                    <Wrench size={13} className="text-[#C8102E]" />
                    <span>Автосервис & Онлайн-запись на СТО</span>
                  </button>
                </li>
              )}
              {onOpenParts && (
                <li>
                  <button onClick={onOpenParts} className="hover:text-white transition-colors cursor-pointer text-left">
                    Автозапчасти (Кудайберген / Дордой)
                  </button>
                </li>
              )}
              <li>
                <button onClick={onOpenCarCheck} className="hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Проверка CarCheck KG (Штрафы & Аресты)</span>
                </button>
              </li>
              <li>
                <button onClick={onOpenCustomsCalc} className="hover:text-white transition-colors cursor-pointer text-left">
                  Калькулятор растаможки КР (ЕАЭС)
                </button>
              </li>
              {onOpenPromotions && (
                <li>
                  <button onClick={onOpenPromotions} className="hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5">
                    <Tag size={13} className="text-amber-500" />
                    <span>Акции и скидки на обслуживание</span>
                  </button>
                </li>
              )}
              {onOpenFaq && (
                <li>
                  <button onClick={onOpenFaq} className="hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5">
                    <HelpCircle size={13} />
                    <span>Часто задаваемые вопросы (FAQ)</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Колонка 3: Популярные города и филиалы СТО */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              Локации СТО и Авторынков
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><span className="text-slate-300 font-semibold">Центральный СТО:</span> ул. Льва Толстого, 19/1</li>
              <li><span className="text-slate-300 font-semibold">Кудайберген:</span> ул. Патриса Лумумбы, бокс 44</li>
              <li><span className="text-slate-300 font-semibold">РИОМ-АВТО:</span> с. Военно-Антоновка (сб-вс)</li>
              <li><span className="text-slate-300 font-semibold">Филиал Ош:</span> ул. Навои, 112 (Автобазар Ош)</li>
              <li><span className="text-slate-300 font-semibold">Телефон СТО:</span> +996 555 777 999</li>
            </ul>
          </div>

          {/* Колонка 4: Расписание авторынков КР */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              График авторынков КР
            </h4>
            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="font-bold text-white text-xs">«РИОМ-АВТО» (Военно-Антоновка)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Суббота, Воскресенье с 06:00 до 16:00</div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="font-bold text-white text-xs">Авторынок «Жапалак» (г. Ош)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Воскресенье с 06:00 до 15:00</div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <div className="font-bold text-white text-xs">Рынок автозапчастей «Кудайберген»</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Вт - Вс: 08:30 - 18:00 (Пн - выходной)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Разделитель с Кочкор Мүйүз */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <KochkorMuyuzIcon size={16} color="#C8102E" />
            <span>© 2026 KGzone — Все права защищены. Автомобильный портал Кыргызстана.</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <button
              onClick={onOpenCabinet}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <User size={12} />
              <span>Личный кабинет & Регистрация</span>
            </button>
            <span>·</span>
            <button
              onClick={onOpenCarCheck}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Проверка CarCheck
            </button>
            <span>·</span>
            <button
              onClick={onOpenCustomsCalc}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Растаможка ЕАЭС
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
