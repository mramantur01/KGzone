import React, { useEffect, useState } from 'react';
import { X, Loader2, User, Building2, Eye, EyeOff } from 'lucide-react';
import { forgotPassword, login, register, type AccountType } from '../../api/auth';

export const KG_CITIES = ['Бишкек', 'Ош', 'Джалал-Абад', 'Каракол', 'Токмок', 'Нарын', 'Талас', 'Баткен', 'Кара-Балта', 'Кант', 'Балыкчы', 'Узген', 'Кызыл-Кия', 'Чолпон-Ата'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Shown above the form, e.g. "Чтобы подать объявление, войдите" */
  notice?: string | null;
  initialTab?: 'login' | 'register';
  onSuccess?: () => void;
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, notice, initialTab = 'login', onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(initialTab);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // login
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');

  // register
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Бишкек');
  const [password2, setPassword2] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [actualAddress, setActualAddress] = useState('');
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (isOpen) { setTab(initialTab); setError(null); setInfo(null); }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setPassword('');
      setPassword2('');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Ошибка. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => login(loginValue.trim(), password));
  };

  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) { setError('Пароли не совпадают'); return; }
    if (!agree) { setError('Подтвердите согласие с правилами площадки'); return; }
    run(() =>
      register({
        accountType,
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
        password,
        city,
        company: accountType === 'legal'
          ? { name: companyName.trim(), inn: inn.trim(), legalAddress: legalAddress.trim(), actualAddress: actualAddress.trim(), contactPerson: name.trim(), contactPhone: phone, contactEmail: email.trim() }
          : undefined,
      })
    );
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try { await forgotPassword(); } catch (err: any) { setInfo(err?.message); }
  };

  const passwordInput = (value: string, set: (v: string) => void, placeholder: string, autoComplete: string) => (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={tab === 'register' ? 8 : undefined}
        required
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#C8102E] text-white">
          <span className="font-extrabold text-base">
            {tab === 'register' ? 'Регистрация на KGzone' : tab === 'forgot' ? 'Восстановление пароля' : 'Вход в KGzone'}
          </span>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {tab !== 'forgot' && (
          <div className="grid grid-cols-2 border-b border-slate-200 text-sm font-bold">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                className={`py-3 cursor-pointer ${tab === t ? 'text-[#C8102E] border-b-2 border-[#C8102E]' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {notice && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">{notice}</p>}

          {tab === 'login' && (
            <form onSubmit={submitLogin} className="space-y-3">
              <div>
                <label className={labelCls}>Телефон или почта</label>
                <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} placeholder="+996 700 123 456" autoComplete="username" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Пароль</label>
                {passwordInput(password, setPassword, 'Ваш пароль', 'current-password')}
              </div>
              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
              <button type="submit" disabled={busy} className="w-full py-3 bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                {busy && <Loader2 size={16} className="animate-spin" />}
                <span>Войти</span>
              </button>
              <button type="button" onClick={() => { setTab('forgot'); setError(null); setInfo(null); }} className="w-full text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer">
                Забыли пароль?
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <form onSubmit={submitForgot} className="space-y-3">
              <p className="text-sm text-slate-600">
                Восстановление по SMS появится после подключения SMS-сервиса. Сейчас пароль может сбросить администратор сайта, проверив, что номер ваш.
              </p>
              {info && <p className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700">{info}</p>}
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl cursor-pointer">
                Как восстановить доступ
              </button>
              <button type="button" onClick={() => setTab('login')} className="w-full text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer">
                Назад ко входу
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={submitRegister} className="space-y-3">
              <div>
                <span className={labelCls}>Тип аккаунта</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'individual', icon: User, title: 'Физическое лицо', sub: 'Частный продавец или покупатель' },
                    { id: 'legal', icon: Building2, title: 'Юридическое лицо', sub: 'Магазин, компания или разборка' },
                  ] as const).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setAccountType(o.id)}
                      className={`p-3 rounded-xl border-2 text-left cursor-pointer ${accountType === o.id ? 'border-[#C8102E] bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <o.icon size={18} className={accountType === o.id ? 'text-[#C8102E]' : 'text-slate-500'} />
                      <div className="text-xs font-bold mt-1">{o.title}</div>
                      <div className="text-[11px] text-slate-500 leading-tight">{o.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {accountType === 'legal' && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className={labelCls}>Название компании *</label>
                    <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ОсОО «...»" required maxLength={160} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ИНН *</label>
                    <input value={inn} onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="14 цифр" required maxLength={14} className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className={labelCls}>Юридический адрес</label>
                    <input value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} maxLength={200} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Фактический адрес (склад, магазин)</label>
                    <input value={actualAddress} onChange={(e) => setActualAddress(e.target.value)} maxLength={200} className={inputCls} />
                  </div>
                  <p className="text-[11px] text-slate-500">После регистрации компания получит статус «Не подтверждена». Отметка «Проверенная компания» появится только после проверки администратором.</p>
                </div>
              )}

              <div>
                <label className={labelCls}>{accountType === 'legal' ? 'Контактное лицо *' : 'Имя и фамилия *'}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={120} className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Телефон *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996 700 123 456" autoComplete="tel" required className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>Город *</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                    {KG_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Электронная почта</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="необязательно" autoComplete="email" maxLength={120} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Пароль * (не меньше 8 символов)</label>
                {passwordInput(password, setPassword, 'Придумайте пароль', 'new-password')}
              </div>
              <div>
                <label className={labelCls}>Повторите пароль *</label>
                {passwordInput(password2, setPassword2, 'Ещё раз', 'new-password')}
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#C8102E]" />
                <span>Я согласен с правилами площадки: публикую только автозапчасти и автомобили, указываю правдивые данные.</span>
              </label>
              <p className="text-[11px] text-slate-500">Подтверждение телефона по SMS появится после подключения SMS-сервиса.</p>
              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
              <button type="submit" disabled={busy} className="w-full py-3 bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                {busy && <Loader2 size={16} className="animate-spin" />}
                <span>Зарегистрироваться</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
