import React, { useState } from 'react';
import { USD_TO_KGS_RATE } from '../../data/mockData';
import { Language } from '../../types/car';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { X, Calculator, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CustomsCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const CustomsCalculatorModal: React.FC<CustomsCalculatorModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'hybrid' | 'electric'>('petrol');
  const [carAge, setCarAge] = useState<'under3' | '3to5' | '5to7' | 'over7'>('3to5');
  const [engineCc, setEngineCc] = useState(2500);
  const [carPriceUsd, setCarPriceUsd] = useState(15000);

  if (!isOpen) return null;

  const isKg = language === 'kg';

  // Расчет пошлин Кыргызстана (ЕАЭС тарифная сетка)
  const calculateCustoms = () => {
    if (fuelType === 'electric') {
      // Квота КР на электрокары: 0% пошлина, 0% НДС, только сбор за оформление
      const customsFeeSom = 1500;
      return {
        dutyUsd: 0,
        vatUsd: 0,
        feeSom: customsFeeSom,
        totalUsd: Math.round(customsFeeSom / USD_TO_KGS_RATE),
        totalSom: customsFeeSom,
        isZeroRate: true,
      };
    }

    // Расчет для ДВС и гибридов
    let ratePerCc = 0.6; // USD за куб.см
    if (carAge === 'under3') {
      ratePerCc = fuelType === 'hybrid' ? 0.35 : 0.5;
    } else if (carAge === '3to5') {
      ratePerCc = fuelType === 'hybrid' ? 0.55 : 0.8;
    } else if (carAge === '5to7') {
      ratePerCc = fuelType === 'hybrid' ? 0.9 : 1.3;
    } else {
      ratePerCc = fuelType === 'hybrid' ? 1.5 : 2.2;
    }

    const dutyUsd = Math.round(engineCc * ratePerCc);
    // НДС в Кыргызстане 12% от (стоимость + пошлина)
    const vatUsd = Math.round((carPriceUsd + dutyUsd) * 0.12);
    // Сбор за таможенное оформление (около 2 500 сом)
    const feeSom = 2500;
    const feeUsd = Math.round(feeSom / USD_TO_KGS_RATE);

    const totalUsd = dutyUsd + vatUsd + feeUsd;
    const totalSom = Math.round(totalUsd * USD_TO_KGS_RATE);

    return {
      dutyUsd,
      vatUsd,
      feeSom,
      totalUsd,
      totalSom,
      isZeroRate: false,
    };
  };

  const results = calculateCustoms();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {isKg ? 'КР бажы калькулятору' : 'Калькулятор растаможки авто в Кыргызстане'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Таможенная служба при МФ Кыргызской Республики (ЕАЭС 2025-2026)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Тело */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* Тип двигателя */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Тип двигателя
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'petrol', label: 'Бензин' },
                { id: 'diesel', label: 'Дизель' },
                { id: 'hybrid', label: 'Гибрид' },
                { id: 'electric', label: '⚡ Электро (0%)' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFuelType(item.id as any)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    fuelType === item.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {fuelType === 'electric' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <Zap className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-emerald-900">
                <span className="font-bold">Льготная ставка 0% для граждан КР!</span>
                <p className="mt-0.5 text-emerald-800">
                  По правительственной квоте Кыргызстана чистые электромобили освобождены от уплаты пошлины и НДС. Оплачивается лишь сбор за оформление.
                </p>
              </div>
            </div>
          )}

          {/* Возраст автомобиля */}
          {fuelType !== 'electric' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Возраст автомобиля
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'under3', label: 'До 3 лет' },
                  { id: '3to5', label: 'От 3 до 5 лет' },
                  { id: '5to7', label: 'От 5 до 7 лет' },
                  { id: 'over7', label: 'Старше 7 лет' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCarAge(item.id as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      carAge === item.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Объем двигателя и Стоимость */}
          {fuelType !== 'electric' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Объем двигателя (см³)
                </label>
                <input
                  type="number"
                  step="100"
                  value={engineCc}
                  onChange={(e) => setEngineCc(Math.max(500, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-500">
                  Например: 2000 (2.0л), 2500 (2.5л), 3500 (3.5л)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Стоимость авто в инвойсе ($ USD)
                </label>
                <input
                  type="number"
                  step="500"
                  value={carPriceUsd}
                  onChange={(e) => setCarPriceUsd(Math.max(1000, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-500">
                  Стоимость по договору купли-продажи
                </span>
              </div>
            </div>
          )}

          {/* Итоговый расчет */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-inner space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Итоговый расчет таможенных платежей
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Таможенная пошлина:</span>
                <span className="font-mono font-bold text-white">${results.dutyUsd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>НДС (12%):</span>
                <span className="font-mono font-bold text-white">${results.vatUsd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Таможенный сбор за оформление:</span>
                <span className="font-mono font-bold text-white">{results.feeSom.toLocaleString()} сом</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
              <div>
                <div className="text-xs text-slate-400">Всего к оплате:</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  ${results.totalUsd.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">В национальной валюте:</div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {results.totalSom.toLocaleString()} сом
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
