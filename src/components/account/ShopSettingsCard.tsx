import React, { useState } from 'react';
import { Store, Copy, ExternalLink, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { updateProfile, type Account, type ShopBranch } from '../../api/auth';
import { uploadPhoto } from '../../api/upload';
import { openShop, shopPath } from '../../seo/routes';

const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

// Seller fills in the public shop page (/magazin/<id>): where to find them, hours, a map link
export const ShopSettingsCard: React.FC<{ user: Account }> = ({ user }) => {
  const shop = user.shop || { about: '', market: '', container: '', address: '', hours: '', mapUrl: '' };
  const [form, setForm] = useState(shop);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState<'' | 'logoUrl' | 'bannerUrl'>('');
  const isCompany = user.accountType === 'legal';
  const branches: ShopBranch[] = form.branches || [];
  const setBranches = (b: ShopBranch[]) => setForm({ ...form, branches: b });
  const upload = async (key: 'logoUrl' | 'bannerUrl', file?: File) => {
    if (!file) return;
    setUploading(key); setMsg(null);
    try { const url = await uploadPhoto(file, 'part'); setForm((f) => ({ ...f, [key]: url })); }
    catch (err: any) { setMsg({ ok: false, text: err.message }); }
    finally { setUploading(''); }
  };
  const url = `${window.location.origin}${shopPath(user.id)}`;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const u = await updateProfile({ shop: form });
      if (form.mapUrl && !u.shop?.mapUrl) setMsg({ ok: false, text: 'Сохранено, но ссылку на карту не приняли: вставьте ссылку из 2ГИС, Яндекс или Google Карт.' });
      else setMsg({ ok: true, text: 'Страница магазина сохранена' });
    } catch (err: any) { setMsg({ ok: false, text: err.message }); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked */ }
  };

  return (
    <form onSubmit={save} className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
      <div className="flex items-center gap-2 font-bold text-slate-900 text-lg"><Store size={18} className="text-[#C8102E]" />Страница магазина</div>
      <p className="text-sm text-slate-600">Ваша ссылка со всеми товарами. Поставьте её в Instagram, WhatsApp и на визитку.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input readOnly value={url} className={`${inputCls} font-mono text-xs`} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy} className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 shrink-0"><Copy size={14} />{copied ? 'Скопировано' : 'Копировать'}</button>
        <button type="button" onClick={() => openShop(user.id)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 shrink-0"><ExternalLink size={14} />Открыть</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Рынок</label><input value={form.market} onChange={set('market')} maxLength={80} placeholder="Кудайберген" className={inputCls} /></div>
        <div><label className={labelCls}>Контейнер, ряд</label><input value={form.container} onChange={set('container')} maxLength={80} placeholder="Ряд 3, контейнер 12" className={inputCls} /></div>
        <div><label className={labelCls}>Адрес</label><input value={form.address} onChange={set('address')} maxLength={160} placeholder="ул. Жибек Жолу, 1" className={inputCls} /></div>
        <div><label className={labelCls}>Часы работы</label><input value={form.hours} onChange={set('hours')} maxLength={120} placeholder="Вт–Вс 8:30–17:00" className={inputCls} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Ссылка на карту (2ГИС, Яндекс, Google)</label><input value={form.mapUrl} onChange={set('mapUrl')} maxLength={300} placeholder="https://2gis.kg/bishkek/..." className={inputCls} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>О магазине</label><textarea rows={3} value={form.about} onChange={set('about')} maxLength={600} placeholder="Оригинал и контракт на Toyota и Lexus. Подбор по VIN, доставка по городу." className={inputCls} /></div>
      </div>
      {isCompany && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="font-bold text-sm text-slate-900">Оформление компании</div>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
            {([['logoUrl', 'Логотип', 'w-24 h-24 rounded-2xl'], ['bannerUrl', 'Баннер (широкая картинка)', 'w-full h-24 rounded-xl']] as const).map(([key, label, box]) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <label className={`${box} border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#1d6fb8] relative`}>
                  {form[key] ? <img src={form[key]} alt="" className="w-full h-full object-cover" /> : uploading === key ? <Loader2 className="animate-spin text-slate-400" /> : <ImagePlus className="text-slate-400" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(key, e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {form[key] && <button type="button" onClick={() => setForm({ ...form, [key]: '' })} className="text-[11px] text-slate-500 underline mt-1 cursor-pointer">Убрать</button>}
              </div>
            ))}
          </div>
          <div>
            <label className={labelCls}>Филиалы и точки продаж</label>
            <div className="space-y-2">
              {branches.map((b, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_1fr_32px] gap-2">
                  <input value={b.name} onChange={(e) => setBranches(branches.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Название (Дордой Моторс)" className={inputCls} />
                  <input value={b.address} onChange={(e) => setBranches(branches.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} placeholder="Адрес, ряд, контейнер" className={inputCls} />
                  <input value={b.phone} onChange={(e) => setBranches(branches.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} placeholder="Телефон" className={inputCls} />
                  <button type="button" onClick={() => setBranches(branches.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-600 cursor-pointer" aria-label="Удалить филиал"><Trash2 size={15} /></button>
                </div>
              ))}
              {branches.length < 8 && (
                <button type="button" onClick={() => setBranches([...branches, { name: '', address: '', phone: '' }])} className="text-sm font-bold text-[#1d6fb8] hover:underline cursor-pointer inline-flex items-center gap-1"><Plus size={14} />Добавить филиал</button>
              )}
            </div>
          </div>
        </div>
      )}
      {msg && <p className={`text-xs rounded-lg px-3 py-2 border ${msg.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{msg.text}</p>}
      <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer">Сохранить</button>
    </form>
  );
};
