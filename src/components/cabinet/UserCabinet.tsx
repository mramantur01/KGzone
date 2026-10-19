import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  BuyerOrder,
  SavedCarCheck,
  Car,
  Currency,
  Language,
  RegisteredUser,
  SiteSettings,
  AutoPartItem,
  UserSiteRole,
} from '../../types/car';
import { USD_TO_KGS_RATE, ALL_CAR_BRANDS, PARTS_CATEGORIES } from '../../data/mockData';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import { AnalyticsCharts } from './AnalyticsCharts';
import { adminAddPart } from '../../api/parts';
import {
  User,
  ShoppingBag,
  Heart,
  ShieldCheck,
  Wallet,
  Settings,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Tag,
  Plus,
  Edit3,
  Trash2,
  CreditCard,
  Building,
  Eye,
  Check,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Shield,
  Key,
  Lock,
  LogOut,
  UserPlus,
  Flame,
  Wrench,
  Car as CarIcon,
  Search,
  DollarSign,
  Download,
  Database,
  BarChart3,
  Send,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  UserCheck,
  UserX,
  Package,
} from 'lucide-react';

interface UserCabinetProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  buyerOrders: BuyerOrder[];
  setBuyerOrders: React.Dispatch<React.SetStateAction<BuyerOrder[]>>;
  savedChecks: SavedCarCheck[];
  cars: Car[];
  setCars: React.Dispatch<React.SetStateAction<Car[]>>;
  parts: AutoPartItem[];
  setParts: React.Dispatch<React.SetStateAction<AutoPartItem[]>>;
  registeredUsers: RegisteredUser[];
  setRegisteredUsers: React.Dispatch<React.SetStateAction<RegisteredUser[]>>;
  siteSettings: SiteSettings;
  setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onUpdateCarPrice: (carId: string, newPriceUsd: number) => void;
  onToggleCarUrgent: (carId: string) => void;
  onRemoveCar: (carId: string) => void;
  onSelectCar: (car: Car) => void;
  onOpenAddListing: () => void;
  onOpenCarCheckWithPlate: (plate: string) => void;
  onOpenControlPanel?: () => void;
  onOpenCabinetAuth?: () => void;
  onRequestAdminRole?: () => void;
  currency: Currency;
  language: Language;
}

export const UserCabinet: React.FC<UserCabinetProps> = ({
  user,
  setUser,
  buyerOrders,
  setBuyerOrders,
  savedChecks,
  cars,
  setCars,
  parts,
  setParts,
  registeredUsers,
  setRegisteredUsers,
  siteSettings,
  setSiteSettings,
  onUpdateCarPrice,
  onToggleCarUrgent,
  onRemoveCar,
  onSelectCar,
  onOpenAddListing,
  onOpenCarCheckWithPlate,
  onOpenControlPanel,
  onOpenCabinetAuth,
  onRequestAdminRole,
  currency,
  language,
}) => {
  const isKg = language === 'kg';
  const isOwner = user.siteRole === 'owner';
  const isApprovedAdmin = user.siteRole === 'admin' && user.isApprovedAdmin;
  const hasControlAccess = isOwner || isApprovedAdmin;

  // Main active tab inside cabinet: default to my_ads for regular cabinet experience
  const [activeTab, setActiveTab] = useState<
    'control_panel' | 'my_ads' | 'orders' | 'carcheck' | 'wallet' | 'profile' | 'auth'
  >('my_ads');

  // Enforce access rule: Control Panel is strictly isolated and available ONLY to Owner and Approved Admin
  React.useEffect(() => {
    if (!hasControlAccess && activeTab === 'control_panel') {
      setActiveTab('my_ads');
    }
  }, [hasControlAccess, activeTab]);

  // User's own cars (matched by phone or owner id)
  const userCars = useMemo(() => {
    return cars.filter(
      (c) => c.sellerPhone === user.phone || (isOwner && (c.id === 'car-1' || c.id === 'car-2' || c.id === 'car-13'))
    );
  }, [cars, user.phone, isOwner]);

  // Sub-tab inside Control Panel
  const [controlSubTab, setControlSubTab] = useState<
    'settings' | 'users' | 'cars' | 'parts' | 'requests' | 'analytics'
  >('settings');

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    phone: user.phone,
    email: user.email,
    city: user.city,
  });

  // Auth / Registration state
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '+996 ',
    email: '',
    city: 'Бишкек',
    password: '',
    confirmPassword: '',
    accountType: 'individual',
    requestAdmin: false,
  });
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
  });

  // Wallet top-up state
  const [topUpAmount, setTopUpAmount] = useState('1000');

  // Control Panel: Settings form
  const [tempSettings, setTempSettings] = useState<SiteSettings>(siteSettings);

  // Control Panel: Cars search & price edit
  const [carSearchQuery, setCarSearchQuery] = useState('');
  const [editingPriceCarId, setEditingPriceCarId] = useState<string | null>(null);
  const [tempPriceUsd, setTempPriceUsd] = useState('');

  // Control Panel: Parts search & new part form
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [newPartForm, setNewPartForm] = useState<Partial<AutoPartItem>>({
    title: '',
    brand: 'Toyota',
    model: 'Camry',
    partNumber: '',
    category: 'Ходовая часть',
    priceKgs: 3500,
    market: 'Кудайберген',
    storeName: 'Склад Кудайберген',
    storeLocation: 'Ряд 4, бокс 12',
    storeCity: 'Бишкек',
    sellerPhone: '+996 555 777 999',
    stockCount: 5,
    inStock: true,
  });

  // Control Panel: Users search
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Service requests in Control Panel
  const [serviceRequests, setServiceRequests] = useState([
    {
      id: 'REQ-101',
      type: 'CarCheck проверка',
      clientName: 'Бекболот И.',
      phone: '+996 700 112 233',
      detail: 'Госномер: 01 KG 777 AAA (Land Cruiser 300)',
      date: 'Сегодня, 16:20',
      status: 'Новая' as 'Новая' | 'В работе' | 'Выполнена' | 'Отклонена',
    },
    {
      id: 'REQ-102',
      type: 'Растаможка КР',
      clientName: 'Адилет К.',
      phone: '+996 555 444 888',
      detail: 'Zeekr 001 2024 (Электрокар, 0% ставка)',
      date: 'Сегодня, 15:10',
      status: 'В работе' as 'Новая' | 'В работе' | 'Выполнена' | 'Отклонена',
    },
    {
      id: 'REQ-103',
      type: 'Запись на СТО',
      clientName: 'Азамат Т.',
      phone: '+996 777 888 111',
      detail: '3D Развал-схождение Hunter, Кудайберген бокс 44',
      date: 'Сегодня, 14:00',
      status: 'Выполнена' as 'Новая' | 'В работе' | 'Выполнена' | 'Отклонена',
    },
    {
      id: 'REQ-104',
      type: 'Заказ автозапчастей',
      clientName: 'Дастан С.',
      phone: '+996 708 999 000',
      detail: 'Комплект амортизаторов KYB Excel-G (Camry 70)',
      date: 'Вчера, 18:30',
      status: 'В работе' as 'Новая' | 'В работе' | 'Выполнена' | 'Отклонена',
    },
  ]);

  // Handle Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUser((prev) => ({
      ...prev,
      name: profileForm.name,
      phone: profileForm.phone,
      email: profileForm.email,
      city: profileForm.city,
    }));
    setIsEditingProfile(false);
    showToast('Данные профиля успешно сохранены!');
  };

  // Handle Wallet Top Up
  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(topUpAmount) || 0;
    if (val <= 0) return;
    setUser((prev) => ({
      ...prev,
      walletBalanceKgs: prev.walletBalanceKgs + val,
    }));
    showToast(`Баланс пополнен на +${val.toLocaleString()} сом через MBank / О!Деньги`);
  };

  // Handle Registration Submit
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.phone) {
      showToast('Заполните все обязательные поля');
      return;
    }

    const newUserId = `user-${Date.now()}`;
    const newUserRole: UserSiteRole = regForm.requestAdmin ? 'user' : 'user';

    const newProfile: UserProfile = {
      ...user,
      id: newUserId,
      name: regForm.name,
      phone: regForm.phone,
      email: regForm.email,
      city: regForm.city,
      siteRole: newUserRole,
      isApprovedAdmin: false,
      adminRequestStatus: regForm.requestAdmin ? 'pending' : 'none',
      registeredDate: 'Сегодня',
      walletBalanceKgs: 500, // Welcome bonus
    };

    // Add to registeredUsers list
    const newRegUser: RegisteredUser = {
      id: newUserId,
      name: regForm.name,
      phone: regForm.phone,
      email: regForm.email,
      role: 'user',
      isApproved: false,
      registeredAt: 'Сегодня',
      adsCount: 0,
      status: regForm.requestAdmin ? 'pending_admin' : 'active',
      city: regForm.city,
    };

    setRegisteredUsers((prev) => [newRegUser, ...prev]);
    setUser(newProfile);

    showToast(
      regForm.requestAdmin
        ? 'Регистрация успешна! Заявка на администратора отправлена Владельцу сайта.'
        : 'Регистрация успешна! Добро пожаловать в KGzone!'
    );
    setActiveTab(newProfile.siteRole === 'owner' || newProfile.isApprovedAdmin ? 'control_panel' : 'profile');
  };

  // Quick Demo Account Switchers
  const handleSwitchToOwner = () => {
    const ownerProfile: UserProfile = {
      id: 'user-owner-1',
      name: 'Амантур Беков (Владелец)',
      phone: '+996 555 777 999',
      email: 'mr.amantur@gmail.com',
      city: 'Бишкек',
      registeredDate: 'Январь 2024 г.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      activeRole: 'seller',
      siteRole: 'owner',
      isApprovedAdmin: true,
      adminRequestStatus: 'approved',
      walletBalanceKgs: 25000,
      isPhoneVerified: true,
      activeAdsCount: 14,
      dealsCount: 48,
      rating: 5.0,
    };
    setUser(ownerProfile);
    setActiveTab('control_panel');
    showToast('Авторизован как Владелец сайта: mr.amantur@gmail.com');
  };

  const handleSwitchToApprovedAdmin = () => {
    const adminProfile: UserProfile = {
      id: 'user-admin-daniyar',
      name: 'Данияр Садыков (Администратор)',
      phone: '+996 700 223 344',
      email: 'daniyar.admin@kgzone.kg',
      city: 'Бишкек',
      registeredDate: 'Март 2024 г.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      activeRole: 'seller',
      siteRole: 'admin',
      isApprovedAdmin: true,
      adminRequestStatus: 'approved',
      walletBalanceKgs: 8500,
      isPhoneVerified: true,
      activeAdsCount: 6,
      dealsCount: 22,
      rating: 4.9,
    };
    setUser(adminProfile);
    setActiveTab('control_panel');
    showToast('Авторизован как Одобренный Администратор: Данияр С.');
  };

  const handleSwitchToRegularUser = () => {
    const regularProfile: UserProfile = {
      id: 'user-nurbek',
      name: 'Нурбек Токтогулов (Пользователь)',
      phone: '+996 777 555 333',
      email: 'nurbek.auto@gmail.com',
      city: 'Ош',
      registeredDate: 'Июнь 2024 г.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
      activeRole: 'buyer',
      siteRole: 'user',
      isApprovedAdmin: false,
      adminRequestStatus: 'none',
      walletBalanceKgs: 1200,
      isPhoneVerified: true,
      activeAdsCount: 2,
      dealsCount: 3,
      rating: 4.8,
    };
    setUser(regularProfile);
    setActiveTab('my_ads');
    showToast('Авторизован как Обычный Пользователь: Нурбек Т. (Панель управления скрыта)');
  };

  const handleSwitchToPendingAdmin = () => {
    const pendingProfile: UserProfile = {
      id: 'user-pending-1',
      name: 'Бакытбек Осмонов (Заявка на админа)',
      phone: '+996 772 334 455',
      email: 'bakyt.osh@gmail.com',
      city: 'Ош',
      registeredDate: 'Февраль 2024 г.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      activeRole: 'seller',
      siteRole: 'user',
      isApprovedAdmin: false,
      adminRequestStatus: 'pending',
      walletBalanceKgs: 3400,
      isPhoneVerified: true,
      activeAdsCount: 1,
      dealsCount: 5,
      rating: 4.7,
    };
    setUser(pendingProfile);
    setActiveTab('my_ads');
    showToast('Авторизован: Бакытбек О. (Заявка на админа ожидает одобрения Владельца. Панель управления скрыта)');
  };

  // Request admin rights by regular user
  const handleRequestAdminRole = () => {
    setUser((prev) => ({
      ...prev,
      adminRequestStatus: 'pending',
    }));
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: 'pending_admin' } : u))
    );
    if (onRequestAdminRole) onRequestAdminRole();
    showToast('Заявка на статус Администратора отправлена Владельцу сайта на одобрение!');
  };

  // OWNER ACTION: Approve admin request
  const handleApproveAdmin = (userId: string) => {
    if (!isOwner) {
      showToast('Одобрять администраторов может только Владелец сайта!');
      return;
    }
    setRegisteredUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, role: 'admin' as const, isApproved: true, status: 'active' as const }
          : u
      )
    );
    // If the approved user happens to be the currently logged-in user:
    if (user.id === userId) {
      setUser((prev) => ({ ...prev, siteRole: 'admin', isApprovedAdmin: true, adminRequestStatus: 'approved' }));
    }
    showToast('Пользователь успешно одобрен как Администратор сайта!');
  };

  // OWNER ACTION: Revoke admin status
  const handleRevokeAdmin = (userId: string) => {
    if (!isOwner) {
      showToast('Отозвать права может только Владелец сайта!');
      return;
    }
    setRegisteredUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, role: 'user' as const, isApproved: false, status: 'active' as const }
          : u
      )
    );
    if (user.id === userId) {
      setUser((prev) => ({ ...prev, siteRole: 'user', isApprovedAdmin: false, adminRequestStatus: 'rejected' }));
    }
    showToast('Права администратора отозваны.');
  };

  // OWNER ACTION: Toggle user ban
  const handleToggleUserBan = (userId: string) => {
    if (!isOwner) {
      showToast('Блокировать пользователей может только Владелец сайта!');
      return;
    }
    setRegisteredUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'blocked' ? ('active' as const) : ('blocked' as const) }
          : u
      )
    );
    showToast('Статус блокировки пользователя изменен.');
  };

  // Save Site Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSiteSettings(tempSettings);
    showToast('Настройки сайта сохранены и мгновенно применены!');
  };

  // CAR ACTIONS IN CONTROL PANEL
  const handleSaveCarPrice = (carId: string) => {
    const val = Number(tempPriceUsd);
    if (!val || val <= 0) return;
    setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, priceUsd: val } : c)));
    setEditingPriceCarId(null);
    setTempPriceUsd('');
    showToast(`Цена автомобиля обновлена: $${val.toLocaleString()}`);
  };

  const handleToggleUrgentInPanel = (carId: string) => {
    setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, isUrgent: !c.isUrgent } : c)));
    showToast('Статус «Срочно» изменен');
  };

  const handleDeleteCarInPanel = (carId: string) => {
    if (confirm('Удалить автомобиль из базы портала?')) {
      setCars((prev) => prev.filter((c) => c.id !== carId));
      showToast('Автомобиль удален из базы');
    }
  };

  // PART ACTIONS IN CONTROL PANEL
  const handleCreateNewPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartForm.title || !newPartForm.partNumber) {
      showToast('Заполните название детали и OEM артикул');
      return;
    }

    const created: AutoPartItem = {
      id: `part-${Date.now()}`,
      title: newPartForm.title || 'Автозапчасть',
      brand: newPartForm.brand || 'Toyota',
      model: newPartForm.model || 'Универсал',
      partNumber: newPartForm.partNumber || 'OEM-KG',
      category: newPartForm.category || 'Ходовая часть',
      priceKgs: newPartForm.priceKgs || 3000,
      condition: 'Новый (Оригинал)',
      market: (newPartForm.market as any) || 'Кудайберген',
      storeName: newPartForm.storeName || 'Склад Кудайберген',
      storeLocation: newPartForm.storeLocation || 'Ряд 4, бокс 12',
      storeCity: 'Бишкек',
      sellerPhone: newPartForm.sellerPhone || '+996 555 777 999',
      image: 'https://images.unsplash.com/photo-1767341372150-b9521fec39a3?auto=format&fit=crop&w=800&q=80',
      stockCount: newPartForm.stockCount || 5,
      inStock: true,
      stockStatus: 'В наличии',
    };

    // Saved in the database and published right away (admin password required)
    try {
      await adminAddPart(created);
    } catch (err: any) {
      showToast(err?.status === 401 ? 'Нужен пароль администратора: Панель управления → Автозапчасти → Модерация' : err?.message || 'Ошибка');
      return;
    }
    setIsAddingPart(false);
    showToast('Новая автозапчасть успешно добавлена в каталог Кудайберген!');
  };

  const handleDeletePartInPanel = (partId: string) => {
    if (confirm('Удалить эту автозапчасть из каталога?')) {
      setParts((prev) => prev.filter((p) => p.id !== partId));
      showToast('Запчасть удалена из каталога');
    }
  };

  const handleTogglePartStockInPanel = (partId: string) => {
    setParts((prev) => prev.map((p) => (p.id === partId ? { ...p, inStock: !p.inStock } : p)));
    showToast('Статус наличия запчасти обновлен');
  };

  // Change Service Request Status
  const handleUpdateReqStatus = (reqId: string, newStatus: 'Новая' | 'В работе' | 'Выполнена' | 'Отклонена') => {
    setServiceRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
    );
    showToast(`Статус заявки #${reqId} изменен на «${newStatus}»`);
  };

  // Filtered Cars in Panel
  const filteredCarsInPanel = useMemo(() => {
    if (!carSearchQuery.trim()) return cars;
    const q = carSearchQuery.toLowerCase().trim();
    return cars.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.plateNumber && c.plateNumber.toLowerCase().includes(q))
    );
  }, [cars, carSearchQuery]);

  // Filtered Parts in Panel
  const filteredPartsInPanel = useMemo(() => {
    if (!partSearchQuery.trim()) return parts;
    const q = partSearchQuery.toLowerCase().trim();
    return parts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [parts, partSearchQuery]);

  // Filtered Users in Panel
  const filteredUsersInPanel = useMemo(() => {
    if (!userSearchQuery.trim()) return registeredUsers;
    const q = userSearchQuery.toLowerCase().trim();
    return registeredUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q)
    );
  }, [registeredUsers, userSearchQuery]);

  // Pending Admin Requests for Owner
  const pendingAdminUsers = registeredUsers.filter((u) => u.status === 'pending_admin');

  // Export Database Backup as JSON
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      siteSettings,
      carsCount: cars.length,
      partsCount: parts.length,
      usersCount: registeredUsers.length,
      cars,
      parts,
      registeredUsers,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kgzone_backup_${Date.now()}.json`;
    a.click();
    showToast('Резервная копия базы данных успешно скачана!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-bounce">
          <KochkorMuyuzIcon size={16} color="#FBBF24" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER BANNER: USER IDENTITY & STATUS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-slate-700/80 mb-8 relative overflow-hidden">
        {/* Subtle Kyrgyz ornament watermark */}
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <TundukIcon size={260} color="#FFFFFF" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-xs" title="Телефон верифицирован">
                <Check size={12} strokeWidth={3} />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {user.name}
                </h1>
                
                {/* ROLE BADGE */}
                {isOwner && (
                  <span className="inline-flex items-center gap-1 bg-[#C8102E] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    👑 ВЛАДЕЛЕЦ САЙТА
                  </span>
                )}
                {isApprovedAdmin && !isOwner && (
                  <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    🛡️ ОДОБРЕННЫЙ АДМИН
                  </span>
                )}
                {!hasControlAccess && (
                  <span className="inline-flex items-center gap-1 bg-slate-700 text-slate-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    👤 Пользователь
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 sm:gap-5 text-xs text-slate-300 mt-2 flex-wrap font-medium">
                <span className="flex items-center gap-1 text-slate-400">
                  <Phone size={13} className="text-amber-400" />
                  {user.phone}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin size={13} className="text-red-400" />
                  {user.city}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock size={13} className="text-slate-400" />
                  С нами с {user.registeredDate}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Balance & Account Switcher */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 sm:px-4 sm:py-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                <Wallet size={18} />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Баланс кошелька</div>
                <div className="text-sm sm:text-base font-black text-amber-300 font-mono">
                  {user.walletBalanceKgs.toLocaleString()} СОМ
                </div>
              </div>
            </div>

            {/* EXCLUSIVE HIDDEN CONTROL PANEL BUTTON: VISIBLE ONLY TO OWNER AND APPROVED ADMIN */}
            {hasControlAccess && (
              <button
                onClick={() => {
                  if (onOpenControlPanel) {
                    onOpenControlPanel();
                  } else {
                    setActiveTab('control_panel');
                  }
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-[#C8102E] via-red-800 to-amber-700 hover:from-red-700 hover:to-amber-600 border border-amber-500/50 rounded-2xl text-xs font-black text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 animate-pulse"
                title="Панель управления сайтом (закрытый раздел для владельца и одобренных администраторов)"
              >
                <Shield size={16} className="text-amber-300" />
                <span>Панель управления</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">
                  {isOwner ? 'ВЛАДЕЛЕЦ' : 'АДМИН'}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenCabinetAuth) {
                  onOpenCabinetAuth();
                } else {
                  setActiveTab('auth');
                }
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Сменить аккаунт или зарегистрировать нового пользователя"
            >
              <UserPlus size={15} />
              <span>Сменить аккаунт</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION TABS INSIDE USER CABINET */}
      <div className="flex items-center gap-2 flex-wrap pb-3 mb-6 border-b border-slate-200 dark:border-slate-800">
        
        {/* TAB: CONTROL PANEL (Visible to Owner & Approved Admin) */}
        {hasControlAccess && (
          <button
            onClick={() => setActiveTab('control_panel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
              activeTab === 'control_panel'
                ? 'bg-gradient-to-r from-[#C8102E] to-red-900 text-white shadow-md shadow-red-950/30 ring-2 ring-amber-400/50'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <Shield size={16} className={activeTab === 'control_panel' ? 'text-amber-300' : 'text-amber-500'} />
            <span>Панель управления сайтом</span>
            <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded uppercase">
              {isOwner ? 'ВЛАДЕЛЕЦ' : 'АДМИН'}
            </span>
          </button>
        )}

        {/* TAB: MY CAR LISTINGS */}
        <button
          onClick={() => setActiveTab('my_ads')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
            activeTab === 'my_ads'
              ? 'bg-[#C8102E] text-white shadow-md shadow-red-950/30'
              : 'bg-teal-50/80 dark:bg-slate-800 text-teal-950 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80'
          }`}
        >
          <CarIcon size={16} />
          <span>Мои объявления</span>
          <span className="text-xs px-1.5 py-0.2 bg-teal-200/60 dark:bg-teal-800/60 text-teal-950 dark:text-teal-100 rounded font-semibold">
            {userCars.length}
          </span>
        </button>

        {/* TAB: ORDERS & REQUESTS */}
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#C8102E] text-white shadow-md shadow-red-950/30'
              : 'bg-teal-50/80 dark:bg-slate-800 text-teal-950 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80'
          }`}
        >
          <ShoppingBag size={16} />
          <span>Мои заказы & Заявки</span>
          <span className="text-xs px-1.5 py-0.2 bg-teal-200/60 dark:bg-teal-800/60 text-teal-950 dark:text-teal-100 rounded font-semibold">
            {buyerOrders.length}
          </span>
        </button>

        {/* TAB: CARCHECK CHECKS */}
        <button
          onClick={() => setActiveTab('carcheck')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
            activeTab === 'carcheck'
              ? 'bg-[#C8102E] text-white shadow-md shadow-red-950/30'
              : 'bg-teal-50/80 dark:bg-slate-800 text-teal-950 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80'
          }`}
        >
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>Проверки CarCheck</span>
          <span className="text-xs px-1.5 py-0.2 bg-teal-200/60 dark:bg-teal-800/60 text-teal-950 dark:text-teal-100 rounded font-semibold">
            {savedChecks.length}
          </span>
        </button>

        {/* TAB: WALLET */}
        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
            activeTab === 'wallet'
              ? 'bg-[#C8102E] text-white shadow-md shadow-red-950/30'
              : 'bg-teal-50/80 dark:bg-slate-800 text-teal-950 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80'
          }`}
        >
          <Wallet size={16} />
          <span>Кошелек</span>
        </button>

        {/* TAB: PROFILE */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#C8102E] text-white shadow-md shadow-red-950/30'
              : 'bg-teal-50/80 dark:bg-slate-800 text-teal-950 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80'
          }`}
        >
          <Settings size={16} />
          <span>Профиль & Настройки</span>
        </button>

        {/* TAB: AUTH / REGISTRATION */}
        <button
          onClick={() => setActiveTab('auth')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
            activeTab === 'auth'
              ? 'bg-[#C8102E] text-white shadow-md shadow-red-950/30'
              : 'bg-teal-50/80 dark:bg-slate-800 text-teal-950 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80'
          }`}
        >
          <UserPlus size={16} />
          <span>Регистрация / Вход</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. CONTROL PANEL TAB: FULL SITE MANAGEMENT FOR OWNER & APPROVED ADMIN     */}
      {/* ========================================================================= */}
      {activeTab === 'control_panel' && hasControlAccess && (
        <div className="space-y-6">
          {/* CONTROL PANEL HEADER WITH ROLE NOTICE */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  Панель Управления Сайтом KGzone
                </h2>
                <p className="text-xs text-slate-400">
                  {isOwner
                    ? 'Владелец сайта: полное управление сайтом, автомобилями, запчастями, пользователями и одобрение администраторов.'
                    : 'Администратор: управление каталогами, заказами и модерацией.'}
                </p>
              </div>
            </div>

            {/* Quick backup button */}
            <button
              onClick={handleExportBackup}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
            >
              <Download size={14} />
              <span>Скачать бэкап базы (JSON)</span>
            </button>
          </div>

          {/* SUB-NAVBAR INSIDE CONTROL PANEL */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <button
              onClick={() => setControlSubTab('settings')}
              className={`p-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                controlSubTab === 'settings'
                  ? 'bg-[#C8102E] text-white border-red-600 shadow-md'
                  : 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-xs'
              }`}
            >
              <Settings size={18} className="mx-auto mb-1 text-teal-700 dark:text-teal-300" />
              <span>Настройки сайта</span>
            </button>

            <button
              onClick={() => setControlSubTab('users')}
              className={`p-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border relative ${
                controlSubTab === 'users'
                  ? 'bg-[#C8102E] text-white border-red-600 shadow-md'
                  : 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-xs'
              }`}
            >
              {pendingAdminUsers.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              )}
              <UserCheck size={18} className="mx-auto mb-1 text-teal-700 dark:text-teal-300" />
              <span>Пользователи & Админы</span>
            </button>

            <button
              onClick={() => setControlSubTab('cars')}
              className={`p-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                controlSubTab === 'cars'
                  ? 'bg-[#C8102E] text-white border-red-600 shadow-md'
                  : 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-xs'
              }`}
            >
              <CarIcon size={18} className="mx-auto mb-1 text-teal-700 dark:text-teal-300" />
              <span>Автомобили ({cars.length})</span>
            </button>

            <button
              onClick={() => setControlSubTab('parts')}
              className={`p-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                controlSubTab === 'parts'
                  ? 'bg-[#C8102E] text-white border-red-600 shadow-md'
                  : 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-xs'
              }`}
            >
              <Wrench size={18} className="mx-auto mb-1 text-teal-700 dark:text-teal-300" />
              <span>Автозапчасти ({parts.length})</span>
            </button>

            <button
              onClick={() => setControlSubTab('requests')}
              className={`p-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                controlSubTab === 'requests'
                  ? 'bg-[#C8102E] text-white border-red-600 shadow-md'
                  : 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-xs'
              }`}
            >
              <ShoppingBag size={18} className="mx-auto mb-1 text-teal-700 dark:text-teal-300" />
              <span>Заявки & Заказы ({serviceRequests.length})</span>
            </button>

            <button
              onClick={() => setControlSubTab('analytics')}
              className={`p-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
                controlSubTab === 'analytics'
                  ? 'bg-[#C8102E] text-white border-red-600 shadow-md'
                  : 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-xs'
              }`}
            >
              <BarChart3 size={18} className="mx-auto mb-1 text-teal-700 dark:text-teal-300" />
              <span>Аналитика & Логи</span>
            </button>
          </div>

          {/* SUB-SECTION 1: SITE SETTINGS */}
          {controlSubTab === 'settings' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings size={18} className="text-[#C8102E]" />
                    <span>Общие настройки портала KGzone</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Любые изменения мгновенно применяются для всех посетителей сайта.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Название сайта
                    </label>
                    <input
                      type="text"
                      value={tempSettings.siteTitle}
                      onChange={(e) => setTempSettings({ ...tempSettings, siteTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Официальный телефон поддержки
                    </label>
                    <input
                      type="text"
                      value={tempSettings.contactPhone}
                      onChange={(e) => setTempSettings({ ...tempSettings, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Официальный WhatsApp для связи
                    </label>
                    <input
                      type="text"
                      value={tempSettings.whatsappPhone}
                      onChange={(e) => setTempSettings({ ...tempSettings, whatsappPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Курс доллара НБ КР (USD к сому)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        value={tempSettings.usdToKgsRate}
                        onChange={(e) => setTempSettings({ ...tempSettings, usdToKgsRate: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E] font-bold text-amber-500 font-mono"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">СОМ</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telegram канал / бот для заказов
                    </label>
                    <input
                      type="text"
                      value={tempSettings.telegramChannel}
                      onChange={(e) => setTempSettings({ ...tempSettings, telegramChannel: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Комиссия портала за бронирование (%)
                    </label>
                    <input
                      type="number"
                      value={tempSettings.commissionPercent}
                      onChange={(e) => setTempSettings({ ...tempSettings, commissionPercent: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Главное объявление / Бегущая строка портала
                  </label>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={tempSettings.isAnnouncementActive}
                        onChange={(e) => setTempSettings({ ...tempSettings, isAnnouncementActive: e.target.checked })}
                        className="rounded text-[#C8102E] focus:ring-[#C8102E] w-4 h-4 cursor-pointer"
                      />
                      <span>Показывать объявление на главной странице</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={tempSettings.announcementText}
                    onChange={(e) => setTempSettings({ ...tempSettings, announcementText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
                    placeholder="Например: Скидка 15% на диагностику на СТО до конца месяца!"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Сохранить настройки сайта</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-SECTION 2: USERS & ADMINS MANAGEMENT (WITH OWNER APPROVAL) */}
          {controlSubTab === 'users' && (
            <div className="space-y-6">
              {/* PENDING ADMIN APPLICATIONS FOR OWNER APPROVAL */}
              {pendingAdminUsers.length > 0 && (
                <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={20} className="text-amber-500" />
                    <h4 className="font-extrabold text-sm sm:text-base text-amber-900 dark:text-amber-300">
                      Заявки на получение статуса Администратора ({pendingAdminUsers.length})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                    Только Владелец сайта может одобрить или отклонить предоставление прав администратора:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingAdminUsers.map((applicant) => (
                      <div
                        key={applicant.id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {applicant.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {applicant.phone} • {applicant.email} • {applicant.city}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleApproveAdmin(applicant.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Одобрить администратора"
                          >
                            <UserCheck size={14} />
                            <span>Одобрить</span>
                          </button>
                          <button
                            onClick={() => handleRevokeAdmin(applicant.id)}
                            className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-100 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            title="Отклонить"
                          >
                            <UserX size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ALL REGISTERED USERS TABLE */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCheck size={18} className="text-[#C8102E]" />
                      <span>Зарегистрированные пользователи портала ({registeredUsers.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Управление ролями, блокировкой и правами доступа.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Поиск по имени, email, телефону..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="px-3.5 py-2 pl-9 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs w-64 focus:outline-hidden"
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Пользователь</th>
                        <th className="py-2.5 px-3">Контакты</th>
                        <th className="py-2.5 px-3">Город</th>
                        <th className="py-2.5 px-3">Роль</th>
                        <th className="py-2.5 px-3">Статус</th>
                        <th className="py-2.5 px-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                      {filteredUsersInPanel.map((regUser) => (
                        <tr key={regUser.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {regUser.name}
                            </div>
                            <div className="text-[11px] text-slate-400">ID: {regUser.id}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div>{regUser.phone}</div>
                            <div className="text-[11px] text-slate-400">{regUser.email}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                            {regUser.city}
                          </td>
                          <td className="py-3 px-3">
                            {regUser.role === 'owner' ? (
                              <span className="bg-[#C8102E] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                Владелец
                              </span>
                            ) : regUser.role === 'admin' && regUser.isApproved ? (
                              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Админ
                              </span>
                            ) : (
                              <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                Пользователь
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {regUser.status === 'blocked' ? (
                              <span className="text-rose-500 font-bold">Заблокирован</span>
                            ) : (
                              <span className="text-emerald-500 font-bold">Активен</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {regUser.role !== 'owner' && isOwner && (
                              <div className="flex items-center justify-end gap-1.5">
                                {regUser.role === 'admin' ? (
                                  <button
                                    onClick={() => handleRevokeAdmin(regUser.id)}
                                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded font-semibold text-[11px] cursor-pointer"
                                  >
                                    Снять админа
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleApproveAdmin(regUser.id)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] cursor-pointer"
                                  >
                                    Сделать админом
                                  </button>
                                )}

                                <button
                                  onClick={() => handleToggleUserBan(regUser.id)}
                                  className={`px-2 py-1 rounded font-semibold text-[11px] cursor-pointer ${
                                    regUser.status === 'blocked'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {regUser.status === 'blocked' ? 'Разблокировать' : 'Бан'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-SECTION 3: CARS CATALOG MANAGEMENT (ALL 40 CARS) */}
          {controlSubTab === 'cars' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CarIcon size={18} className="text-[#C8102E]" />
                    <span>Управление автомобилями портала ({cars.length} авто)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Редактирование цен, статусов «Срочно» и удаление объявлений.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Поиск авто..."
                      value={carSearchQuery}
                      onChange={(e) => setCarSearchQuery(e.target.value)}
                      className="px-3.5 py-2 pl-9 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs w-56 focus:outline-hidden"
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <button
                    onClick={onOpenAddListing}
                    className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#a60d26] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                  >
                    <Plus size={15} />
                    <span>Добавить авто</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Автомобиль</th>
                      <th className="py-2.5 px-3">Госномер</th>
                      <th className="py-2.5 px-3">Город</th>
                      <th className="py-2.5 px-3">Цена</th>
                      <th className="py-2.5 px-3">Статусы</th>
                      <th className="py-2.5 px-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                    {filteredCarsInPanel.map((car) => (
                      <tr key={car.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={car.image}
                              alt={car.title}
                              className="w-12 h-9 rounded-lg object-cover shrink-0"
                            />
                            <div>
                              <div
                                onClick={() => onSelectCar(car)}
                                className="font-bold text-slate-900 dark:text-white hover:text-[#C8102E] cursor-pointer"
                              >
                                {car.title}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {car.year} г. • {car.engineVolume ? `${car.engineVolume} л` : car.fuelType} • {car.mileageKm.toLocaleString()} км
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {car.plateNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{car.city}</td>
                        <td className="py-2.5 px-3">
                          {editingPriceCarId === car.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tempPriceUsd}
                                onChange={(e) => setTempPriceUsd(e.target.value)}
                                className="w-20 px-2 py-1 rounded border text-xs bg-slate-50 dark:bg-slate-900 font-bold"
                                placeholder={String(car.priceUsd)}
                              />
                              <button
                                onClick={() => handleSaveCarPrice(car.id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                ОК
                              </button>
                            </div>
                          ) : (
                            <div className="font-black text-slate-900 dark:text-white font-mono">
                              ${car.priceUsd.toLocaleString()}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {(car.priceUsd * siteSettings.usdToKgsRate).toLocaleString()} сом
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {car.isUrgent && (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded">
                                Срочно
                              </span>
                            )}
                            {car.hasCarCheckPass && (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 rounded">
                                CarCheck
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPriceCarId(car.id);
                                setTempPriceUsd(String(car.priceUsd));
                              }}
                              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                              title="Изменить цену"
                            >
                              <DollarSign size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleUrgentInPanel(car.id)}
                              className={`p-1.5 rounded cursor-pointer ${
                                car.isUrgent
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'hover:bg-slate-200 text-slate-500'
                              }`}
                              title="Переключить статус Срочно"
                            >
                              <Flame size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCarInPanel(car.id)}
                              className="p-1.5 rounded hover:bg-red-100 text-rose-600 cursor-pointer"
                              title="Удалить объявление"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-SECTION 4: AUTO PARTS IN CONTROL PANEL */}
          {controlSubTab === 'parts' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wrench size={18} className="text-[#C8102E]" />
                    <span>Склад и каталог автозапчастей (Кудайберген)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Управление ценами, OEM кодами и добавление деталей в базу.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Поиск запчасти..."
                      value={partSearchQuery}
                      onChange={(e) => setPartSearchQuery(e.target.value)}
                      className="px-3.5 py-2 pl-9 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs w-56 focus:outline-hidden"
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <button
                    onClick={() => setIsAddingPart(!isAddingPart)}
                    className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#a60d26] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                  >
                    <Plus size={15} />
                    <span>{isAddingPart ? 'Скрыть форму' : '+ Добавить деталь'}</span>
                  </button>
                </div>
              </div>

              {/* FORM TO ADD NEW PART */}
              {isAddingPart && (
                <form
                  onSubmit={handleCreateNewPart}
                  className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-700 space-y-4"
                >
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Добавление новой автозапчасти на рынок Кудайберген
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Наименование детали
                      </label>
                      <input
                        type="text"
                        placeholder="Комплект ГРМ, Амортизатор..."
                        value={newPartForm.title}
                        onChange={(e) => setNewPartForm({ ...newPartForm, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        OEM Артикул
                      </label>
                      <input
                        type="text"
                        placeholder="48510-80491"
                        value={newPartForm.partNumber}
                        onChange={(e) => setNewPartForm({ ...newPartForm, partNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Категория
                      </label>
                      <select
                        value={newPartForm.category}
                        onChange={(e) => setNewPartForm({ ...newPartForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800"
                      >
                        {PARTS_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Марка авто
                      </label>
                      <input
                        type="text"
                        placeholder="Toyota, Lexus, Honda..."
                        value={newPartForm.brand}
                        onChange={(e) => setNewPartForm({ ...newPartForm, brand: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Модель авто
                      </label>
                      <input
                        type="text"
                        placeholder="Camry, LC 200, Fit..."
                        value={newPartForm.model}
                        onChange={(e) => setNewPartForm({ ...newPartForm, model: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Цена в СОМ
                      </label>
                      <input
                        type="number"
                        placeholder="3500"
                        value={newPartForm.priceKgs}
                        onChange={(e) => setNewPartForm({ ...newPartForm, priceKgs: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800 font-bold text-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Местоположение на Кудайбергене
                      </label>
                      <input
                        type="text"
                        placeholder="Ряд 4, бокс 12"
                        value={newPartForm.storeLocation}
                        onChange={(e) => setNewPartForm({ ...newPartForm, storeLocation: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Телефон продавца
                      </label>
                      <input
                        type="text"
                        value={newPartForm.sellerPhone}
                        onChange={(e) => setNewPartForm({ ...newPartForm, sellerPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Сохранить запчасть на склад
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* PARTS TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Деталь & OEM</th>
                      <th className="py-2.5 px-3">Совместимость</th>
                      <th className="py-2.5 px-3">Ряд / Бокс</th>
                      <th className="py-2.5 px-3">Цена</th>
                      <th className="py-2.5 px-3">Наличие</th>
                      <th className="py-2.5 px-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                    {filteredPartsInPanel.map((part) => (
                      <tr key={part.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{part.title}</div>
                          <div className="text-[11px] font-mono text-slate-500">OEM: {part.partNumber}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {part.brand} {part.model}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {part.market} • {part.storeLocation}
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white font-mono">
                          {part.priceKgs.toLocaleString()} сом
                          <span className="block text-[10px] text-slate-400 font-normal">
                            ~${Math.round(part.priceKgs / siteSettings.usdToKgsRate)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => handleTogglePartStockInPanel(part.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              part.inStock
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {part.inStock ? 'В наличии' : 'Под заказ'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeletePartInPanel(part.id)}
                            className="p-1.5 rounded hover:bg-red-100 text-rose-600 cursor-pointer"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-SECTION 5: SERVICE REQUESTS & ORDERS */}
          {controlSubTab === 'requests' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#C8102E]" />
                    <span>Все входящие заявки сайта ({serviceRequests.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Запросы CarCheck, растаможки, записи на СТО и заказы автозапчастей.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">№ / Тип</th>
                      <th className="py-2.5 px-3">Клиент</th>
                      <th className="py-2.5 px-3">Детали заявки</th>
                      <th className="py-2.5 px-3">Время</th>
                      <th className="py-2.5 px-3">Статус</th>
                      <th className="py-2.5 px-3 text-right">Управление</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                    {serviceRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{req.id}</div>
                          <div className="text-[11px] text-[#C8102E] font-semibold">{req.type}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{req.clientName}</div>
                          <div className="text-[11px] text-slate-400">{req.phone}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{req.detail}</td>
                        <td className="py-3 px-3 text-slate-500">{req.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              req.status === 'Новая'
                                ? 'bg-amber-100 text-amber-800'
                                : req.status === 'В работе'
                                ? 'bg-blue-100 text-blue-800'
                                : req.status === 'Выполнена'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <select
                            value={req.status}
                            onChange={(e) =>
                              handleUpdateReqStatus(
                                req.id,
                                e.target.value as 'Новая' | 'В работе' | 'Выполнена' | 'Отклонена'
                              )
                            }
                            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 cursor-pointer"
                          >
                            <option value="Новая">Новая</option>
                            <option value="В работе">В работе</option>
                            <option value="Выполнена">Выполнена</option>
                            <option value="Отклонена">Отклонена</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-SECTION 6: ANALYTICS & LOGS */}
          {controlSubTab === 'analytics' && (
            <div className="space-y-6">
              {/* RECHARTS DATA VISUALIZATION SUITE */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <AnalyticsCharts
                  carsCount={cars.length}
                  partsCount={parts.length}
                  usersCount={registeredUsers.length}
                  theme="dark"
                />
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                  Журнал действий администрации (Аудит-лог)
                </h4>
                <div className="space-y-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span>[16:42:10] Владелец mr.amantur@gmail.com обновил настройки сайта (курс USD = 87.50).</span>
                    <span className="text-emerald-500 font-bold">УСПЕХ</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span>[15:18:04] Одобрена заявка на регистрацию администратора: daniyar.admin@kgzone.kg.</span>
                    <span className="text-emerald-500 font-bold">ОДОБРЕНО</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span>[14:05:22] Добавлено новое объявление: Toyota Land Cruiser 300 01 KG 777 AAA.</span>
                    <span className="text-emerald-500 font-bold">ОПУБЛИКОВАНО</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACCESS DENIED FOR UNAUTHORIZED USERS */}
      {activeTab === 'control_panel' && !hasControlAccess && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-8 text-center text-rose-800 dark:text-rose-200 space-y-3">
          <Shield size={44} className="mx-auto text-rose-600 mb-2" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Доступ к Панели Управления скрыт и ограничен
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Панель управления сайтом является отдельным закрытым разделом и доступна исключительно Владельцу сайта и одобренным администраторам.
          </p>
          <button
            onClick={() => setActiveTab('my_ads')}
            className="mt-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-800 transition-colors"
          >
            Вернуться в личный кабинет
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: MY CAR LISTINGS (USER'S OWN CARS)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'my_ads' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Мои объявления о продаже авто
              </h2>
              <p className="text-xs text-slate-500">
                Управляйте своими автомобилями, изменяйте цену и повышайте просмотры.
              </p>
            </div>

            <button
              onClick={onOpenAddListing}
              className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
            >
              <Plus size={16} />
              <span>Подать новое объявление</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {userCars.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
                <CarIcon size={40} className="mx-auto text-slate-400 mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                  У вас пока нет активных объявлений
                </h3>
                <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                  Разместите свой автомобиль на KGzone — это быстро, бесплатно и ваше авто увидят тысячи покупателей по всему Кыргызстану.
                </p>
                <button
                  onClick={onOpenAddListing}
                  className="px-5 py-2.5 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus size={16} />
                  <span>Подать объявление о продаже</span>
                </button>
              </div>
            ) : (
              userCars.map((car) => (
                <div
                  key={car.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-16/10">
                    <img src={car.image} alt={car.title} className="w-full h-full object-cover" />
                    {car.isUrgent && (
                      <span className="absolute top-2 left-2 bg-[#C8102E] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                        СРОЧНО
                      </span>
                    )}
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-xs font-mono font-bold px-2 py-0.5 rounded">
                      ${car.priceUsd.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h4
                        onClick={() => onSelectCar(car)}
                        className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-[#C8102E] cursor-pointer"
                      >
                        {car.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {car.year} г. • {car.city} • Просмотров: {car.viewsCount}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          const newPrice = prompt('Введите новую цену в USD:', String(car.priceUsd));
                          if (newPrice) onUpdateCarPrice(car.id, Number(newPrice));
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Изменить цену
                      </button>

                      <button
                        onClick={() => onToggleCarUrgent(car.id)}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                          car.isUrgent
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {car.isUrgent ? 'Снять «Срочно»' : '+ Срочно'}
                      </button>

                      <button
                        onClick={() => onRemoveCar(car.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: ORDERS & REQUESTS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Мои заказы и заявки
          </h2>
          {buyerOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Заказов пока нет.</p>
          ) : (
            <div className="space-y-3">
              {buyerOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {order.partTitle} ({order.orderNumber})
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {order.storeName} • {order.storeLocation} • Дата: {order.date}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-black text-amber-500 font-mono text-sm">
                      {order.priceKgs.toLocaleString()} сом
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: CARCHECK VEHICLE REPORTS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'carcheck' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" />
              <span>Сохраненные отчеты CarCheck KG</span>
            </h2>
            <button
              onClick={() => onOpenCarCheckWithPlate('01 KG 777 AAA')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
            >
              + Проверить госномер
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedChecks.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenCarCheckWithPlate(item.plateNumber)}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-emerald-500 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-sm px-2 py-0.5 bg-white dark:bg-slate-800 border rounded text-slate-900 dark:text-white">
                    {item.plateNumber}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.checkDate}</span>
                </div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {item.carTitle}
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  Статус: {item.status} {item.finesCount > 0 ? `(${item.finesCount} штрафов)` : '(Без ограничений)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: WALLET & BALANCE TOP-UP                                           */}
      {/* ========================================================================= */}
      {activeTab === 'wallet' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Баланс кошелька KGzone
              </h2>
              <p className="text-xs text-slate-500">
                Используется для поднятия объявлений в топ, отчетов CarCheck и оплаты сервисов.
              </p>
            </div>
            <div className="text-2xl font-black text-amber-500 font-mono">
              {user.walletBalanceKgs.toLocaleString()} СОМ
            </div>
          </div>

          <form onSubmit={handleTopUp} className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Пополнение счета через MBank, Элсом, О!Деньги
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Сумма в сомах"
                className="w-48 px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 font-bold font-mono text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Пополнить баланс
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: PROFILE & SECURITY                                                */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Личные данные и безопасность
            </h2>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
            >
              {isEditingProfile ? 'Отмена' : 'Редактировать'}
            </button>
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold mb-1">ФИО</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Телефон Кыргызстана</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Город</label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Сохранить
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <span className="text-slate-400 block mb-0.5">ФИО</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <span className="text-slate-400 block mb-0.5">Телефон</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{user.phone}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <span className="text-slate-400 block mb-0.5">Email</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{user.email}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                <span className="text-slate-400 block mb-0.5">Город</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{user.city}</span>
              </div>
            </div>
          )}

          {/* Account Role & Control Panel Access Notice */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
              Статус аккаунта и доступ к Панели управления
            </h3>
            {isOwner && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <span className="text-xl">👑</span>
                <div>
                  <div className="font-black text-xs text-amber-700 dark:text-amber-400">
                    Статус: Владелец сайта KGzone
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    У вас наивысший уровень доступа. Панель управления сайтом открыта во вкладке выше и в шапке профиля. Вы можете изменять любые настройки, цены, каталог запчастей и одобрять администраторов.
                  </p>
                </div>
              </div>
            )}

            {isApprovedAdmin && !isOwner && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <Shield size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-xs text-emerald-700 dark:text-emerald-400">
                    Статус: Одобренный Администратор
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Ваша учетная запись одобрена Владельцем сайта. Вам открыт доступ к управлению объявлениями, каталогами автозапчастей и заказами.
                  </p>
                </div>
              </div>
            )}

            {!hasControlAccess && user.adminRequestStatus === 'pending' && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Clock size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-xs text-amber-700 dark:text-amber-400">
                    Заявка на рассмотрении у Владельца сайта
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Вы отправили запрос на права администратора. Панель управления сайтом откроется сразу же, как только Владелец сайта (Амантур Беков) одобрит вашу заявку в своем кабинете.
                  </p>
                </div>
              </div>
            )}

            {!hasControlAccess && user.adminRequestStatus !== 'pending' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Статус: Обычный пользователь (Клиент)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Панель управления сайтом скрыта и доступна исключительно владельцу и одобренным им администраторам.
                  </p>
                </div>
                <button
                  onClick={handleRequestAdminRole}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Запросить права админа
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB: AUTHENTICATION & REGISTRATION HUB                                 */}
      {/* ========================================================================= */}
      {activeTab === 'auth' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Регистрация и Вход в Личный кабинет
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Зарегистрируйтесь как автовладелец, покупатель или запросите права администратора.
            </p>
          </div>

          {/* QUICK DEMO SWITCHERS (FOR INSTANT TESTING) */}
          <div className="bg-slate-900 p-5 rounded-2xl text-white border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Sparkles size={16} />
              <span>Быстрый вход для проверки ролей (1 клик):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={handleSwitchToOwner}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white group-hover:text-amber-300">
                    👑 Владелец сайта
                  </span>
                  <span className="text-[9px] bg-[#C8102E] text-white px-1.5 py-0.2 rounded font-black">
                    FULL
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">mr.amantur@gmail.com</div>
                <div className="text-[10px] text-amber-400 mt-0.5 font-semibold">✓ Панель управления доступна</div>
              </button>

              <button
                onClick={handleSwitchToApprovedAdmin}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white group-hover:text-emerald-300">
                    🛡️ Одобренный Админ
                  </span>
                  <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black">
                    АДМИН
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Данияр Садыков</div>
                <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">✓ Панель управления доступна</div>
              </button>

              <button
                onClick={handleSwitchToPendingAdmin}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white group-hover:text-amber-300">
                    ⏳ Заявка на админа
                  </span>
                  <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-bold">
                    ЖДЕТ
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Бакытбек Осмонов</div>
                <div className="text-[10px] text-rose-400 mt-0.5">🔒 Панель скрыта (ждет решения)</div>
              </button>

              <button
                onClick={handleSwitchToRegularUser}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white group-hover:text-slate-200">
                    👤 Пользователь
                  </span>
                  <span className="text-[9px] bg-slate-600 text-white px-1.5 py-0.2 rounded font-bold">
                    ЮЗЕР
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Нурбек Токтогулов</div>
                <div className="text-[10px] text-slate-400 mt-0.5">🔒 Панель скрыта (обычный клиент)</div>
              </button>
            </div>
          </div>

          {/* TAB SWITCH: REGISTER VS LOGIN */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setAuthMode('register')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
                authMode === 'register'
                  ? 'border-[#C8102E] text-[#C8102E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Новая регистрация
            </button>
            <button
              onClick={() => setAuthMode('login')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
                authMode === 'login'
                  ? 'border-[#C8102E] text-[#C8102E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Вход в кабинет
            </button>
          </div>

          {/* REGISTRATION FORM */}
          {authMode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ФИО *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Аскар Асанов"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Телефон Кыргызстана *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+996 700 123 456"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@gmail.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Город / Регион КР
                  </label>
                  <select
                    value={regForm.city}
                    onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#C8102E]"
                  >
                    <option value="Бишкек">г. Бишкек</option>
                    <option value="Ош">г. Ош</option>
                    <option value="Джалал-Абад">г. Жалал-Абад</option>
                    <option value="Каракол">г. Каракол</option>
                    <option value="Нарын">г. Нарын</option>
                    <option value="Талас">г. Талас</option>
                    <option value="Баткен">г. Баткен</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Пароль
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Повторите пароль
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regForm.confirmPassword}
                    onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* REQUEST ADMIN CHECKBOX */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={regForm.requestAdmin}
                    onChange={(e) => setRegForm({ ...regForm, requestAdmin: e.target.checked })}
                    className="rounded text-[#C8102E] focus:ring-[#C8102E] w-4 h-4 cursor-pointer"
                  />
                  <span>Подать заявку Владельцу сайта на статус Администратора</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  После регистрации Владелец сайта получит уведомление и сможет одобрить ваши права администратора.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#C8102E] hover:bg-[#a60d26] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                Зарегистрироваться в личном кабинете
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const idStr = loginForm.identifier.trim().toLowerCase().replace(/\s+/g, '');
                if (idStr.includes('amantur') || idStr.includes('555777999')) {
                  handleSwitchToOwner();
                } else if (idStr.includes('daniyar') || idStr.includes('azamat') || idStr.includes('admin')) {
                  handleSwitchToApprovedAdmin();
                } else if (idStr.includes('bakyt') || idStr.includes('772334455')) {
                  handleSwitchToPendingAdmin();
                } else {
                  handleSwitchToRegularUser();
                }
              }}
              className="space-y-4 max-w-sm"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email или номер телефона
                </label>
                <input
                  type="text"
                  placeholder="mr.amantur@gmail.com или +996 555 777 999"
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#C8102E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#C8102E]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#C8102E] hover:bg-[#a60d26] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                Войти в личный кабинет
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
