import React, { useState } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp, MessageCircle, Bot, Sparkles } from 'lucide-react';
import { FAQ_DATA } from '../../data/workshopData';
import { Language } from '../../types/car';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';

interface FaqSectionProps {
  language: Language;
  onOpenConsultant?: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ language, onOpenConsultant }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>('faq-1');

  const isKg = language === 'kg';
  const isEn = language === 'en';

  const categories = [
    { id: 'all', label: isKg ? 'Бардыгы' : isEn ? 'All' : 'Все вопросы' },
    { id: 'carcheck', label: 'CarCheck KG' },
    { id: 'customs', label: isKg ? 'Бажы (Растаможка)' : 'Растаможка КР' },
    { id: 'workshop', label: isKg ? 'СТО жана Автосервис' : 'Автосервис & СТО' },
    { id: 'parts', label: isKg ? 'Тетиктер (Запчасти)' : 'Автозапчасти' },
    { id: 'payment_security', label: isKg ? 'Коопсуздук жана Төлөмдөр' : 'Оплата и безопасность' },
  ];

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const qText = (isKg && item.questionKg ? item.questionKg : isEn && item.questionEn ? item.questionEn : item.question).toLowerCase();
    const aText = (isKg && item.answerKg ? item.answerKg : isEn && item.answerEn ? item.answerEn : item.answer).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || qText.includes(query) || aText.includes(query);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="bg-slate-50 dark:bg-slate-900 py-10 min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Заголовок FAQ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-[#C8102E] dark:bg-red-950 dark:text-red-400 rounded-full text-xs font-bold mb-3">
            <HelpCircle size={14} />
            <span>{isKg ? 'Көп берилүүчү суроолор' : isEn ? 'FAQ & Help Center' : 'Часто задаваемые вопросы (FAQ)'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            {isKg 
              ? 'Автобазар жана автокызматтар боюнча суроолоруңузга жооптор' 
              : isEn 
              ? 'Got Questions? We Have Complete Answers'
              : 'Ответы на популярные вопросы автовладельцев Кыргызстана'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            {isKg
              ? 'Унаа текшерүү, растаможка эсептөө, Кудайбергенден тетик заказ кылуу жана СТОго жазылуу боюнча бардык маалыматтар.'
              : 'Все нюансы покупки машин на РИОМ-АВТО, расчет таможенных пошлин ЕАЭС, заказ контрактных запчастей и гарантия СТО.'}
          </p>

          {/* Строка поиска */}
          <div className="mt-6 relative max-w-lg mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={isKg ? 'Суроо же ачкыч сөздү жазыңыз...' : isEn ? 'Search answers...' : 'Поиск по вопросам (штрафы, растаможка, масло, запись)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#C8102E] shadow-xs"
            />
          </div>
        </div>

        {/* Категории */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none justify-center">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Аккордеон вопросов */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                По запросу «{searchQuery}» ответов не найдено
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-[#C8102E] font-bold hover:underline"
              >
                Сбросить поиск
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              const question = isKg && faq.questionKg ? faq.questionKg : isEn && faq.questionEn ? faq.questionEn : faq.question;
              const answer = isKg && faq.answerKg ? faq.answerKg : isEn && faq.answerEn ? faq.answerEn : faq.answer;

              return (
                <div
                  key={faq.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {question}
                    </span>
                    <span className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
                      {answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Быстрая помощь через WhatsApp или AI-консультанта */}
        <div className="mt-10 bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 rounded-2xl p-6 text-white border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C8102E] flex items-center justify-center shrink-0">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isKg ? 'Сурооңузга жооп таппадыңызбы?' : 'Не нашли ответ на свой вопрос?'}
              </h3>
              <p className="text-xs text-slate-300">
                {isKg 
                  ? 'Биздин виртуалдык AI-консультант же WhatsApp колдоо кызматы 24/7 жооп берүүгө даяр'
                  : 'Задайте вопрос нашему AI-автоэксперту или напишите дежурному диспетчеру в WhatsApp.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenConsultant && (
              <button
                onClick={onOpenConsultant}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles size={14} className="text-[#C8102E]" />
                <span>Спросить AI</span>
              </button>
            )}

            <a
              href={`https://wa.me/996555777999?text=${encodeURIComponent('Здравствуйте! У меня есть вопрос по порталу KGzone.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
