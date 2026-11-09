import React, { useEffect, useMemo, useState } from 'react';
import {
  ListChecks, Heart, History, Building2, Contact, UserCog, ShieldCheck, Users,
  LogOut, Loader2, Trash2, Search, MessageSquare, Upload, Settings, Crown, Menu, X,
} from 'lucide-react';
import { call } from '../../api/admin';
import { MyImportPanel } from './MyImportPanel';
import { MessagesPanel } from '../chat/MessagesPanel';
import { CompanyCabinet } from '../company/CompanyCabinet';
import { CompanyCrm } from '../company/CompanyCrm';
import { useCompany } from '../../api/company';
import { useUnreadMessages } from '../../api/chat';
import type { AutoPartItem, Car } from '../../types/car';
import {
  useAuth, logout, updateProfile, changePassword, submitCompanyForReview, claimAdmin,
  isStaff, formatPhone, COMPANY_STATUS_LABELS,
} from '../../api/auth';
import { useParts } from '../../api/parts';
import { listMyListings } from '../../api/myListings';
import { usePartFavorites, togglePartFavorite } from '../../utils/partFavorites';
import { useViewHistory, clearViewHistory } from '../../utils/viewHistory';
import { ALL_CAR_BRANDS, getModelsForBrand, useCarCatalog } from '../../data/mockData';
import { KG_CITIES } from '../auth/AuthModal';
import { MyListingsPanel } from './MyListingsPanel';
import { AdminUsersPanel } from './AdminUsersPanel';
import { PartsModerationPanel, CarsModerationPanel } from '../cabinet/PartsModerationPanel';
import { ReportsPanel } from '../cabinet/ReportsPanel';
import { CatalogStatusCard } from '../catalog/CatalogStatusCard';
import { PartRequestsPanel } from '../catalog/PartRequestsPanel';
import { ReviewsModerationPanel } from '../cabinet/ReviewsModerationPanel';
import { AdminToolsPanel } from '../cabinet/AdminToolsPanel';
import { SellerRequestsPanel } from '../catalog/SellerRequestsPanel';
import { TelegramCard } from './TelegramCard';
import { DeleteAccountCard } from './DeleteAccountCard';
import { SearchMissesPanel } from '../catalog/SearchMissesPanel';
import { ShopSettingsCard } from './ShopSettingsCard';

export interface PartsSearchPreset {
  brand?: string;
  model?: string;
  year?: string;
  search?: string;
}

interface Props {
  openSection?: { section: 'moderation'; at: number };
  cars: Car[];
  favoriteCarIds: string[];
  onToggleCarFavorite: (id: string) => void;
  onSelectCar: (car: Car) => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onSellPart: () => void;
  onSellCar: () => void;
  onFindParts: (preset: PartsSearchPreset) => void;
}

type Section = 'business' | 'crm' | 'messages' | 'listings' | 'requests' | 'import' | 'favorites' | 'history' | 'company' | 'profile' | 'moderation' | 'users';

const card = 'p-4 sm:p-5 rounded-2xl bg-white border border-slate-200';
const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

export const AccountCabinet: React.FC<Props> = (props) => {
  const { cars, favoriteCarIds, onToggleCarFavorite, onSelectCar, onOpenAuth, onSellPart, onSellCar, onFindParts } = props;
  const { user, loading } = useAuth();
  useCarCatalog();
  const parts = useParts();
  const partFavIds = usePartFavorites();
  const history = useViewHistory();
  const [section, setSection] = useState<Section>(props.openSection?.section || 'listings');
  useEffect(() => { if (props.openSection) setSection(props.openSection.section); }, [props.openSection]);
  const unreadMessages = useUnreadMessages(Boolean(user));
  const biz = useCompany(user?.id);

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

  const [myCount, setMyCount] = useState<number | null>(null);
  const [requestsCount, setRequestsCount] = useState(0);
  const [startChosen, setStartChosen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Phones get a bottom tab bar; the floating assistant button moves above it
  useEffect(() => {
    document.body.classList.add('kgz-bottom-nav');
    return () => document.body.classList.remove('kgz-bottom-nav');
  }, []);

  useEffect(() => {
    setStartChosen(false);
    setMyCount(null);
    if (!user) return;
    listMyListings().then((r) => setMyCount(r.parts.length + r.cars.length)).catch(() => setMyCount(0));
    call<{ requests: unknown[] }>('/api/part-requests/for-me').then((r) => setRequestsCount(r.requests.length)).catch(() => setRequestsCount(0));
    setName(user.name);
    setCity(user.city);
    setEmail(user.email);
    if (user.company) {
      const { status, statusComment, submittedAt, reviewedAt, ...rest } = user.company;
      setCompany({ ...company, ...rest });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // One cabinet for everyone (the seller cabinet); it opens on "Мои объявления" like drom.ru
  useEffect(() => {
    if (startChosen || !user || myCount === null) return;
    setStartChosen(true);
    if (props.openSection) return;
    setSection('listings');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCount, user?.id, startChosen]);

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
            Войдите или зарегистрируйтесь, чтобы продавать запчасти и автомобили и управлять своими объявлениями.
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

  type NavItem = { id: Section; label: string; icon: React.ElementType; badge?: number; muted?: boolean };
  const staffNav: NavItem[] = [
    ...(staff ? [{ id: 'moderation' as Section, label: 'Модерация', icon: ShieldCheck }] : []),
    ...(user.role === 'admin' ? [{ id: 'users' as Section, label: 'Пользователи', icon: Users }] : []),
  ];
  const nav: NavItem[] = [
    { id: 'listings', label: 'Мои объявления', icon: ListChecks, badge: myCount || undefined, muted: true },
    { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: unreadMessages || undefined },
    // Companies: CRM with clients from chats and orders
    ...(biz.info && (biz.info.permissions.includes('messages') || biz.info.permissions.includes('orders.view')) ? [{ id: 'crm' as Section, label: 'Клиенты (CRM)', icon: Contact }] : []),
    { id: 'requests', label: 'Заявки покупателей', icon: Search, badge: requestsCount || undefined },
    biz.info ? { id: 'business', label: 'Бизнес-кабинет', icon: Building2 } : { id: 'import', label: 'Загрузить прайс', icon: Upload },
    ...(isLegal ? [{ id: 'company' as Section, label: 'Данные компании', icon: Building2 }] : []),
    { id: 'profile', label: 'Настройки', icon: Settings },
    ...staffNav,
  ];
  // Favorites and viewed items, in a quiet second group
  const buyerExtras: NavItem[] = [
    { id: 'favorites', label: 'Избранное', icon: Heart, badge: partFavIds.length + favoriteCarIds.length || undefined, muted: true },
    { id: 'history', label: 'История просмотров', icon: History },
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

  const favParts: AutoPartItem[] = parts.filter((p) => partFavIds.includes(p.id));
  const favCars = cars.filter((c) => favoriteCarIds.includes(c.id));
  const msg = (m: { ok: boolean; text: string } | null) =>
    m && <p className={`text-xs rounded-lg px-3 py-2 border ${m.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{m.text}</p>;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-6 pb-24 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Navigation */}
        <aside className="hidden lg:block lg:col-span-3 space-y-3">
          <div className={card}>
            <div className="font-black text-slate-900 flex items-center gap-1.5" data-no-i18n>
              <span>{user.company?.name || user.name}</span>
              {(user.verifiedSeller || user.company?.status === 'verified') && <Crown size={15} className="text-amber-500 fill-amber-400/30 shrink-0" />}
            </div>
            <div className="text-xs text-slate-500" data-no-i18n>{formatPhone(user.phone)} · {user.city}</div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{isLegal ? 'Юридическое лицо' : 'Физическое лицо'}</span>
              {user.role !== 'user' && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{user.role === 'admin' ? 'Администратор' : 'Модератор'}</span>}
              {user.company?.status === 'verified' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Проверенная компания</span>}
              {!isLegal && biz.info && <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800" data-no-i18n>{biz.info.company.name}</span>}
            </div>
          </div>
          <nav className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex lg:flex-col overflow-x-auto">
            {[...nav, ...buyerExtras].map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={`shrink-0 px-4 py-3 text-sm flex items-center gap-2.5 cursor-pointer text-left whitespace-nowrap lg:border-l-[3px] ${i > 0 ? 'lg:border-t lg:border-t-slate-100' : ''} ${buyerExtras.length && i === nav.length ? 'lg:mt-2 lg:border-t-slate-200' : ''} ${section === n.id ? 'lg:border-l-[#C8102E] text-[#C8102E] font-bold bg-red-50/40' : 'lg:border-l-transparent text-slate-700 hover:bg-slate-50'}`}
              >
                <n.icon size={16} className="shrink-0" />
                <span>{n.label}</span>
                {n.badge ? <span className={`ml-auto text-xs font-bold ${n.muted ? 'text-slate-400' : 'px-1.5 rounded-full bg-[#C8102E] text-white'}`}>{n.badge}</span> : null}
              </button>
            ))}
            <button type="button" onClick={() => logout()} className="shrink-0 px-4 py-3 text-sm flex items-center gap-2.5 cursor-pointer text-slate-500 hover:bg-slate-50 lg:border-t lg:border-t-slate-100 lg:border-l-[3px] lg:border-l-transparent whitespace-nowrap">
              <LogOut size={16} /><span>Выйти</span>
            </button>
          </nav>
        </aside>

        <main className="lg:col-span-9 space-y-4 min-w-0">
          {section === 'messages' && <MessagesPanel />}

          {section === 'crm' && biz.info && <CompanyCrm info={biz.info} onOpenMessages={() => setSection('messages')} />}

          {section === 'business' && biz.info && (
            <CompanyCabinet info={biz.info} onChanged={biz.reload} onOpenMessages={() => setSection('messages')} />
          )}

          {section === 'listings' && (
            <MyListingsPanel
              onSellPart={onSellPart}
              onSellCar={onSellCar}
              requestsCount={requestsCount}
              onOpenRequests={() => setSection('requests')}
              onOpenImport={() => setSection(biz.info ? 'business' : 'import')}
            />
          )}

          {section === 'requests' && (
            <div className="space-y-4">
              <SellerRequestsPanel showEmpty />
              <SearchMissesPanel />
            </div>
          )}

          {section === 'import' && <MyImportPanel onDone={() => { setSection('listings'); listMyListings().then((r) => setMyCount(r.parts.length + r.cars.length)).catch(() => undefined); }} />}

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

              <ShopSettingsCard user={user} />

              <TelegramCard user={user} audience="seller" />

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

              <DeleteAccountCard />
            </div>
          )}

          {section === 'moderation' && staff && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Модерация</h2>
              {user.role === 'admin' && <AdminToolsPanel />}
              <PartRequestsPanel />
              <ReviewsModerationPanel />
              <CatalogStatusCard />
              <CarsModerationPanel />
              <PartsModerationPanel />
              <ReportsPanel />
            </div>
          )}

          {section === 'users' && user.role === 'admin' && <AdminUsersPanel currentUserId={user.id} />}
        </main>
      </div>

      {/* Phone: bottom tab bar (like an app) + "Ещё" sheet with the rest of the menu */}
      {(() => {
        const primaryIds: Section[] = ['listings', 'messages', biz.info ? 'crm' : 'requests', biz.info ? 'business' : 'import'];
        const short: Partial<Record<Section, string>> = {
          listings: 'Товары', messages: 'Сообщения', crm: 'Клиенты', requests: 'Заявки', import: 'Прайс', business: 'Бизнес',
          favorites: 'Избранное',
        };
        const all = [...nav, ...buyerExtras];
        const primary = primaryIds.map((id) => all.find((n) => n.id === id)).filter(Boolean) as typeof nav;
        const rest = all.filter((n) => !primaryIds.includes(n.id));
        const go = (id: Section) => { setSection(id); setMoreOpen(false); window.scrollTo({ top: 0 }); };
        return (
          <>
            {moreOpen && (
              <div className="lg:hidden fixed inset-0 z-[45] bg-black/40" onClick={() => setMoreOpen(false)}>
                <div className="absolute bottom-16 inset-x-0 bg-white rounded-t-2xl p-2 pb-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="font-black text-slate-900 flex items-center gap-1.5" data-no-i18n>
                      {user.company?.name || user.name}
                      {(user.verifiedSeller || user.company?.status === 'verified') && <Crown size={14} className="text-amber-500 fill-amber-400/30" />}
                    </span>
                    <button type="button" onClick={() => setMoreOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Закрыть"><X size={18} /></button>
                  </div>
                  {rest.map((n) => (
                    <button key={n.id} type="button" onClick={() => go(n.id)} className={`w-full px-3 py-3 rounded-xl text-left text-[15px] flex items-center gap-3 cursor-pointer ${section === n.id ? 'bg-red-50 text-[#C8102E] font-bold' : 'text-slate-800 hover:bg-slate-50'}`}>
                      <n.icon size={18} className="shrink-0" /><span>{n.label}</span>
                      {n.badge ? <span className="ml-auto text-xs font-bold text-slate-400">{n.badge}</span> : null}
                    </button>
                  ))}
                  <button type="button" onClick={() => logout()} className="w-full px-3 py-3 rounded-xl text-left text-[15px] flex items-center gap-3 cursor-pointer text-slate-500 hover:bg-slate-50 border-t border-slate-100 mt-1">
                    <LogOut size={18} /><span>Выйти</span>
                  </button>
                </div>
              </div>
            )}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[46] bg-white border-t border-slate-200 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
              {primary.map((n) => (
                <button key={n.id} type="button" onClick={() => go(n.id)} className={`relative h-16 flex flex-col items-center justify-center gap-0.5 text-[11px] cursor-pointer ${section === n.id && !moreOpen ? 'text-[#C8102E] font-bold' : 'text-slate-500'}`}>
                  <n.icon size={21} />
                  <span>{short[n.id] || n.label}</span>
                  {n.badge && !n.muted ? <span className="absolute top-1.5 left-1/2 ml-2 min-w-4 h-4 px-1 rounded-full bg-[#C8102E] text-white text-[10px] leading-4 font-bold">{n.badge}</span> : null}
                </button>
              ))}
              <button type="button" onClick={() => setMoreOpen((v) => !v)} className={`h-16 flex flex-col items-center justify-center gap-0.5 text-[11px] cursor-pointer ${moreOpen || rest.some((n) => n.id === section) ? 'text-[#C8102E] font-bold' : 'text-slate-500'}`}>
                <Menu size={21} />
                <span>Ещё</span>
              </button>
            </nav>
          </>
        );
      })()}
    </div>
  );
};
