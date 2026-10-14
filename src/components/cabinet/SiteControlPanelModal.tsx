import React, { useState } from 'react';
import { 
  X, BarChart3, Database, Shield, Lock, Bell, Download, FileSpreadsheet, 
  FileText, Send, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, 
  Users, Server, Key, Eye, HelpCircle, HardDrive, MessageCircle, Copy,
  Car as CarIcon, Wrench, Settings, Trash2, Edit3, Plus, Search, Check,
  UserCheck, UserX, Star, DollarSign, ArrowUpRight, Flame, Layers, LockKeyhole
} from 'lucide-react';
import { 
  Car, AutoPartItem, UserProfile, RegisteredUser, SiteSettings, Language, Currency 
} from '../../types/car';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import { AnalyticsCharts } from './AnalyticsCharts';

interface SiteControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchUser?: (user: UserProfile) => void;
  cars: Car[];
  onUpdateCars: (cars: Car[]) => void;
  parts: AutoPartItem[];
  onUpdateParts: (parts: AutoPartItem[]) => void;
  registeredUsers: RegisteredUser[];
  onUpdateUsers: (users: RegisteredUser[]) => void;
  siteSettings: SiteSettings;
  onUpdateSiteSettings: (settings: SiteSettings) => void;
  language: Language;
  currency: Currency;
}

export const SiteControlPanelModal: React.FC<SiteControlPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
  cars,
  onUpdateCars,
  parts,
  onUpdateParts,
  registeredUsers,
  onUpdateUsers,
  siteSettings,
  onUpdateSiteSettings,
  language,
  currency,
}) => {
  const isOwner = currentUser.siteRole === 'owner';
  const isApprovedAdmin = currentUser.siteRole === 'admin' && currentUser.isApprovedAdmin;
  const hasAccess = isOwner || isApprovedAdmin;

  const [activeTab, setActiveTab] = useState<'listings' | 'parts' | 'users' | 'settings' | 'analytics' | 'logs'>('listings');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Search & Filters inside Panel
  const [carSearch, setCarSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [newCarPrice, setNewCarPrice] = useState<string>('');

  // Editing Settings Form
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);

  // New Part Form State
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [newPartForm, setNewPartForm] = useState<Partial<AutoPartItem>>({
    title: '',
    category: 'Ходовая часть',
    brand: 'Toyota',
    model: 'Camry',
    partNumber: '',
    priceKgs: 5000,
    condition: 'Новый (Оригинал)',
    market: 'Кудайберген',
    storeName: 'Склад Кудайберген',
    storeLocation: 'Ряд 4, бокс 12',
    storeCity: 'Бишкек',
    sellerPhone: '+996 555 777 999',
    stockCount: 5,
    inStock: true,
  });

  // Telegram test state
  const [isSendingTg, setIsSendingTg] = useState(false);
  const [tgTestMessage, setTgTestMessage] = useState('🚨 Тест от владельца KGzone: Серверы и база данных функционируют стабильно!');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  if (!isOpen || !hasAccess) return null;

  // 1. CAR MANAGEMENT ACTIONS
  const handleToggleCarUrgent = (carId: string) => {
    const updated = cars.map((c) => (c.id === carId ? { ...c, isUrgent: !c.isUrgent } : c));
    onUpdateCars(updated);
    showToast('Статус «Срочно» обновлен');
  };

  const handleUpdatePrice = (carId: string) => {
    const val = Number(newCarPrice);
    if (!val || val <= 0) return;
    const updated = cars.map((c) => (c.id === carId ? { ...c, priceUsd: val } : c));
    onUpdateCars(updated);
    setEditingCarId(null);
    setNewCarPrice('');
    showToast(`Цена авто обновлена: $${val.toLocaleString()}`);
  };

  const handleDeleteCar = (carId: string) => {
    if (confirm('Вы уверены, что хотите удалить это объявление с сайта?')) {
      onUpdateCars(cars.filter((c) => c.id !== carId));
      showToast('Объявление удалено из базы');
    }
  };

  // 2. PART MANAGEMENT ACTIONS
  const handleDeletePart = (partId: string) => {
    if (confirm('Удалить эту запчасть из каталога?')) {
      onUpdateParts(parts.filter((p) => p.id !== partId));
      showToast('Запчасть удалена');
    }
  };

  const handleTogglePartStock = (partId: string) => {
    const updated = parts.map((p) => (p.id === partId ? { ...p, inStock: !p.inStock } : p));
    onUpdateParts(updated);
    showToast('Статус наличия запчасти изменен');
  };

  const handleCreatePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartForm.title || !newPartForm.partNumber) {
      showToast('Пожалуйста, заполните название и OEM артикул');
      return;
    }

    const created: AutoPartItem = {
      id: `part-custom-${Date.now()}`,
      title: newPartForm.title || '',
      category: newPartForm.category || 'Ходовая часть',
      brand: newPartForm.brand || 'Toyota',
      model: newPartForm.model || 'Универсальный',
      partNumber: newPartForm.partNumber || 'OEM-KG',
      priceKgs: Number(newPartForm.priceKgs) || 5000,
      condition: newPartForm.condition as any || 'Новый (Оригинал)',
      inStock: true,
      stockCount: Number(newPartForm.stockCount) || 3,
      stockStatus: 'В наличии',
      market: newPartForm.market as any || 'Кудайберген',
      storeName: newPartForm.storeName || 'Кудайберген Деталь',
      storeLocation: newPartForm.storeLocation || 'Ряд 2, конт. 15',
      storeCity: 'Бишкек',
      sellerPhone: newPartForm.sellerPhone || '+996 555 777 999',
      image: 'https://images.unsplash.com/photo-1767341372150-b9521fec39a3?auto=format&fit=crop&w=400&q=80',
      deliveryAvailable: true,
    };

    onUpdateParts([created, ...parts]);
    setIsAddingPart(false);
    showToast(`Запчасть «${created.title}» добавлена в каталог!`);
  };

  // 3. USER & ADMIN APPROVAL ACTIONS (Owner Only)
  const handleApproveAdmin = (userId: string) => {
    if (!isOwner) {
      showToast('Ошибка: Только владелец сайта может одобрять администраторов!');
      return;
    }
    const updated = registeredUsers.map((u) => 
      u.id === userId 
        ? { ...u, role: 'admin' as const, isApproved: true, status: 'active' as const } 
        : u
    );
    onUpdateUsers(updated);
    showToast('Пользователь успешно утвержден как Администратор!');
  };

  const handleRevokeAdmin = (userId: string) => {
    if (!isOwner) {
      showToast('Ошибка: Только владелец сайта может отзывать права!');
      return;
    }
    const updated = registeredUsers.map((u) => 
      u.id === userId 
        ? { ...u, role: 'user' as const, isApproved: false, status: 'active' as const } 
        : u
    );
    onUpdateUsers(updated);
    showToast('Права администратора отозваны');
  };

  const handleToggleUserBlock = (userId: string) => {
    const updated = registeredUsers.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'blocked' ? ('active' as const) : ('blocked' as const);
        return { ...u, status: nextStatus };
      }
      return u;
    });
    onUpdateUsers(updated);
    showToast('Статус блокировки пользователя обновлен');
  };

  // 4. SITE SETTINGS ACTIONS
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSiteSettings(settingsForm);
    showToast('Настройки сайта сохранены и применены на всем портале!');
  };

  // 5. EXPORTS
  const handleExportCSV = () => {
    const header = 'ID,Марка,Модель,Год,Цена USD,Город,Госномер,Статус\n';
    const rows = cars.map(
      (c) => `${c.id},"${c.brand}","${c.model}",${c.year},${c.priceUsd},"${c.city}","${c.plateNumber}","Активно"`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kgzone_cars_${Date.now()}.csv`;
    link.click();
    showToast('Отчет CSV успешно выгружен');
  };

  const handleExportExcel = () => {
    const xml = `<?xml version="1.0"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
      <Worksheet ss:Name="Автомобили">
        <Table>
          <Row>
            <Cell><Data ss:Type="String">Марка и Модель</Data></Cell>
            <Cell><Data ss:Type="String">Год</Data></Cell>
            <Cell><Data ss:Type="String">Цена ($)</Data></Cell>
            <Cell><Data ss:Type="String">Госномер</Data></Cell>
            <Cell><Data ss:Type="String">Город</Data></Cell>
          </Row>
          ${cars.map((c) => `
            <Row>
              <Cell><Data ss:Type="String">${c.brand} ${c.model}</Data></Cell>
              <Cell><Data ss:Type="Number">${c.year}</Data></Cell>
              <Cell><Data ss:Type="Number">${c.priceUsd}</Data></Cell>
              <Cell><Data ss:Type="String">${c.plateNumber}</Data></Cell>
              <Cell><Data ss:Type="String">${c.city}</Data></Cell>
            </Row>
          `).join('')}
        </Table>
      </Worksheet>
    </Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kgzone_catalog_${Date.now()}.xls`;
    link.click();
    showToast('Excel файл сформирован');
  };

  const handleSendTelegramTest = () => {
    setIsSendingTg(true);
    setTimeout(() => {
      setIsSendingTg(false);
      showToast('Уведомление успешно отправлено в Telegram канал ' + siteSettings.telegramChannel);
    }, 1200);
  };

  // Filtered views
  const filteredCars = cars.filter(
    (c) =>
      c.brand.toLowerCase().includes(carSearch.toLowerCase()) ||
      c.model.toLowerCase().includes(carSearch.toLowerCase()) ||
      c.plateNumber.toLowerCase().includes(carSearch.toLowerCase()) ||
      c.city.toLowerCase().includes(carSearch.toLowerCase())
  );

  const filteredParts = parts.filter(
    (p) =>
      p.title.toLowerCase().includes(partSearch.toLowerCase()) ||
      p.partNumber.toLowerCase().includes(partSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(partSearch.toLowerCase())
  );

  const filteredUsers = registeredUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-60 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-emerald-400 animate-bounce">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* HEADER BAR */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Панель управления сайтом KGzone</span>
                </h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isOwner
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : isApprovedAdmin
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  {isOwner ? '👑 ВЛАДЕЛЕЦ САЙТА' : isApprovedAdmin ? '🛡️ ОДОБРЕННЫЙ АДМИН' : 'НЕТ ДОСТУПА'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Авторизован: <span className="text-white font-semibold">{currentUser.name}</span> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick switcher to test Owner account if needed */}
            {onSwitchUser && (
              <button
                onClick={() => {
                  if (currentUser.siteRole === 'owner') {
                    // switch to regular user to test restrictions
                    onSwitchUser({
                      ...currentUser,
                      id: 'user-regular-1',
                      name: 'Айбек Темиров (Тест)',
                      email: 'aibek.temirov@mail.ru',
                      siteRole: 'user',
                      isApprovedAdmin: false,
                    });
                    showToast('Переключено на: Обычный пользователь (без прав)');
                  } else {
                    // switch to owner
                    onSwitchUser({
                      ...currentUser,
                      id: 'user-owner-1',
                      name: 'Амантур Беков (Владелец)',
                      email: 'mr.amantur@gmail.com',
                      siteRole: 'owner',
                      isApprovedAdmin: true,
                    });
                    showToast('Переключено на: Владелец сайта (полный доступ)');
                  }
                }}
                className="hidden sm:flex text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-colors"
                title="Переключить роль для тестирования доступа"
              >
                {isOwner ? 'Тест: Стать обычным юзером' : 'Войти как Владелец'}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SECURITY GATE: If not owner and not approved admin */}
        {!hasAccess ? (
          <div className="p-8 sm:p-12 text-center max-w-lg mx-auto my-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800 text-red-500 flex items-center justify-center mb-4">
              <LockKeyhole size={32} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Доступ ограничен</h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Панель управления доступна <b>исключительно владельцу сайта</b> и <b>администраторам, которых лично одобрил владелец</b>.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 text-left mb-6 w-full">
              <div className="font-bold text-white mb-1">Как получить доступ:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Войдите под учетной записью владельца (<span className="text-amber-400 font-mono">mr.amantur@gmail.com</span>)</li>
                <li>Или отправьте заявку на статус администратора в вашем Личном кабинете на рассмотрение владельцу.</li>
              </ul>
            </div>
            {onSwitchUser && (
              <button
                onClick={() => {
                  onSwitchUser({
                    ...currentUser,
                    id: 'user-owner-1',
                    name: 'Амантур Беков (Владелец)',
                    email: 'mr.amantur@gmail.com',
                    siteRole: 'owner',
                    isApprovedAdmin: true,
                  });
                  showToast('Вы авторизованы как Владелец сайта!');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform transform hover:scale-105"
              >
                Войти как Владелец сайта (mr.amantur@gmail.com)
              </button>
            )}
          </div>
        ) : (
          /* FULL ADMIN CONTROL INTERFACE */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* SIDEBAR TABS */}
            <div className="w-full md:w-60 bg-slate-950 border-r border-slate-800 p-3 flex md:flex-col gap-1.5 shrink-0 flex-wrap">
              <button
                onClick={() => setActiveTab('listings')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'listings'
                    ? 'bg-[#C8102E] text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CarIcon size={16} />
                <span>Объявления авто ({cars.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('parts')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'parts'
                    ? 'bg-[#C8102E] text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Wrench size={16} />
                <span>Автозапчасти ({parts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#C8102E] text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users size={16} />
                <span>Пользователи & Админы</span>
                {registeredUsers.some((u) => u.status === 'pending_admin') && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-auto" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#C8102E] text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Settings size={16} />
                <span>Настройки сайта</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#C8102E] text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <BarChart3 size={16} />
                <span>Аналитика & Отчеты</span>
              </button>

              <div className="hidden md:block mt-auto pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <KochkorMuyuzIcon size={12} color="#FBBF24" />
                  <span>KGzone Admin Engine</span>
                </div>
                <span>Версия 2.8 Pro (2026)</span>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-900">
              
              {/* TAB 1: CAR LISTINGS MANAGEMENT */}
              {activeTab === 'listings' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>Управление объявлениями автомобилей</span>
                        <span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono">
                          {filteredCars.length} авто
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Владелец и админы могут изменять цены, статус срочности, модерировать или удалять авто.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Поиск по марке, номеру..."
                          value={carSearch}
                          onChange={(e) => setCarSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500 w-48 sm:w-60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CARS TABLE */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">Автомобиль</th>
                            <th className="p-3">Год / Город</th>
                            <th className="p-3">Госномер</th>
                            <th className="p-3">Цена ($)</th>
                            <th className="p-3">Продавец</th>
                            <th className="p-3 text-right">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredCars.map((car) => (
                            <tr key={car.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={car.image}
                                    alt={car.title}
                                    className="w-10 h-8 object-cover rounded-md border border-slate-700 shrink-0"
                                  />
                                  <div>
                                    <div className="font-bold text-white hover:text-amber-300">
                                      {car.brand} {car.model}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {car.engineVolume ? `${car.engineVolume} л • ` : ''}{car.fuelType} • {car.bodyType}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 text-slate-300">
                                <div>{car.year} г.</div>
                                <div className="text-[10px] text-slate-400">{car.city}</div>
                              </td>

                              <td className="p-3">
                                <span className="bg-white text-slate-900 font-mono font-bold px-1.5 py-0.5 rounded text-[10px] border border-slate-300">
                                  {car.plateNumber}
                                </span>
                              </td>

                              <td className="p-3 font-bold text-emerald-400">
                                {editingCarId === car.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={newCarPrice}
                                      onChange={(e) => setNewCarPrice(e.target.value)}
                                      className="w-20 px-1.5 py-1 bg-slate-900 border border-amber-400 rounded text-xs text-white"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleUpdatePrice(car.id)}
                                      className="p-1 bg-emerald-600 rounded text-white hover:bg-emerald-500"
                                    >
                                      <Check size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span>${car.priceUsd.toLocaleString()}</span>
                                    <button
                                      onClick={() => {
                                        setEditingCarId(car.id);
                                        setNewCarPrice(car.priceUsd.toString());
                                      }}
                                      className="text-slate-500 hover:text-white"
                                      title="Изменить цену"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                  </div>
                                )}
                              </td>

                              <td className="p-3 text-slate-300">
                                <div>{car.sellerName}</div>
                                <div className="text-[10px] text-slate-400">{car.sellerPhone}</div>
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleToggleCarUrgent(car.id)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                      car.isUrgent
                                        ? 'bg-red-950 text-red-400 border border-red-800'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                    title="Переключить статус Срочно"
                                  >
                                    <Flame size={12} className="inline mr-0.5" />
                                    {car.isUrgent ? 'Срочно' : 'Обычное'}
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCar(car.id)}
                                    className="p-1 rounded bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 transition-colors"
                                    title="Удалить объявление"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AUTO PARTS MANAGEMENT */}
              {activeTab === 'parts' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>Управление каталогом автозапчастей</span>
                        <span className="text-xs bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-mono">
                          {parts.length} позиций
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Добавление, редактирование цен, наличия на складах Кудайбергена и Дордой Моторс.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Поиск детали или OEM..."
                          value={partSearch}
                          onChange={(e) => setPartSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500 w-44"
                        />
                      </div>

                      <button
                        onClick={() => setIsAddingPart(!isAddingPart)}
                        className="px-3 py-1.5 bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
                      >
                        <Plus size={14} />
                        <span>Добавить деталь</span>
                      </button>
                    </div>
                  </div>

                  {/* ADD PART FORM (TOGGLEABLE) */}
                  {isAddingPart && (
                    <form onSubmit={handleCreatePart} className="bg-slate-950 p-4 rounded-xl border border-red-900/60 mb-5 animate-fadeIn">
                      <h4 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                        <Wrench size={14} className="text-red-500" />
                        <span>Новая автозапчасть в базу данных</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Название детали *</label>
                          <input
                            type="text"
                            required
                            placeholder="Например: Ступичный подшипник"
                            value={newPartForm.title}
                            onChange={(e) => setNewPartForm({ ...newPartForm, title: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">OEM Артикул / Номер *</label>
                          <input
                            type="text"
                            required
                            placeholder="43550-47011"
                            value={newPartForm.partNumber}
                            onChange={(e) => setNewPartForm({ ...newPartForm, partNumber: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Цена (сом) *</label>
                          <input
                            type="number"
                            required
                            value={newPartForm.priceKgs}
                            onChange={(e) => setNewPartForm({ ...newPartForm, priceKgs: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Марка авто</label>
                          <input
                            type="text"
                            value={newPartForm.brand}
                            onChange={(e) => setNewPartForm({ ...newPartForm, brand: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Рынок / Склад</label>
                          <select
                            value={newPartForm.market}
                            onChange={(e) => setNewPartForm({ ...newPartForm, market: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            <option value="Кудайберген">Кудайберген</option>
                            <option value="Дордой Моторс">Дордой Моторс</option>
                            <option value="База Автозапчастей Ош">База Автозапчастей Ош</option>
                            <option value="Авторазбор Бишкек">Авторазбор Бишкек</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Ряд / Контейнер</label>
                          <input
                            type="text"
                            placeholder="Проход 4, контейнер 12"
                            value={newPartForm.storeLocation}
                            onChange={(e) => setNewPartForm({ ...newPartForm, storeLocation: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingPart(false)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
                        >
                          Сохранить запчасть
                        </button>
                      </div>
                    </form>
                  )}

                  {/* PARTS LIST */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">Запчасть</th>
                            <th className="p-3">OEM / Артикул</th>
                            <th className="p-3">Рынок и Контейнер</th>
                            <th className="p-3">Цена</th>
                            <th className="p-3">Наличие</th>
                            <th className="p-3 text-right">Управление</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredParts.map((part) => (
                            <tr key={part.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-white">{part.title}</div>
                                <div className="text-[10px] text-slate-400">{part.brand} {part.model} • {part.category}</div>
                              </td>
                              <td className="p-3">
                                <span className="font-mono text-amber-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded text-[11px] border border-slate-800">
                                  {part.partNumber}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">
                                <div className="font-semibold">{part.market}</div>
                                <div className="text-[10px] text-slate-400">{part.storeLocation}</div>
                              </td>
                              <td className="p-3 font-bold text-emerald-400">
                                {part.priceKgs.toLocaleString()} сом
                              </td>
                              <td className="p-3">
                                <button
                                  onClick={() => handleTogglePartStock(part.id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                    part.inStock
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-red-950 text-red-400 border border-red-800'
                                  }`}
                                >
                                  {part.inStock ? 'В наличии' : 'Нет в наличии'}
                                </button>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeletePart(part.id)}
                                  className="p-1 rounded bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                                  title="Удалить деталь"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: USERS & ADMIN APPROVALS */}
              {activeTab === 'users' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>Управление пользователями & Одобрение администраторов</span>
                        <span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono">
                          {registeredUsers.length} пользователей
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isOwner 
                          ? 'Как Владелец сайта, вы можете одобрять или отзывать права доступа в Панель управления.'
                          : 'Просмотр пользователей системы. Назначение админов закреплено за Владельцем.'}
                      </p>
                    </div>

                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Поиск по имени, email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-red-500 w-48"
                      />
                    </div>
                  </div>

                  {/* USERS TABLE */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">Пользователь</th>
                            <th className="p-3">Email & Телефон</th>
                            <th className="p-3">Роль в системе</th>
                            <th className="p-3">Статус доступа</th>
                            <th className="p-3 text-right">Управление (Владелец)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredUsers.map((user) => {
                            const isUserOwner = user.role === 'owner';
                            const isUserApprovedAdmin = user.role === 'admin' && user.isApproved;
                            const isPending = user.status === 'pending_admin';

                            return (
                              <tr key={user.id} className="hover:bg-slate-900/60 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{user.name}</span>
                                    {isUserOwner && <span className="text-amber-400" title="Владелец">👑</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-400">Город: {user.city} • Зарегистрирован: {user.registeredAt}</div>
                                </td>

                                <td className="p-3 text-slate-300">
                                  <div>{user.email}</div>
                                  <div className="text-[10px] text-slate-400">{user.phone}</div>
                                </td>

                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isUserOwner
                                      ? 'bg-amber-400 text-slate-950 font-black'
                                      : isUserApprovedAdmin
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : isPending
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {isUserOwner ? 'Владелец сайта' : isUserApprovedAdmin ? 'Одобренный Админ' : isPending ? 'Заявка на админа' : 'Пользователь'}
                                  </span>
                                </td>

                                <td className="p-3">
                                  {user.status === 'blocked' ? (
                                    <span className="text-red-400 font-bold text-[11px]">Заблокирован</span>
                                  ) : isUserApprovedAdmin || isUserOwner ? (
                                    <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                                      <CheckCircle2 size={12} /> Полный доступ
                                    </span>
                                  ) : isPending ? (
                                    <span className="text-amber-400 text-[11px]">Ожидает одобрения</span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">Только кабинет</span>
                                  )}
                                </td>

                                <td className="p-3 text-right">
                                  {!isUserOwner && isOwner && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      {isPending || (!isUserApprovedAdmin && user.role !== 'admin') ? (
                                        <button
                                          onClick={() => handleApproveAdmin(user.id)}
                                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                                          title="Одобрить статус администратора"
                                        >
                                          <UserCheck size={12} />
                                          <span>Одобрить админа</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleRevokeAdmin(user.id)}
                                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 font-bold text-[10px] flex items-center gap-1"
                                          title="Отозвать права администратора"
                                        >
                                          <UserX size={12} />
                                          <span>Отозвать админа</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleToggleUserBlock(user.id)}
                                        className={`p-1 rounded text-xs ${
                                          user.status === 'blocked'
                                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                            : 'bg-slate-800 text-slate-400 hover:text-red-400'
                                        }`}
                                        title={user.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                                      >
                                        <Lock size={12} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GLOBAL SITE SETTINGS */}
              {activeTab === 'settings' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Settings size={18} className="text-red-500" />
                      <span>Глобальные настройки и контент сайта</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Изменения здесь применяются мгновенно на всем сайте (курс сома, контакты, бегущая строка, Telegram-бот).
                    </p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-4 max-w-3xl">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <DollarSign size={14} />
                        <span>Курс валюты и финансы портала</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Курс доллара США к сому (НБ КР)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={settingsForm.usdToKgsRate}
                              onChange={(e) => setSettingsForm({ ...settingsForm, usdToKgsRate: Number(e.target.value) })}
                              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono font-bold w-full"
                            />
                            <span className="text-xs text-slate-400 shrink-0">сом / 1 $</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Комиссия за безопасную сделку (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={settingsForm.commissionPercent}
                            onChange={(e) => setSettingsForm({ ...settingsForm, commissionPercent: Number(e.target.value) })}
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <Smartphone size={14} />
                        <span>Контакты администрации & WhatsApp</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">Телефон сайта</label>
                          <input
                            type="text"
                            value={settingsForm.contactPhone}
                            onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">WhatsApp для связи с клиентами</label>
                          <input
                            type="text"
                            value={settingsForm.whatsappPhone}
                            onChange={(e) => setSettingsForm({ ...settingsForm, whatsappPhone: e.target.value })}
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Bell size={14} />
                        <span>Интеграция с Telegram-ботом заказов</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">Telegram Bot Token</label>
                          <input
                            type="text"
                            value={settingsForm.telegramBotToken}
                            onChange={(e) => setSettingsForm({ ...settingsForm, telegramBotToken: e.target.value })}
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">Канал / Чат ID</label>
                          <input
                            type="text"
                            value={settingsForm.telegramChannel}
                            onChange={(e) => setSettingsForm({ ...settingsForm, telegramChannel: e.target.value })}
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono w-full"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendTelegramTest}
                        disabled={isSendingTg}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send size={13} className="text-blue-400" />
                        <span>{isSendingTg ? 'Отправка...' : 'Отправить тестовое уведомление в Telegram'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all"
                      >
                        Сохранить все настройки
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 5: ANALYTICS & EXPORT */}
              {activeTab === 'analytics' && (
                <div>
                  <div className="mb-5">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <BarChart3 size={18} className="text-emerald-400" />
                      <span>Аналитика портала и экспорт отчетов</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Экспорт данных в Excel / CSV, аудит действий и создание резервных копий.
                    </p>
                  </div>

                  {/* METRIC TILES */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">Авто в базе</div>
                      <div className="text-2xl font-black text-white mt-1">{cars.length}</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">100% активны в каталоге</div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">Запчастей на складах</div>
                      <div className="text-2xl font-black text-amber-400 mt-1">{parts.length}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Кудайберген / Дордой</div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">Зарегистрировано юзеров</div>
                      <div className="text-2xl font-black text-blue-400 mt-1">{registeredUsers.length}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Бишкек, Ош, регионы</div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400">Проверок CarCheck KG</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">1,480+</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">База ГУОБДД МВД КР</div>
                    </div>
                  </div>

                  {/* INTERACTIVE RECHARTS VISUALIZATION SUITE */}
                  <div className="mb-6">
                    <AnalyticsCharts
                      carsCount={cars.length}
                      partsCount={parts.length}
                      usersCount={registeredUsers.length}
                      theme="dark"
                    />
                  </div>

                  {/* EXPORT BUTTONS */}
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 mb-6">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                      <Download size={14} className="text-red-500" />
                      <span>Выгрузка данных для бухгалтерии и отчетов</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet size={15} />
                        <span>Экспорт в Excel (.xls)</span>
                      </button>

                      <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-700 shadow-md cursor-pointer transition-colors"
                      >
                        <FileText size={15} />
                        <span>Экспорт в CSV (.csv)</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-700 shadow-md cursor-pointer transition-colors"
                      >
                        <Download size={15} />
                        <span>Печать / Сохранить в PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
