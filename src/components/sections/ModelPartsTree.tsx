import React, { useMemo } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { AutoPartItem } from '../../types/car';
import type { CarGeneration } from '../../data/mockData';
import { partInCategory, partMatchesSubPart, type PartCategoryDef } from '../../utils/partMatching';

interface TreeCategory extends PartCategoryDef {
  labelRu: string;
  labelKg: string;
  icon: string;
  subParts: string[];
}

interface ModelPartsTreeProps {
  brand: string;
  model: string;
  generation: CarGeneration | null;
  /** Parts that already fit the selected brand / model / generation */
  fittingParts: AutoPartItem[];
  categories: TreeCategory[];
  selectedCategory: string;
  selectedSubPart: string;
  onSelect: (categoryId: string, subPart: string) => void;
  onClose: () => void;
  isKg: boolean;
}

const SITE_WHATSAPP = '996555777999';

// "All parts for Toyota Camry XV70": every category and sub-part with how many listings fit,
// and a one-click request to the site's dispatcher for parts nobody has listed yet.
export const ModelPartsTree: React.FC<ModelPartsTreeProps> = ({
  brand, model, generation, fittingParts, categories, selectedCategory, selectedSubPart, onSelect, onClose, isKg,
}) => {
  const carName = [brand, model, generation?.name].filter(Boolean).join(' ');

  const counts = useMemo(() => {
    const out: Record<string, { total: number; subs: Record<string, number> }> = {};
    for (const cat of categories) {
      const inCat = fittingParts.filter((p) => partInCategory(p, cat));
      out[cat.id] = {
        total: inCat.length,
        subs: Object.fromEntries(cat.subParts.map((s) => [s, inCat.filter((p) => partMatchesSubPart(p, s)).length])),
      };
    }
    return out;
  }, [fittingParts, categories]);

  const requestLink = (sub: string) =>
    `https://wa.me/${SITE_WHATSAPP}?text=` +
    encodeURIComponent(`Здравствуйте! Ищу «${sub}» для ${carName}. Есть в наличии на рынках?`);

  return (
    <div className="mb-5 p-4 sm:p-5 rounded-3xl bg-neutral-900 border border-neutral-800">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            {isKg ? 'Унаа үчүн тетиктер' : 'Запчасти для авто'}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white leading-tight" data-no-i18n>
            {carName}
          </h3>
          {generation?.from && (
            <div className="text-xs text-neutral-400" data-no-i18n>{generation.label}</div>
          )}
          <p className="text-xs text-neutral-400 mt-1">
            {isKg
              ? 'Бөлүмдү тандаңыз. Тетик жок болсо — диспетчерге өтүнмө калтырыңыз, базарлардан таап беребиз.'
              : 'Выберите раздел. Если детали нет в каталоге — оставьте заявку, диспетчер найдёт её на рынках.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Скрыть разделы"
          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const c = counts[cat.id];
          const catActive = selectedCategory === cat.id;
          return (
            <div
              key={cat.id}
              className={`p-3 rounded-2xl border ${catActive ? 'border-red-500/60 bg-red-950/20' : 'border-neutral-800 bg-neutral-950/60'}`}
            >
              <button
                type="button"
                onClick={() => onSelect(cat.id, 'Все')}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <span className="flex items-center gap-2 font-bold text-sm text-white">
                  <span>{cat.icon}</span>
                  <span>{isKg ? cat.labelKg : cat.labelRu}</span>
                </span>
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${c.total ? 'bg-emerald-900/60 text-emerald-300' : 'bg-neutral-800 text-neutral-500'}`}>
                  {c.total}
                </span>
              </button>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cat.subParts.map((sub) => {
                  const n = c.subs[sub];
                  const active = catActive && selectedSubPart === sub;
                  return n > 0 ? (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => onSelect(cat.id, sub)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                        active ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      }`}
                    >
                      {sub} <span className="opacity-70">{n}</span>
                    </button>
                  ) : (
                    <a
                      key={sub}
                      href={requestLink(sub)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={isKg ? 'Өтүнмө калтыруу' : 'Оставить заявку'}
                      className="px-2 py-1 rounded-lg text-[11px] text-neutral-500 border border-dashed border-neutral-700 hover:text-emerald-300 hover:border-emerald-600 inline-flex items-center gap-1"
                    >
                      {sub}
                      <MessageCircle size={10} />
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
