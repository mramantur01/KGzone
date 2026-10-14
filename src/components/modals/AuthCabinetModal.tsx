import React, { useState } from 'react';
import { Key, X, Check, Phone, Lock, User, MapPin, Sparkles } from 'lucide-react';
import { UserProfile, RegisteredUser } from '../../types/car';

interface AuthCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserProfile) => void;
  registeredUsers: RegisteredUser[];
  onRegisterNewUser?: (newUser: RegisteredUser) => void;
  currentUser: UserProfile;
  promptNotice?: string | null;
  initialTab?: 'login' | 'register';
}

export const AuthCabinetModal: React.FC<AuthCabinetModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  registeredUsers,
  onRegisterNewUser,
  currentUser,
  promptNotice,
  initialTab = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Login form state
  const [loginPhone, setLoginPhone] = useState('+996 555 123 456');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('+996 ');
  const [regCity, setRegCity] = useState('Бишкек');
  const [regPassword, setRegPassword] = useState('');

  // Error & Feedback state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Login Submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // If matches owner email/phone or demo owner:
    if (
      loginPhone.includes('555') ||
      loginPhone.includes('777') ||
      loginPhone.includes('amantur') ||
      loginPhone.includes('+996 555 123 456') ||
      loginPhone.includes('+996 555 777 999')
    ) {
      // Login as Owner
      const ownerUser: UserProfile = {
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
      onSuccessLogin(ownerUser);
      onClose();
      return;
    }

    // Otherwise standard customer login:
    const normalUser: UserProfile = {
      ...currentUser,
      phone: loginPhone || '+996 555 123 456',
      name: currentUser.name || 'Пользователь',
      siteRole: 'user',
      isApprovedAdmin: false,
    };
    onSuccessLogin(normalUser);
    onClose();
  };

  // Handle Register Submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      setErrorMessage('Пожалуйста, заполните имя и телефон');
      return;
    }

    const newId = `user-${Date.now()}`;
    const newRegUser: RegisteredUser = {
      id: newId,
      name: regName,
      phone: regPhone,
      email: `${regPhone.replace(/\D/g, '')}@kgzone.kg`,
      role: 'user',
      isApproved: false,
      registeredAt: 'Сегодня',
      adsCount: 0,
      status: 'active',
      city: regCity,
    };

    if (onRegisterNewUser) {
      onRegisterNewUser(newRegUser);
    }

    const newProfile: UserProfile = {
      ...currentUser,
      id: newId,
      name: regName,
      phone: regPhone,
      city: regCity,
      siteRole: 'user',
      isApprovedAdmin: false,
      adminRequestStatus: 'none',
      walletBalanceKgs: 500, // Welcome bonus
      registeredDate: 'Сегодня',
    };

    onSuccessLogin(newProfile);
    onClose();
  };

  // 1-Click Demo Login as Owner
  const handleDemoOwnerLogin = () => {
    const ownerUser: UserProfile = {
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
    onSuccessLogin(ownerUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity">
      {/* Backdrop click to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Main Card: dark navy, rounded-[28px], exact reproduction of uploaded screenshot */}
      <div className="bg-[#0d1527] border border-slate-800/80 rounded-[28px] max-w-[430px] w-full p-6 sm:p-7 shadow-2xl relative text-white animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header: Key icon in squircle, Title, Subtitle, and Close button */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3.5">
            {/* Squircle container with golden Key icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#142038] border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Key size={22} className="text-amber-400" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                Личный кабинет клиента
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'login' ? 'Вход по телефону и паролю' : 'Быстрая регистрация по номеру'}
              </p>
            </div>
          </div>

          {/* Close button X */}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Optional Prompt Notice (e.g. required for posting ad) */}
        {promptNotice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2.5 shadow-sm">
            <span className="p-1 rounded-lg bg-amber-500 text-slate-950 font-black shrink-0">!</span>
            <span className="font-semibold">{promptNotice}</span>
          </div>
        )}

        {/* Tab Switcher: Вход / Регистрация */}
        <div className="bg-[#060c18] p-1.5 rounded-2xl flex items-center gap-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-center text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-[#E59700] hover:bg-[#d48900] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Вход
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-center text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-[#E59700] hover:bg-[#d48900] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                Номер телефона
              </label>
              <input
                type="text"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="+996 555 123 456"
                className="w-full bg-[#060c18] border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-hidden transition-colors font-medium font-sans"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#060c18] border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-hidden transition-colors font-medium"
              />
            </div>

            {/* Войти Button: Solid warm golden button matching screenshot */}
            <button
              type="submit"
              className="w-full mt-2 py-3.5 rounded-xl bg-[#8A5B12] hover:bg-[#a86e15] active:bg-[#724a0d] text-white font-black text-sm sm:text-base shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Войти</span>
            </button>

            {/* Quick demo 1-click for site owner */}
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={handleDemoOwnerLogin}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles size={12} />
                <span>Войти как Владелец сайта (mr.amantur@gmail.com)</span>
              </button>
            </div>

            {/* Footer with support phone: exact text from screenshot */}
            <div className="text-center text-xs text-slate-400 pt-3">
              Забыли пароль? Позвоните нам:{' '}
              <a
                href="tel:+996700910777"
                className="text-slate-300 hover:text-amber-400 font-semibold transition-colors"
              >
                +996 700 910 777
              </a>
            </div>
          </form>
        ) : (
          /* TAB 2: REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                Ваше имя
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Аскар"
                className="w-full bg-[#060c18] border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-hidden transition-colors font-medium"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                Номер телефона
              </label>
              <input
                type="text"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+996 555 123 456"
                className="w-full bg-[#060c18] border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-hidden transition-colors font-medium"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                Город / Регион КР
              </label>
              <select
                value={regCity}
                onChange={(e) => setRegCity(e.target.value)}
                className="w-full bg-[#060c18] border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-hidden transition-colors font-medium cursor-pointer"
              >
                <option value="Бишкек">Бишкек</option>
                <option value="Ош">Ош</option>
                <option value="Джалал-Абад">Жалал-Абад</option>
                <option value="Каракол">Каракол</option>
                <option value="Нарын">Нарын</option>
                <option value="Талас">Талас</option>
                <option value="Баткен">Баткен</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                Придумайте пароль
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#060c18] border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-hidden transition-colors font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 rounded-xl bg-[#E59700] hover:bg-[#d48900] active:bg-[#b87600] text-slate-950 font-black text-sm sm:text-base shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Зарегистрироваться</span>
            </button>

            <div className="text-center text-xs text-slate-400 pt-2">
              Уже зарегистрированы?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-amber-400 hover:underline font-bold"
              >
                Войти в кабинет
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
