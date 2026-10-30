import { siteWhatsApp } from '../../config/site';
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
                ? 'Кыргызстандын унаа порталы: унаа жана тетик жарыялары, VIN боюнча тандоо, бажы калькулятору.'
                : 'KGzone — автомобильный портал Кыргызстана: объявления об авто и запчастях, подбор по VIN и номеру кузова, калькулятор растаможки.'}
            </p>

            <div className="flex items-center gap-2 text-slate-300 mb-3">
              <TundukIcon size={18} color="#FBBF24" />
              <span className="font-semibold text-white">Бишкек · Ош · Кыргызстан</span>
            </div>

            {/* Быстрая связь в WhatsApp */}
            {siteWhatsApp('Здравствуйте! Хочу обратиться в поддержку KGzone') && (
              <a
                href={siteWhatsApp('Здравствуйте! Хочу обратиться в поддержку KGzone')!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors"
              >
                <MessageCircle size={14} />
                <span>Написать в WhatsApp</span>
              </a>
            )}
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
                    <span>Автосервис (раздел в разработке)</span>
                  </button>
                </li>
              )}
              {onOpenParts && (
                <li>
                  <button onClick={onOpenParts} className="hover:text-white transition-colors cursor-pointer text-left">
                    Автозапчасти
                  </button>
                </li>
              )}
              <li>
                <button onClick={onOpenCarCheck} className="hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Как проверить авто перед покупкой</span>
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
                    <span>Акции</span>
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

          {/* Колонка 3: Контакты */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">
              {isKg ? 'Байланыш' : 'Связь с KGzone'}
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>{isKg ? 'Сатуучу менен байланыш — жарыянын ичинде.' : 'Связь с продавцом — прямо в объявлении (чат или телефон продавца).'}</li>
              <li>{isKg ? 'Сайт боюнча суроолор — WhatsApp аркылуу.' : 'Вопросы по работе сайта — через кнопку WhatsApp слева.'}</li>
              <li>{isKg ? 'Жалоба — жарыядагы «Пожаловаться» баскычы.' : 'Жалоба на объявление — кнопка «Пожаловаться» в объявлении.'}</li>
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
              Проверка авто
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
