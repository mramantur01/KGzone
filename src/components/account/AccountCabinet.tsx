import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, ListChecks, Heart, History, CarFront, ShoppingBag, Building2, UserCog, ShieldCheck, Users,
  LogOut, Loader2, Trash2, Search, Bell,
} from 'lucide-react';
import type { AutoPartItem, Car } from '../../types/car';
import {
  useAuth, logout, updateProfile, changePassword, submitCompanyForReview, saveGarage, claimAdmin,
  isStaff, formatPhone, COMPANY_STATUS_LABELS, type GarageCar,
} from '../../api/auth';
import { useParts } from '../../api/parts';
import { listMyOrders } from '../../api/myListings';
import { usePartFavorites, togglePartFavorite } from '../../utils/partFavorites';
import { useViewHistory, clearViewHistory } from '../../utils/viewHistory';
import { partFitsModel } from '../../utils/partMatching';
import { ALL_CAR_BRANDS, getModelsForBrand } from '../../data/mockData';
import { KG_CITIES } from '../auth/AuthModal';
import { MyListingsPanel } from './MyListingsPanel';
import { AdminUsersPanel } from './AdminUsersPanel';
import { PartsModerationPanel, CarsModerationPanel } from '../cabinet/PartsModerationPanel';
import { ReportsPanel } from '../cabinet/ReportsPanel';

export interface PartsSearchPreset {
  brand?: string;
  model?: string;
  year?: string;
  search?: string;
}

interface Props {
  cars: Car[];
  favoriteCarIds: string[];
  onToggleCarFavorite: (id: string) => void;
  onSelectCar: (car: Car) => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onSellPart: () => void;
  onSellCar: () => void;
  onFindParts: (preset: PartsSearchPreset) => void;
}

type Section = 'overview' | 'listings' | 'favorites' | 'history' | 'garage' | 'orders' | 'company' | 'profile' | 'moderation' | 'users';

const card = 'p-4 sm:p-5 rounded-2xl bg-white border border-slate-200';
const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

// Remembers how many fitting parts the buyer has already seen for each garage car
const SEEN_KEY = 'kgzone-garage-seen';
const readSeen = (): Record<string, string[]> => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; }
};
const writeSeen = (v: Record<string, string[]>) => {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ }
};

export const AccountCabinet: React.FC<Props> = (props) => {
  const { cars, favoriteCarIds, onToggleCarFavorite, onSelectCar, onOpenAuth, onSellPart, onSellCar, onFindParts } = props;
  const { user, loading } = useAuth();
  const parts = useParts();
  const partFavIds = usePartFavorites();
  const history = useViewHistory();
  const [section, setSection] = useState<Section>('overview');
  const [seen, setSeen] = useState<Record<string, string[]>>(readSeen);

  // Profile form
  const [name, setName] = useState('');
  const [city, setCity] = useState('Бишкек');
  const [email, setEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [showClaim, setShowClaim] = useState(false);

  // Company form
  const [company, setCompany] = useState({ name: '', inn: '', legalAddress: '', actualAddress: '', contactPerson: '', contactPhone: '', contactEmail: '', bankDetails: '' });
  const [companyMsg, setCompanyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Garage form
  const [gBrand, setGBrand] = useState('Toyota');
  const [gModel, setGModel] = useState('');
  const [gYear, setGYear] = useState('');
  const [gVin, setGVin] = useState('');
  const [garageMsg, setGarageMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<any[] | null>(null);

  useEffect(() => {
    setSection('overview');
    if (!user) return;
    setName(user.name);
    setCity(user.city);
    setEmail(user.email);
    if (user.company) {
      const { status, statusComment, submittedAt, reviewedAt, ...rest } = user.company;
      setCompany({ ...company, ...rest });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (section === 'orders' && user) listMyOrders().then(setOrders).catch(() => setOrders([]));
  }, [section, user]);

  // Fitting parts per garage car (live catalog)
  const garageMatches = useMemo(
    () => (user?.garage || []).map((g) => ({ car: g, ids: parts.filter((p) => partFitsModel(p, g.brand, g.model)).map((p) => p.id) })),
    [user?.garage, parts]
  );

  if (loading) {
    return <div className="py-24 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className={`${card} text-center space-y-4`}>
          <UserCog size={40} className="mx-auto text-[#C8102E]" />
          <h1 className="text-xl font-black text-slate-900">Личный кабинет KGzone</h1>
          <p className="text-sm text-slate-600">
            Войдите или зарегистрируйтесь, чтобы продавать запчасти и автомобили, управлять объявлениями, сохранять свои машины для быстрого подбора деталей и следить за заказами.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button type="button" onClick={() => onOpenAuth('login')} className="px-6 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-sm cursor-pointer">Войти</button>
            <button type="button" onClick={() => onOpenAuth('register')} className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer">Регистрация</button>
          </div>
          <p className="text-xs text-slate-500">Регистрация для частных лиц и для компаний (магазины, разборки).</p>
        </div>
      </div>
    );
  }

  const staff = isStaff(user);
  const isLegal = user.accountType === 'legal';
  const newMatches = garageMatches.reduce((n, m) => n + m.ids.filter((id) => !(seen[m.car.id] || []).includes(id)).length, 0);

  const nav: { id: Section; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
    { id: 'listings', label: 'Мои объявления', icon: ListChecks },
    { id: 'favorites', label: 'Избранное', icon: Heart, badge: partFavIds.length + favoriteCarIds.length },
    { id: 'history', label: 'История просмотров', icon: History },
    { id: 'garage', label: 'Мои автомобили', icon: CarFront, badge: newMatches || undefined },
    { id: 'orders', label: 'Мои заказы', icon: ShoppingBag },
    ...(isLegal ? [{ id: 'company' as Section, label: 'Компания', icon: Building2 }] : []),
    { id: 'profile', label: 'Профиль и безопасность', icon: UserCog },
    ...(staff ? [{ id: 'moderation' as Section, label: 'Модерация', icon: ShieldCheck }] : []),
    ...(user.role === 'admin' ? [{ id: 'users' as Section, label: 'Пользователи', icon: Users }] : []),
  ];

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try { await updateProfile({ name, city, email }); setProfileMsg({ ok: true, text: 'Профиль сохранён' }); }
    catch (err: any) { setProfileMsg({ ok: false, text: err.message }); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    try { await changePassword(pwCurrent, pwNext); setPwCurrent(''); setPwNext(''); setPwMsg({ ok: true, text: 'Пароль изменён. На других устройствах нужно войти заново.' }); }
    catch (err: any) { setPwMsg({ ok: false, text: err.message }); }
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyMsg(null);
    try { await updateProfile({ company }); setCompanyMsg({ ok: true, text: 'Данные компании сохранены' }); }
    catch (err: any) { setCompanyMsg({ ok: false, text: err.message }); }
  };

  const sendCompany = async () => {
    setCompanyMsg(null);
    try { await updateProfile({ company }); await submitCompanyForReview(); setCompanyMsg({ ok: true, text: 'Заявка отправлена на проверку' }); }
    catch (err: any) { setCompanyMsg({ ok: false, text: err.message }); }
  };

  const addGarageCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGarageMsg(null);
    if (!gModel.trim()) { setGarageMsg('Укажите модель'); return; }
    const car: GarageCar = { id: `g-${Date.now()}`, brand: gBrand, model: gModel.trim(), year: gYear ? Number(gYear) : undefined, vin: gVin.trim() || undefined };
    try {
      await saveGarage([...(user.garage || []), car]);
      // Parts that already exist are not "new" for a car that was just added
      const ids = parts.filter((p) => partFitsModel(p, car.brand, car.model)).map((p) => p.id);
      const next = { ...seen, [car.id]: ids };
      setSeen(next); writeSeen(next);
      setGModel(''); setGYear(''); setGVin('');
    } catch (err: any) { setGarageMsg(err.message); }
  };

  const findForCar = (g: GarageCar, ids: string[]) => {
    const next = { ...seen, [g.id]: ids };
    setSeen(next); writeSeen(next);
    // Same rule as the match counter: by make and model (the year filter would hide parts listed for a year range)
    onFindParts({ brand: g.brand, model: g.model });
  };

  const favParts: AutoPartItem[] = parts.filter((p) => partFavIds.includes(p.id));
  const favCars = cars.filter((c) => favoriteCarIds.includes(c.id));
  const msg = (m: { ok: boolean; text: string } | null) =>
    m && <p className={`text-xs rounded-lg px-3 py-2 border ${m.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{m.text}</p>;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Navigation */}
        <aside className="lg:col-span-3 space-y-3">
          <div className={card}>
            <div className="font-black text-slate-900" data-no-i18n>{user.company?.name || user.name}</div>
            <div className="text-xs text-slate-500" data-no-i18n>{formatPhone(user.phone)} · {user.city}</div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{isLegal ? 'Юридическое лицо' : 'Физическое лицо'}</span>
              {user.role !== 'user' && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{user.role === 'admin' ? 'Администратор' : 'Модератор'}</span>}
              {user.company?.status === 'verified' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Проверенная компания</span>}
            </div>
          </div>
          <nav className="flex flex-wrap lg:flex-col gap-1.5">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer text-left ${section === n.id ? 'bg-[#C8102E] text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
              >
                <n.icon size={15} className="shrink-0" />
                <span>{n.label}</span>
                {n.badge ? <span className={`ml-auto text-[10px] px-1.5 rounded-full ${section === n.id ? 'bg-white/25' : 'bg-red-100 text-red-700'}`}>{n.badge}</span> : null}
              </button>
            ))}
            <button type="button" onClick={() => logout()} className="px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer bg-white text-slate-500 border border-slate-200 hover:bg-slate-100">
              <LogOut size={15} /><span>Выйти</span>
            </button>
          </nav>
        </aside>

        <main className="lg:col-span-9 space-y-4 min-w-0">
          {section === 'overview' && (
            <>
              <div className={card}>
                <h1 className="text-xl font-black text-slate-900">Здравствуйте, {user.name.split(' ')[0]}!</h1>
                <p className="text-sm text-slate-600 mt-1">Здесь вы управляете объявлениями, избранным, своими автомобилями и заказами.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={onSellPart} className="px-4 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-bold cursor-pointer">+ Продать запчасть</button>
                  <button type="button" onClick={onSellCar} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer">+ Продать авто</button>
                  <button type="button" onClick={() => setSection('listings')} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold cursor-pointer">Мои объявления</button>
                </div>
              </div>

              {isLegal && user.company && user.company.status !== 'verified' && (
                <div className={`${card} border-amber-300 bg-amber-50`}>
                  <div className="text-sm font-bold text-amber-900">Компания: {COMPANY_STATUS_LABELS[user.company.status]}</div>
                  <p className="text-xs text-amber-800 mt-1">
                    {user.company.status === 'pending'
                      ? 'Администратор проверяет данные компании.'
                      : 'Заполните данные компании и отправьте на проверку, чтобы получить отметку «Проверенная компания».'}
                  </p>
                  {user.company.statusComment && <p className="text-xs text-amber-800 mt-1">Комментарий администратора: {user.company.statusComment}</p>}
                  <button type="button" onClick={() => setSection('company')} className="mt-2 text-xs font-bold underline text-amber-900 cursor-pointer">Открыть данные компании</button>
                </div>
              )}

              <div className={card}>
                <div className="flex items-center gap-2 font-bold text-slate-900"><Bell size={16} className="text-[#C8102E]" />Подходящие запчасти для ваших автомобилей</div>
                {garageMatches.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-2">
                    Добавьте свой автомобиль в разделе «Мои автомобили» — здесь будут появляться новые подходящие объявления.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {garageMatches.map(({ car, ids }) => {
                      const fresh = ids.filter((id) => !(seen[car.id] || []).includes(id)).length;
                      return (
                        <div key={car.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-sm" data-no-i18n>
                            <b>{car.brand} {car.model}</b>{car.year ? `, ${car.year}` : ''}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Подходит: {ids.length}</span>
                            {fresh > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">Новых: {fresh}</span>}
                            <button type="button" onClick={() => findForCar(car, ids)} className="px-3 py-1.5 rounded-lg bg-[#C8102E] text-white font-bold cursor-pointer">Смотреть</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {section === 'listings' && <MyListingsPanel onSellPart={onSellPart} onSellCar={onSellCar} />}

          {section === 'favorites' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Избранное</h2>
              {favParts.length === 0 && favCars.length === 0 && (
                <p className={`${card} text-sm text-slate-500 text-center`}>Пока пусто. Нажимайте ♡ на карточках запчастей и автомобилей.</p>
              )}
              {[...favParts.map((p) => ({ kind: 'part' as const, id: p.id, title: p.title, image: p.image, price: `${p.priceKgs.toLocaleString('ru-RU')} сом`, sub: `${p.brand} ${p.model}` })),
                ...favCars.map((c) => ({ kind: 'car' as const, id: c.id, title: c.title, image: c.image, price: `$${c.priceUsd.toLocaleString('ru-RU')}`, sub: c.city }))].map((f) => (
                <div key={f.kind + f.id} className={`${card} !p-3 flex items-center gap-3`}>
                  <img src={f.image} alt="" className="w-20 h-16 object-cover rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">{f.kind === 'part' ? 'Запчасть' : 'Автомобиль'}</div>
                    <div className="font-bold text-sm text-slate-900 line-clamp-1" data-no-i18n>{f.title}</div>
                    <div className="text-xs text-slate-500" data-no-i18n>{f.sub} · <b className="text-[#C8102E]">{f.price}</b></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => (f.kind === 'part' ? onFindParts({ search: f.title }) : onSelectCar(favCars.find((c) => c.id === f.id)!))}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    onClick={() => (f.kind === 'part' ? togglePartFavorite(f.id) : onToggleCarFavorite(f.id))}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                    aria-label="Удалить из избранного"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {section === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-slate-900">История просмотров</h2>
                {history.length > 0 && <button type="button" onClick={clearViewHistory} className="text-xs font-bold text-slate-500 underline cursor-pointer">Очистить</button>}
              </div>
              {history.length === 0 ? (
                <p className={`${card} text-sm text-slate-500 text-center`}>Вы ещё ничего не открывали.</p>
              ) : (
                history.map((h) => {
                  const car = h.kind === 'car' ? cars.find((c) => c.id === h.id) : undefined;
                  return (
                    <div key={h.kind + h.id} className={`${card} !p-3 flex items-center gap-3`}>
                      <img src={h.image} alt="" className="w-20 h-16 object-cover rounded-lg bg-slate-100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-900 line-clamp-1" data-no-i18n>{h.title}</div>
                        <div className="text-xs text-slate-500"><b className="text-[#C8102E]" data-no-i18n>{h.price}</b> · {new Date(h.at).toLocaleString('ru-RU')}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => (car ? onSelectCar(car) : onFindParts({ search: h.title }))}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                      >
                        Открыть
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {section === 'garage' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Мои автомобили</h2>
              <p className="text-sm text-slate-600">Сохраните свои машины — подбор запчастей будет в один клик, а в «Обзоре» появятся новые подходящие объявления.</p>
              {garageMatches.map(({ car, ids }) => {
                const fresh = ids.filter((id) => !(seen[car.id] || []).includes(id)).length;
                return (
                  <div key={car.id} className={`${card} !p-3 flex flex-wrap items-center gap-3`}>
                    <CarFront size={22} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900" data-no-i18n>{car.brand} {car.model}{car.year ? `, ${car.year}` : ''}</div>
                      <div className="text-xs text-slate-500">
                        {car.vin ? <span className="font-mono" data-no-i18n>VIN {car.vin} · </span> : null}Подходящих объявлений: {ids.length}{fresh ? ` (новых: ${fresh})` : ''}
                      </div>
                    </div>
                    <button type="button" onClick={() => findForCar(car, ids)} className="px-3 py-1.5 rounded-lg bg-[#C8102E] text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                      <Search size={12} /><span>Подобрать запчасти</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => saveGarage(user.garage.filter((g) => g.id !== car.id)).catch((e) => setGarageMsg(e.message))}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      aria-label="Удалить автомобиль"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
              {user.garage.length < 10 && (
                <form onSubmit={addGarageCar} className={`${card} grid grid-cols-1 sm:grid-cols-5 gap-3 items-end`}>
                  <div>
                    <label className={labelCls}>Марка</label>
                    <select value={gBrand} onChange={(e) => { setGBrand(e.target.value); setGModel(''); }} className={inputCls} data-no-i18n>
                      {ALL_CAR_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Модель</label>
                    <input list="garage-models" value={gModel} onChange={(e) => setGModel(e.target.value)} placeholder="Camry" className={inputCls} />
                    <datalist id="garage-models">
                      {getModelsForBrand(gBrand).filter((m) => m !== 'Все модели').map((m) => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelCls}>Год</label>
                    <input type="number" min="1950" max={new Date().getFullYear() + 1} value={gYear} onChange={(e) => setGYear(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>VIN (необязательно)</label>
                    <input value={gVin} onChange={(e) => setGVin(e.target.value.toUpperCase())} maxLength={17} className={`${inputCls} font-mono`} />
                  </div>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer">Добавить</button>
                  {garageMsg && <p className="sm:col-span-5 text-xs text-red-600">{garageMsg}</p>}
                </form>
              )}
            </div>
          )}

          {section === 'orders' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Мои заказы</h2>
              {orders === null ? (
                <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>
              ) : orders.length === 0 ? (
                <p className={`${card} text-sm text-slate-500 text-center`}>Заказов пока нет. Заказы, оформленные после входа в аккаунт, появятся здесь.</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className={`${card} !p-3 flex flex-wrap items-center justify-between gap-2`}>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900" data-no-i18n>{o.partTitle}</div>
                      <div className="text-xs text-slate-500"><span data-no-i18n>{o.orderNumber} · {o.storeName}</span> · {o.createdAt}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-[#C8102E]">{Number(o.priceKgs || 0).toLocaleString('ru-RU')} сом</div>
                      <div className="text-xs font-bold text-slate-600">{o.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {section === 'company' && isLegal && user.company && (
            <form onSubmit={saveCompany} className={`${card} space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-slate-900">Компания</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.company.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : user.company.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                  {COMPANY_STATUS_LABELS[user.company.status]}
                </span>
              </div>
              {user.company.statusComment && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Комментарий администратора: {user.company.statusComment}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['name', 'Название компании *'],
                  ['inn', 'ИНН *'],
                  ['legalAddress', 'Юридический адрес *'],
                  ['actualAddress', 'Фактический адрес (склад, магазин)'],
                  ['contactPerson', 'Контактное лицо *'],
                  ['contactPhone', 'Телефон компании'],
                  ['contactEmail', 'Почта компании'],
                ] as [keyof typeof company, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input
                      value={company[key]}
                      onChange={(e) => setCompany((c) => ({ ...c, [key]: key === 'inn' ? e.target.value.replace(/\D/g, '') : e.target.value }))}
                      maxLength={key === 'inn' ? 14 : 200}
                      className={`${inputCls} ${key === 'inn' ? 'font-mono' : ''}`}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Банковские реквизиты (необязательно, видны только вам и администрации)</label>
                  <textarea rows={2} value={company.bankDetails} onChange={(e) => setCompany((c) => ({ ...c, bankDetails: e.target.value }))} maxLength={400} className={inputCls} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Изменение названия или ИНН подтверждённой компании потребует повторной проверки. Загрузка документов появится вместе с защищённым хранилищем файлов; пока администратор может запросить их у вас по телефону.
              </p>
              {msg(companyMsg)}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer">Сохранить</button>
                {['unverified', 'needs_docs', 'rejected'].includes(user.company.status) && (
                  <button type="button" onClick={sendCompany} className="px-4 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-bold cursor-pointer">Отправить на проверку</button>
                )}
              </div>
            </form>
          )}

          {section === 'profile' && (
            <div className="space-y-4">
              <form onSubmit={saveProfile} className={`${card} space-y-3`}>
                <h2 className="text-lg font-black text-slate-900">Профиль</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>{isLegal ? 'Контактное лицо' : 'Имя'}</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Город</label>
                    <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                      {[...new Set([city, ...KG_CITIES])].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Почта</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} className={inputCls} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Телефон: <b data-no-i18n>{formatPhone(user.phone)}</b> {user.phoneVerified ? '(подтверждён)' : '(не подтверждён — подтверждение по SMS появится после подключения SMS-сервиса)'}
                </p>
                {msg(profileMsg)}
                <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer">Сохранить</button>
              </form>

              <form onSubmit={savePassword} className={`${card} space-y-3`}>
                <h2 className="text-lg font-black text-slate-900">Смена пароля</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Текущий пароль</label>
                    <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Новый пароль (от 8 символов)</label>
                    <input type="password" value={pwNext} onChange={(e) => setPwNext(e.target.value)} autoComplete="new-password" minLength={8} required className={inputCls} />
                  </div>
                </div>
                {msg(pwMsg)}
                <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer">Изменить пароль</button>
              </form>

              {user.role !== 'admin' && (
                <div className={card}>
                  <button type="button" onClick={() => setShowClaim((v) => !v)} className="text-xs font-bold text-slate-500 underline cursor-pointer">
                    Я владелец сайта — получить права администратора
                  </button>
                  {showClaim && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setAdminMsg(null);
                        try { await claimAdmin(adminKey); setAdminKey(''); setAdminMsg('Готово: вы администратор.'); }
                        catch (err: any) { setAdminMsg(err.message); }
                      }}
                      className="mt-3 flex flex-col sm:flex-row gap-2"
                    >
                      <input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="Пароль администратора (ADMIN_TOKEN)" autoComplete="off" className={inputCls} />
                      <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold cursor-pointer shrink-0">Подтвердить</button>
                    </form>
                  )}
                  {adminMsg && <p className="text-xs text-slate-600 mt-2">{adminMsg}</p>}
                </div>
              )}
            </div>
          )}

          {section === 'moderation' && staff && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Модерация</h2>
              <CarsModerationPanel />
              <PartsModerationPanel />
              <ReportsPanel />
            </div>
          )}

          {section === 'users' && user.role === 'admin' && <AdminUsersPanel currentUserId={user.id} />}
        </main>
      </div>
    </div>
  );
};
