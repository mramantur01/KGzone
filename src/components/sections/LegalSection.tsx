import React from 'react';
import { FileText } from 'lucide-react';
import { Language } from '../../types/car';
import { PRIVACY, TERMS } from '../../data/legal';

interface LegalSectionProps {
  doc: 'terms' | 'privacy';
  language: Language;
  onSwitch: (doc: 'terms' | 'privacy') => void;
}

// User agreement / privacy policy. The legal text is published in Russian only.
export const LegalSection: React.FC<LegalSectionProps> = ({ doc, language, onSwitch }) => {
  const d = doc === 'terms' ? TERMS : PRIVACY;
  const tabs: ['terms' | 'privacy', string][] = [['terms', 'Пользовательское соглашение'], ['privacy', 'Политика конфиденциальности']];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onSwitch(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${doc === id ? 'bg-[#C8102E] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <article className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 text-slate-800">
        <div className="flex items-center gap-2 text-[#C8102E] mb-2">
          <FileText size={20} />
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{d.title}</h1>
        </div>
        <p className="text-xs text-slate-500 mb-5">Редакция от {d.updated}</p>
        {language !== 'ru' && (
          <p className="text-xs mb-5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
            Официальный текст документа опубликован на русском языке.
          </p>
        )}
        <div data-no-i18n className="space-y-5">
          {d.sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-bold text-base text-slate-900 mb-2">{s.title}</h2>
              <div className="space-y-2 text-sm leading-relaxed">
                {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
};
