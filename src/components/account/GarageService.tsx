import React, { useState } from 'react';
import { Wrench, AlertTriangle } from 'lucide-react';
import type { GarageCar } from '../../api/auth';

// Maintenance reminders for a car in "Мои автомобили": oil change by mileage,
// insurance and technical inspection by date.

const DEFAULT_OIL_INTERVAL = 8000;
const daysLeft = (date?: string) => (date ? Math.ceil((Date.parse(date) - Date.now()) / 86_400_000) : null);

export interface ServiceReminder {
  carId: string;
  text: string;
  urgent: boolean;
  searchOil?: boolean;
}

export function garageReminders(car: GarageCar): ServiceReminder[] {
  const out: ServiceReminder[] = [];
  if (car.mileage && car.oilChangeMileage) {
    const left = car.oilChangeMileage + (car.oilInterval || DEFAULT_OIL_INTERVAL) - car.mileage;
    if (left <= 1000) out.push({ carId: car.id, urgent: left <= 0, searchOil: true, text: left <= 0 ? `Пора менять масло (просрочено на ${-left} км)` : `Замена масла через ${left} км` });
  }
  const ins = daysLeft(car.insuranceUntil);
  if (ins !== null && ins <= 30) out.push({ carId: car.id, urgent: ins <= 7, text: ins < 0 ? 'Страховка закончилась' : `Страховка заканчивается через ${ins} дн.` });
  const insp = daysLeft(car.inspectionUntil);
  if (insp !== null && insp <= 30) out.push({ carId: car.id, urgent: insp <= 7, text: insp < 0 ? 'Техосмотр просрочен' : `Техосмотр заканчивается через ${insp} дн.` });
  return out;
}

const inputCls = 'w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm';
const labelCls = 'block text-[11px] font-bold text-slate-600 mb-0.5';

interface Props {
  car: GarageCar;
  onSave: (car: GarageCar) => Promise<unknown>;
  onFindOil: (car: GarageCar) => void;
}

export const GarageService: React.FC<Props> = ({ car, onSave, onFindOil }) => {
  const [open, setOpen] = useState(false);
  const [mileage, setMileage] = useState(car.mileage ? String(car.mileage) : '');
  const [oilAt, setOilAt] = useState(car.oilChangeMileage ? String(car.oilChangeMileage) : '');
  const [oilInterval, setOilInterval] = useState(String(car.oilInterval || DEFAULT_OIL_INTERVAL));
  const [insurance, setInsurance] = useState(car.insuranceUntil || '');
  const [inspection, setInspection] = useState(car.inspectionUntil || '');
  const [msg, setMsg] = useState<string | null>(null);
  const reminders = garageReminders(car);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await onSave({
        ...car,
        mileage: Number(mileage) || undefined,
        oilChangeMileage: Number(oilAt) || undefined,
        oilInterval: Number(oilInterval) || undefined,
        insuranceUntil: insurance || undefined,
        inspectionUntil: inspection || undefined,
      });
      setMsg('Сохранено');
      setOpen(false);
    } catch (err: any) { setMsg(err.message); }
  };

  return (
    <div className="w-full">
      {reminders.map((r) => (
        <div key={r.text} className={`mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold ${r.urgent ? 'text-red-700' : 'text-amber-700'}`}>
          <AlertTriangle size={13} />
          <span>{r.text}</span>
          {r.searchOil && <button type="button" onClick={() => onFindOil(car)} className="underline cursor-pointer">Найти масло и фильтр</button>}
        </div>
      ))}
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs text-slate-600 underline flex items-center gap-1 cursor-pointer">
        <Wrench size={12} /><span>{car.mileage ? `Пробег ${car.mileage.toLocaleString('ru-RU')} км · обслуживание` : 'Указать пробег и даты обслуживания'}</span>
      </button>
      {open && (
        <form onSubmit={save} className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <div><label className={labelCls}>Пробег сейчас, км</label><input type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Масло меняли на, км</label><input type="number" min="0" value={oilAt} onChange={(e) => setOilAt(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Менять каждые, км</label><input type="number" min="1000" max="30000" step="500" value={oilInterval} onChange={(e) => setOilInterval(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Страховка до</label><input type="date" value={insurance} onChange={(e) => setInsurance(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Техосмотр до</label><input type="date" value={inspection} onChange={(e) => setInspection(e.target.value)} className={inputCls} /></div>
          <button type="submit" className="col-span-2 sm:col-span-5 justify-self-start px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer">Сохранить</button>
        </form>
      )}
      {msg && <p className="text-xs text-slate-600 mt-1">{msg}</p>}
    </div>
  );
};
