import React, { useState } from 'react';
import { MOCK_CARCHECK_REPORTS } from '../../data/mockData';
import { CarCheckReport, Language } from '../../types/car';
import { KochkorMuyuzIcon, KyrgyzPlateBadge, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import {
  X,
  ShieldCheck,
  Search,
  AlertTriangle,
  CheckCircle,
  FileText,
  AlertCircle,
  Clock,
  Car,
  DollarSign,
  Sun,
} from 'lucide-react';

interface CarCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialPlate?: string;
}

export const CarCheckModal: React.FC<CarCheckModalProps> = ({
  isOpen,
  onClose,
  language,
  initialPlate = '',
}) => {
  const [queryPlate, setQueryPlate] = useState(initialPlate || '01 KG 777 AAA');
  const [report, setReport] = useState<CarCheckReport | null>(
    MOCK_CARCHECK_REPORTS['01 KG 777 AAA']
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isKg = language === 'kg';

  const handleSearch = (plateToSearch?: string) => {
    const target = (plateToSearch || queryPlate).trim().toUpperCase();
    setLoading(true);

    setTimeout(() => {
      const found =
        MOCK_CARCHECK_REPORTS[target] || {
          ...MOCK_CARCHECK_REPORTS.DEFAULT,
          plateNumber: target,
        };
      setReport(found);
      setLoading(false);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Шапка сервиса CarCheck с кыргызским колоритом */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white border-b border-emerald-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  CarCheck <span className="text-emerald-400">KG</span>
                </span>
                <span className="text-[10px] text-emerald-300 font-medium px-1.5 py-0.2 bg-emerald-900/60 rounded border border-emerald-700/50">
                  МВД / ГРС КР
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isKg
                  ? 'Автоунааны мамлекеттик номери жана VIN боюнча толук текшерүү'
                  : 'Официальная проверка авто по базам Кыргызстана'}
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

        {/* Тело модалки */}
        <div className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto">
          {/* Поле поиска госномера */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {isKg ? 'Автоунаанын номерин же VIN жазыңыз:' : 'Введите госномер КР или VIN код:'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={queryPlate}
                  onChange={(e) => setQueryPlate(e.target.value)}
                  placeholder="Например: 01 KG 777 AAA или 02 KG 333 OSH"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Search size={16} />
                <span>{loading ? 'Текшерилүүдө...' : isKg ? 'Текшерүү' : 'Проверить'}</span>
              </button>
            </div>

            {/* Быстрые примеры для тестирования */}
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <span>{isKg ? 'Мисалдар:' : 'Быстрые примеры:'}</span>
              {['01 KG 777 AAA', '01 KG 808 BSK', '02 KG 333 OSH'].map((plate) => (
                <button
                  key={plate}
                  onClick={() => {
                    setQueryPlate(plate);
                    handleSearch(plate);
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 rounded font-mono text-[11px] transition-colors cursor-pointer"
                >
                  {plate}
                </button>
              ))}
            </div>
          </div>

          {/* Результат отчета CarCheck */}
          {report && (
            <div className="space-y-4">
              {/* Статусная плашка */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  report.status === 'Чистый'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      report.status === 'Чистый'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {report.status === 'Чистый' ? (
                      <CheckCircle size={24} />
                    ) : (
                      <AlertTriangle size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      {report.status === 'Чистый'
                        ? 'Юридически чист: арестов, залогов и угона нет'
                        : `Внимание: обнаружены штрафы (${report.finesCount} шт. на ${report.finesTotalKgs.toLocaleString()} сом)`}
                    </h3>
                    <p className="text-xs opacity-80 mt-0.5">
                      База данных обновлена в реальном времени · ГРС КР / Безопасный город
                    </p>
                  </div>
                </div>

                <KyrgyzPlateBadge plate={report.plateNumber} />
              </div>

              {/* Детальные показатели в сетке */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Штрафы Безопасный город */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <AlertCircle size={14} className={report.finesCount > 0 ? 'text-amber-600' : 'text-emerald-600'} />
                    <span>Штрафы «Коопсуз шаар»</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {report.finesCount === 0 ? (
                      <span className="text-emerald-600">Штрафов нет (0)</span>
                    ) : (
                      <span className="text-amber-700">{report.finesTotalKgs.toLocaleString()} сом ({report.finesCount} шт)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ГУОБДД МВД КР
                  </div>
                </div>

                {/* Аресты ПССИ */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <ShieldCheck size={14} className={report.hasArrest ? 'text-red-600' : 'text-emerald-600'} />
                    <span>Аресты и ограничения</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {report.hasArrest ? (
                      <span className="text-red-600">Есть арест (ПССИ)</span>
                    ) : (
                      <span className="text-emerald-600">Ограничений нет</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Судебный департамент при ВС КР
                  </div>
                </div>

                {/* Залоги */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <DollarSign size={14} className={report.hasPledge ? 'text-red-600' : 'text-emerald-600'} />
                    <span>Залог в банках / ломбардах</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {report.hasPledge ? (
                      <span className="text-red-600">Находится в залоге</span>
                    ) : (
                      <span className="text-emerald-600">Не в залоге</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Единый реестр залогов МЮ КР
                  </div>
                </div>

                {/* Налог на имущество */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <FileText size={14} className="text-slate-600" />
                    <span>Налог на авто (4-я группа)</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    Оплачен за {report.taxPaidYear} г.
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ГНС при МФ КР
                  </div>
                </div>

                {/* Техосмотр */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <Clock size={14} className="text-slate-600" />
                    <span>Технический осмотр</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {report.techInspectionValidUntil}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Диагностический центр
                  </div>
                </div>

                {/* Тонировка */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <Sun size={14} className="text-amber-600" />
                    <span>Разрешение на тонировку</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {report.tintingPermit ? (
                      <span className="text-emerald-600">Разрешение активно</span>
                    ) : (
                      <span className="text-slate-600">Не оформлено</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ГУ «Унаа» МВД КР
                  </div>
                </div>
              </div>

              {/* История регистраций */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
                <h4 className="font-bold text-slate-900 mb-2">
                  Сведения о регистрации транспортного средства:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>Модель: <span className="font-semibold text-slate-900">{report.brandModel}</span></div>
                  <div>Год выпуска: <span className="font-semibold text-slate-900">{report.year}</span></div>
                  <div>Объем / Тип: <span className="font-semibold text-slate-900">{report.engineVolume}</span></div>
                  <div>Цвет кузова: <span className="font-semibold text-slate-900">{report.color}</span></div>
                  <div>Дата первичной регистрации: <span className="font-semibold text-slate-900">{report.registrationDate}</span></div>
                  <div>Место учета: <span className="font-semibold text-slate-900">{report.registeredCity}</span></div>
                  <div>Количество владельцев в КР: <span className="font-semibold text-slate-900">{report.ownersCount}</span></div>
                  <div>VIN код: <span className="font-mono font-semibold text-slate-900">{report.vin}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
