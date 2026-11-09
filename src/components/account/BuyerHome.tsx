import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Heart, Trash2, Wrench, BellRing, TrendingDown, CarFront } from 'lucide-react';
import type { AutoPartItem, Car } from '../../types/car';
import type { Account, GarageCar } from '../../api/auth';
import type { ViewedItem } from '../../utils/viewHistory';
import { listWatches, removeWatch, watchMatches, type Watch } from '../../api/watches';
import { togglePartFavorite } from '../../utils/partFavorites';
import { sameOemOffers } from '../../utils/oemOffers';
import { partHaystack, smartMatch } from '../../utils/smartSearch';
import { carPath, partPath } from '../../seo/routes';
import { garageReminders } from './GarageService';

type Tab = 'cars' | 'favorites' | 'history' | 'watches';
const linkCls = 'text-[#1d6fb8] hover:text-[#C8102E] hover:underline cursor-pointer';
const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;
const PAGE = 30;

interface Row {
  key: string;
  kind: 'part' | 'car';
  id: string;
  title: string;
  image?: string;
  price: string;
  meta: string;
  url: string;
  isNew?: boolean;
  cheaper?: { price: number; count: number };
  favorite?: boolean;
  part?: AutoPartItem;
  car?: Car;
}

interface Props {
  user: Account;
  parts: AutoPartItem[];
  cars: Car[];
  favPartIds: string[];
  favCarIds: string[];
  history: ViewedItem[];
  garageMatches: { car: GarageCar; ids: string[] }[];
  seen: Record<string, string[]>;
  onMarkSeen: (carId: string, ids: string[]) => void;
  onFindParts: (preset: { brand?: string; model?: string; search?: string }) => void;
  onSelectCar: (car: Car) => void;
  onToggleCarFavorite: (id: string) => void;
  onOpenGarage: () => void;
  onOpenKit: (car: GarageCar) => void;
}

/** Buyer's start page in the same list style as the seller cabinet, with buyer extras:
 *  parts for my cars (new ones marked), cheaper offers of the same number, service kit, reminders, awaited parts */
export const BuyerHome: React.FC<Props> = (props) => {
  const { user, parts, cars, favPartIds, favCarIds, history, garageMatches, seen, onMarkSeen, onFindParts, onSelectCar, onToggleCarFavorite, onOpenGarage, onOpenKit } = props;
  const [tab, setTab] = useState<Tab>('cars');
  const [carId, setCarId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [watches, setWatches] = useState<Watch[]>([]);
  useEffect(() => { listWatches().then(setWatches).catch(() => setWatches([])); }, []);
  useEffect(() => setShown(PAGE), [tab, carId, query]);

  const partById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const partRow = (p: AutoPartItem, isNew = false): Row => {
    const others = sameOemOffers(p, parts).filter((o) => o.priceKgs < p.priceKgs);
    return {
      key: `p-${p.id}`, kind: 'part', id: p.id, title: p.title, image: p.image, price: som(p.priceKgs), url: partPath(p), part: p, isNew,
      meta: [p.partNumber && `OEM ${p.partNumber}`, [p.brand, p.model].filter(Boolean).join(' '), p.storeName].filter(Boolean).join(' · '),
      cheaper: others.length ? { price: others[0].priceKgs, count: others.length } : undefined,
      favorite: favPartIds.includes(p.id),
    };
  };
  const carRow = (c: Car): Row => ({
    key: `c-${c.id}`, kind: 'car', id: c.id, title: c.title, image: c.image, price: `$${c.priceUsd.toLocaleString('ru-RU')}`, url: carPath(c), car: c,
    meta: [c.year, c.mileageKm ? `${Number(c.mileageKm).toLocaleString('ru-RU')} км` : '', c.city].filter(Boolean).join(' · '),
    favorite: favCarIds.includes(c.id),
  });

  // Rows of each tab
  const carRows = useMemo(() => {
    const list = garageMatches.filter((m) => !carId || m.car.id === carId);
    const out: Row[] = [];
    const used = new Set<string>();
    for (const m of list) {
      for (const id of m.ids) {
        const p = partById.get(id);
        if (!p || used.has(id)) continue;
        used.add(id);
        out.push(partRow(p, !(seen[m.car.id] || []).includes(id)));
      }
    }
    // New ones first, then newest
    return out.sort((a, b) => Number(b.isNew) - Number(a.isNew) || String(b.part?.createdAt || '').localeCompare(String(a.part?.createdAt || '')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garageMatches, carId, partById, seen, favPartIds]);
  const favRows = useMemo(() => [
    ...favPartIds.map((id) => partById.get(id)).filter(Boolean).map((p) => partRow(p!)),
    ...cars.filter((c) => favCarIds.includes(c.id)).map(carRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [favPartIds, favCarIds, partById, cars]);
  const historyRows = useMemo(() => history.map((h): Row => {
    const p = h.kind === 'part' ? partById.get(h.id) : undefined;
    const c = h.kind === 'car' ? cars.find((x) => x.id === h.id) : undefined;
    if (p) return { ...partRow(p), meta: `${new Date(h.at).toLocaleDateString('ru-RU')} · ${partRow(p).meta}` };
    if (c) return { ...carRow(c), meta: `${new Date(h.at).toLocaleDateString('ru-RU')} · ${carRow(c).meta}` };
    return { key: `h-${h.kind}-${h.id}`, kind: h.kind, id: h.id, title: h.title, image: h.image, price: h.price, url: '', meta: `${new Date(h.at).toLocaleDateString('ru-RU')} · снято с продажи` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [history, partById, cars, favPartIds, favCarIds]);
  const watchCounts = useMemo(() => new Map(watches.map((w) => [w.id, parts.filter((p) => watchMatches(w, p)).length])), [watches, parts]);

  const tabRows = tab === 'cars' ? carRows : tab === 'favorites' ? favRows : tab === 'history' ? historyRows : [];
  const filtered = query.trim()
    ? tabRows.filter((r) => (r.part ? smartMatch(partHaystack(r.part), query) : r.title.toLowerCase().includes(query.trim().toLowerCase())))
    : tabRows;
  const newCount = carRows.filter((r) => r.isNew).length;
  const cheaperCount = [...carRows, ...favRows].filter((r) => r.cheaper).length;
  const reminders = user.garage.flatMap((g) => garageReminders(g).map((r) => ({ car: g, ...r })));
  const selectedCar = garageMatches.find((m) => m.car.id === carId)?.car;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'cars', label: 'Для моих машин', count: carRows.length },
    { id: 'favorites', label: 'Избранное', count: favRows.length },
    { id: 'history', label: 'Просмотренные', count: historyRows.length },
    { id: 'watches', label: 'Жду деталь', count: watches.length },
  ];

  const markAllSeen = () => garageMatches.forEach((m) => onMarkSeen(m.car.id, m.ids));
  const toggleFav = (r: Row) => (r.kind === 'part' ? togglePartFavorite(r.id) : onToggleCarFavorite(r.id));
  const openRow = (r: Row, e: React.MouseEvent) => {
    if (r.car) { e.preventDefault(); onSelectCar(r.car); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      {/* Heading */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 pt-3 sm:pt-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-slate-900">Мой кабинет</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {user.garage.length} авто · {carRows.length.toLocaleString('ru-RU')} подходящих запчастей · {favRows.length} в избранном
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => onFindParts({})} aria-label="Найти запчасть" className="w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-full sm:rounded-lg bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <Search size={19} /><span className="hidden sm:inline">Найти запчасть</span>
          </button>
          <button type="button" onClick={onOpenGarage} className="hidden sm:flex px-3 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold items-center gap-1.5 cursor-pointer"><Plus size={16} />Добавить авто</button>
        </div>
      </div>

      {/* Notice lines: new parts, cheaper offers, service reminders */}
      <div className="px-3 sm:px-5 mt-3 space-y-2">
        {newCount > 0 && (
          <button type="button" onClick={() => { setTab('cars'); setCarId(''); }} className="w-full text-left px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 cursor-pointer hover:bg-emerald-100">
            <BellRing size={15} className="shrink-0" />
            <span><span className="hidden sm:inline">Новые запчасти для ваших машин</span><span className="sm:hidden">Новые для ваших машин</span>: <b>{newCount}</b></span>
            <span onClick={(e) => { e.stopPropagation(); markAllSeen(); }} className="ml-auto text-xs font-bold whitespace-nowrap hover:underline"><span className="hidden sm:inline">Отметить просмотренными</span><span className="sm:hidden">✓ Просмотрено</span></span>
          </button>
        )}
        {cheaperCount > 0 && (
          <div className="px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-sm flex items-center gap-2">
            <TrendingDown size={15} className="shrink-0" />
            <span>Нашли дешевле у других продавцов: <b>{cheaperCount}</b> — смотрите синюю пометку в списке</span>
          </div>
        )}
        {reminders.slice(0, 2).map((r, i) => (
          <div key={r.car.id + r.text} className={`${i > 0 ? "hidden sm:flex" : "flex"} px-3 py-2 rounded-lg border text-sm flex-wrap items-center gap-x-2 gap-y-1 ${r.urgent ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <Wrench size={15} className="shrink-0" />
            <span><b data-no-i18n>{r.car.brand} {r.car.model}</b>: {r.text}</span>
            <button type="button" onClick={() => onOpenKit(r.car)} className="ml-auto font-bold whitespace-nowrap hover:underline cursor-pointer">Набор для ТО →</button>
          </div>
        ))}
      </div>

      {/* Search and car filter */}
      {tab !== 'watches' && (
        <div className="px-3 sm:px-5 mt-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск: название или OEM-номер" className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]" />
          </div>
          {tab === 'cars' && garageMatches.length > 1 && (
            <select value={carId} onChange={(e) => setCarId(e.target.value)} className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white" data-no-i18n>
              <option value="">Все мои машины</option>
              {garageMatches.map((m) => <option key={m.car.id} value={m.car.id}>{m.car.brand} {m.car.model}{m.car.year ? `, ${m.car.year}` : ''}</option>)}
            </select>
          )}
        </div>
      )}
      {tab === 'cars' && garageMatches.length > 0 && (
        <div className="px-3 sm:px-5 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {(selectedCar ? [selectedCar] : garageMatches.map((m) => m.car)).slice(0, 3).map((c) => (
            <button key={c.id} type="button" onClick={() => onOpenKit(c)} className={`${linkCls} inline-flex items-center gap-1`}>
              <Wrench size={13} />Набор для ТО <span data-no-i18n>{c.brand} {c.model}</span>
            </button>
          ))}
          <button type="button" onClick={onOpenGarage} className={`${linkCls} inline-flex items-center gap-1 sm:ml-auto`}><CarFront size={13} />Мои автомобили</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-3 px-3 sm:px-5 flex gap-5 overflow-x-auto border-b border-slate-200 text-sm whitespace-nowrap">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`py-2.5 -mb-px border-b-2 cursor-pointer ${tab === t.id ? 'border-[#C8102E] text-slate-900 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t.label} <span className="font-normal">{t.count.toLocaleString('ru-RU')}</span>
          </button>
        ))}
      </div>

      {/* Awaited parts */}
      {tab === 'watches' ? (
        watches.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <p className="font-bold text-slate-800">Пока ничего не ждёте</p>
            <p className="text-sm text-slate-500 mt-1">Не нашли деталь в поиске? Нажмите «Сообщить, когда появится» — мы напишем, как только продавец её выставит.</p>
            <button type="button" onClick={() => onFindParts({})} className="mt-4 px-5 py-2.5 rounded-lg bg-[#C8102E] text-white font-bold cursor-pointer">Найти запчасть</button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {watches.map((w) => {
              const n = watchCounts.get(w.id) || 0;
              return (
                <li key={w.id} className="px-3 sm:px-5 py-3 flex items-center gap-3 text-sm">
                  <BellRing size={18} className={n ? 'text-emerald-600 shrink-0' : 'text-slate-300 shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate" data-no-i18n>{[w.q, w.brand, w.model].filter(Boolean).join(' · ')}</div>
                    <div className="text-xs text-slate-500">с {new Date(w.createdAt).toLocaleDateString('ru-RU')}</div>
                  </div>
                  {n > 0
                    ? <button type="button" onClick={() => onFindParts({ search: w.q, brand: w.brand, model: w.model })} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap">Есть: {n} →</button>
                    : <span className="text-xs text-slate-400 whitespace-nowrap">пока нет</span>}
                  <button type="button" onClick={() => removeWatch(w.id).then(() => setWatches((v) => v.filter((x) => x.id !== w.id))).catch(() => undefined)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" aria-label="Больше не ждать"><Trash2 size={15} /></button>
                </li>
              );
            })}
          </ul>
        )
      ) : tabRows.length === 0 ? (
        <div className="py-14 px-4 text-center">
          {tab === 'cars' ? (
            user.garage.length === 0 ? (
              <>
                <p className="font-bold text-slate-800">Добавьте свою машину</p>
                <p className="text-sm text-slate-500 mt-1">Здесь появятся подходящие запчасти, новые объявления и напоминания о замене масла.</p>
                <button type="button" onClick={onOpenGarage} className="mt-4 px-5 py-2.5 rounded-lg bg-[#C8102E] text-white font-bold cursor-pointer">+ Добавить автомобиль</button>
              </>
            ) : <p className="text-sm text-slate-500">Для ваших машин пока нет объявлений. Загляните позже — мы отметим новые.</p>
          ) : tab === 'favorites' ? <p className="text-sm text-slate-500">Пока пусто. Нажимайте ♡ на карточках запчастей и автомобилей.</p>
            : <p className="text-sm text-slate-500">Вы ещё ничего не открывали.</p>}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-500">Ничего не найдено. Измените поиск.</div>
      ) : (
        <>
          <div className="hidden sm:grid grid-cols-[64px_minmax(0,1fr)_130px_72px] gap-3 items-center px-5 py-2 text-[11px] text-slate-400 border-b border-slate-100">
            <span>Фото</span><span>Товар</span><span>Цена</span><span />
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.slice(0, shown).map((r) => (
              <li key={r.key} className={`px-3 sm:px-5 py-3 ${r.isNew ? 'bg-emerald-50/40' : ''}`}>
                <div className="grid grid-cols-[64px_minmax(0,1fr)_40px] sm:grid-cols-[64px_minmax(0,1fr)_130px_72px] gap-3 items-center">
                  {r.image ? <img src={r.image} alt="" loading="lazy" className="w-16 h-12 object-cover rounded-md bg-slate-100" /> : <div className="w-16 h-12 rounded-md bg-slate-100" />}
                  <div className="min-w-0">
                    <div className="flex items-start gap-1.5">
                      {r.isNew && <span className="shrink-0 mt-0.5 px-1.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase">Новое</span>}
                      {r.url
                        ? <a href={r.url} onClick={(e) => openRow(r, e)} className="font-bold text-[#1d6fb8] hover:text-[#C8102E] hover:underline line-clamp-2" data-no-i18n>{r.title}</a>
                        : <span className="font-bold text-slate-500 line-clamp-2" data-no-i18n>{r.title}</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate" data-no-i18n>{r.meta}</div>
                    {r.cheaper && r.part && (
                      <button type="button" onClick={() => onFindParts({ search: r.part!.partNumber })} className="text-xs font-bold text-sky-700 hover:underline cursor-pointer inline-flex items-center gap-1">
                        <TrendingDown size={12} />Дешевле у других: от {som(r.cheaper.price)} ({r.cheaper.count})
                      </button>
                    )}
                    <div className="sm:hidden mt-1 font-black text-slate-900 text-[15px]" data-no-i18n>{r.price}</div>
                  </div>
                  <div className="hidden sm:block font-black text-slate-900 whitespace-nowrap" data-no-i18n>{r.price}</div>
                  <div className="flex justify-end gap-1">
                    {r.url && (
                      <button type="button" onClick={() => toggleFav(r)} className={`p-2 rounded-lg cursor-pointer ${r.favorite ? 'text-red-500' : 'text-slate-400 hover:text-red-500'} hover:bg-red-50`} aria-label={r.favorite ? 'Убрать из избранного' : 'В избранное'}>
                        <Heart size={17} className={r.favorite ? 'fill-red-500' : ''} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {filtered.length > shown && (
            <div className="p-3 text-center">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="px-5 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                Показать ещё ({filtered.length - shown})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
