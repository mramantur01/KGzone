import React, { useEffect, useState } from 'react';
import { Megaphone, ImagePlus, Loader2, CheckCircle2, Eye, MousePointerClick, CalendarDays } from 'lucide-react';
import type { Language } from '../../types/car';
import { loadAdPrices, sendAdRequest, bishkekToday, AD_PERIOD_LABELS, AD_PLACE_LABELS, AD_PLACE_HINTS, AD_PLACES, type AdPeriod, type AdPrices } from '../../api/ads';
import type { BannerPlace } from '../../api/banner';
import { uploadPhoto } from '../../api/upload';

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';
const price = (n: number) => (n > 0 ? `${n.toLocaleString('ru-RU')} сом` : 'по договорённости');

// /reklama: places, the owner's prices and a request form. Payment is agreed with KGzone directly.
export const AdvertisePage: React.FC<{ language: Language }> = ({ language }) => {
  const isKg = language === 'kg';
  const [prices, setPrices] = useState<AdPrices | null>(null);
  const [form, setForm] = useState({ name: '', phone: '+996 ', business: '', place: 'parts' as BannerPlace, period: 'week' as AdPeriod, startDate: bishkekToday(), title: '', text: '', href: '', image: '', comment: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => { loadAdPrices().then(setPrices).catch(() => undefined); }, []);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy('img'); setError(null);
    try { const url = await uploadPhoto(file, 'part'); setForm((f) => ({ ...f, image: url })); }
    catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('send'); setError(null);
    try { await sendAdRequest({ ...form, image: form.image || undefined }); setSent(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (err: any) { setError(err.message); } finally { setBusy(''); }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        <div className="py-2 border-y border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#C8102E]">{isKg ? 'KGzone • Жарнама' : 'KGzone • Реклама'}</div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">{isKg ? 'KGzone’до жарнама' : 'Реклама на KGzone'}</h1>
          <p className="text-xs text-slate-500">{isKg ? 'Дүкөнүңүздү, СТОңузду же кызматыңызды автотетик издегендердин баарына көрсөтүңүз' : 'Покажите магазин, СТО или услугу всем, кто ищет запчасти и ремонт'}</p>
        </div>

        {sent && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{isKg ? 'Өтүнмө жөнөтүлдү! KGzone сиз менен телефон аркылуу байланышып, баасын жана төлөмдү макулдашат. Төлөгөндөн кийин жарнамаңыз тандалган күндөн баштап көрсөтүлөт.' : 'Заявка отправлена! KGzone свяжется с вами по телефону, чтобы согласовать оплату. После оплаты ваша реклама начнёт показываться с выбранного дня.'}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          {AD_PLACES.map((pl) => (
            <div key={pl} className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="font-black text-slate-900">{AD_PLACE_LABELS[pl]}</div>
              <p className="text-xs text-slate-500 mt-1">{AD_PLACE_HINTS[pl]}</p>
              <div className="mt-2 text-sm">
                <div>1 неделя: <b>{prices ? price(prices[`${pl}Week`]) : '…'}</b></div>
                <div>1 месяц: <b>{prices ? price(prices[`${pl}Month`]) : '…'}</b></div>
              </div>
            </div>
          ))}
        </div>
        {prices?.note && <p className="text-xs text-slate-600" data-no-i18n>{prices.note}</p>}

        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2"><CalendarDays size={16} className="text-[#C8102E] shrink-0" />Включается и выключается в ваши даты</div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2"><Eye size={16} className="text-[#C8102E] shrink-0" />Считаем показы</div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2"><MousePointerClick size={16} className="text-[#C8102E] shrink-0" />Считаем нажатия</div>
        </div>

        {!sent && (
          <form onSubmit={submit} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 font-black text-slate-900"><Megaphone size={18} className="text-[#C8102E]" />{isKg ? 'Жарнамага өтүнмө' : 'Заявка на рекламу'}</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Ваше имя *</label><input value={form.name} onChange={set('name')} required maxLength={80} className={inputCls} /></div>
              <div><label className={labelCls}>Телефон / WhatsApp *</label><input value={form.phone} onChange={set('phone')} required maxLength={30} inputMode="tel" className={inputCls} /></div>
              <div><label className={labelCls}>Название бизнеса</label><input value={form.business} onChange={set('business')} maxLength={80} placeholder="Шиномонтаж «Дөңгөлөк»" className={inputCls} /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Где показывать</label>
                <select value={form.place} onChange={set('place')} className={inputCls}>{AD_PLACES.map((p) => <option key={p} value={p}>{AD_PLACE_LABELS[p]}</option>)}</select></div>
              <div><label className={labelCls}>Срок</label>
                <select value={form.period} onChange={set('period')} className={inputCls}>{(Object.keys(AD_PERIOD_LABELS) as AdPeriod[]).map((p) => <option key={p} value={p}>{AD_PERIOD_LABELS[p]}</option>)}</select></div>
              <div><label className={labelCls}>С какого дня</label><input type="date" value={form.startDate} min={bishkekToday()} onChange={set('startDate')} className={inputCls} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Заголовок рекламы</label><input value={form.title} onChange={set('title')} maxLength={90} placeholder="Шиномонтаж без очереди" className={inputCls} /></div>
              <div><label className={labelCls}>Ссылка (Instagram, сайт, WhatsApp)</label><input value={form.href} onChange={set('href')} maxLength={400} placeholder="https://instagram.com/…" className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Короткий текст</label><textarea rows={2} value={form.text} onChange={set('text')} maxLength={220} placeholder="Что предлагаете и почему у вас выгодно" className={inputCls} /></div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 text-sm inline-flex items-center gap-1.5 cursor-pointer">
                {busy === 'img' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}{form.image ? 'Заменить картинку' : 'Загрузить картинку'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {form.image ? <img src={form.image} alt="" className="h-14 w-40 object-cover rounded-lg border border-slate-200" /> : <span className="text-xs text-slate-500">{form.place === 'side' ? 'Картинка 600×1200 (большое место) или 600×500 (маленькое).' : 'Широкая картинка 2400×600 пикселей.'} Можно без неё — сделаем цветной баннер.</span>}
            </div>
            <div><label className={labelCls}>Комментарий</label><input value={form.comment} onChange={set('comment')} maxLength={500} placeholder="Например: удобно созвониться после 18:00" className={inputCls} /></div>
            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy === 'send'} className="px-5 py-2.5 rounded-lg bg-[#C8102E] hover:bg-[#a60d26] text-white font-black text-sm inline-flex items-center gap-1.5 cursor-pointer">{busy === 'send' && <Loader2 size={14} className="animate-spin" />}Отправить заявку</button>
              <span className="text-xs text-slate-500">Оплата — по договорённости с KGzone, на сайте платить не нужно.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
