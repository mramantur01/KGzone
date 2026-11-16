import React, { useEffect, useState } from 'react';
import { GalleryHorizontal, ArrowUp, ArrowDown, Trash2, Plus, Loader2, ImagePlus, Eye, EyeOff, RotateCcw, ExternalLink } from 'lucide-react';
import { defaultBanner, loadBanner, resetBanner, saveBanner, type BannerPlace } from '../../api/banner';
import { loadBannerStats, slideDateState } from '../../api/ads';
import { uploadPhoto } from '../../api/upload';
import {
  SLIDE_COLOR_NAMES, SLIDE_GRADIENTS, SLIDE_ICON_NAMES,
  type BannerConfig, type BannerSlide, type SlideColor, type SlideIcon,
} from '../../data/bannerDefaults';

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]';
const labelCls = 'block text-[11px] font-bold text-slate-600 mb-0.5';

const newSlide = (): BannerSlide => ({
  id: `slide-${Date.now().toString(36)}`, enabled: true, badge: 'Реклама', title: 'Название рекламы',
  text: 'Короткое описание: что предлагаете и почему выгодно.', cta: 'Подробнее', href: '/prodavcam', color: 'amber', icon: 'megaphone',
});

/** Owner's control panel for the banner slides at the top of the parts catalog */
export const BannerSlidesPanel: React.FC<{ place?: BannerPlace }> = ({ place = 'parts' }) => {
  const isSto = place === 'sto';
  const [cfg, setCfg] = useState<BannerConfig | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, { views: number; clicks: number }>>({});
  useEffect(() => { loadBanner(true, place).then((b) => setCfg(JSON.parse(JSON.stringify(b)))); }, [place]);
  useEffect(() => { loadBannerStats(place).then(setStats).catch(() => setStats({})); }, [place]);
  if (!cfg) return <div className="p-4 rounded-2xl bg-white border border-slate-200 text-sm text-slate-400"><Loader2 className="animate-spin" /></div>;

  const setSlide = (id: string, patch: Partial<BannerSlide>) => setCfg({ ...cfg, slides: cfg.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= cfg.slides.length) return;
    const slides = [...cfg.slides]; [slides[i], slides[j]] = [slides[j], slides[i]];
    setCfg({ ...cfg, slides });
  };
  const upload = async (id: string, file?: File) => {
    if (!file) return;
    setBusy(`img-${id}`); setMsg(null);
    try { setSlide(id, { image: await uploadPhoto(file, 'part') }); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };
  const save = async () => {
    setBusy('save'); setMsg(null);
    try { setCfg(JSON.parse(JSON.stringify(await saveBanner(cfg, place)))); setMsg({ ok: true, text: 'Сохранено. Слайды на сайте обновятся в течение минуты.' }); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };
  const reset = async () => {
    if (!confirm('Вернуть примерные рекламы по умолчанию? Ваши слайды будут удалены.')) return;
    setBusy('reset'); setMsg(null);
    try { await resetBanner(place); setCfg(JSON.parse(JSON.stringify(defaultBanner(place)))); setMsg({ ok: true, text: 'Возвращены примерные рекламы.' }); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };
  const enabled = cfg.slides.filter((s) => s.enabled).length + (cfg.showOffers ? 1 : 0);

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-sm space-y-3">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <GalleryHorizontal size={16} className="text-[#C8102E]" />{isSto ? 'Слайды на странице автосервиса' : 'Слайды в каталоге запчастей'}
        <a href={isSto ? '/sto' : '/zapchasti'} target="_blank" rel="noopener" className="ml-auto text-xs font-bold text-[#1d6fb8] hover:underline inline-flex items-center gap-1">Открыть на сайте<ExternalLink size={12} /></a>
      </div>
      <p className="text-xs text-slate-500">{isSto ? 'Баннер в начале страницы «Сервис».' : 'Баннер в начале каталога.'} Всего на сайте сейчас слайдов: <b>{enabled}</b>. Картинка рекламы — 2400×600 пикселей; без картинки показывается цвет и значок.</p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={cfg.showOffers} onChange={(e) => setCfg({ ...cfg, showOffers: e.target.checked })} className="w-4 h-4 accent-[#C8102E]" />
          <span>{isSto ? 'Первый слайд: три блока KGzone (запись к мастеру, прайс-лист, галерея работ)' : 'Первый слайд: три блока KGzone (VIN, поиск по номеру, «Продавайте бесплатно»)'}</span>
        </label>
        <label className="flex items-center gap-2">
          <span>Смена каждые</span>
          <select value={cfg.intervalSec} onChange={(e) => setCfg({ ...cfg, intervalSec: Number(e.target.value) })} className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
            {[2, 3, 4, 5, 6, 8, 10, 15].map((n) => <option key={n} value={n}>{n} сек</option>)}
          </select>
        </label>
      </div>

      <ul className="space-y-2">
        {cfg.slides.map((sl, i) => (
          <li key={sl.id} className={`rounded-xl border ${sl.enabled ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'}`}>
            <div className="flex items-center gap-2 p-2">
              {/* Small preview */}
              <button type="button" onClick={() => setOpen(open === sl.id ? null : sl.id)} className={`w-24 h-12 shrink-0 rounded-lg overflow-hidden relative cursor-pointer ${sl.image ? '' : `bg-gradient-to-br ${SLIDE_GRADIENTS[sl.color]}`}`} title="Изменить">
                {sl.image && <img src={sl.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <span className="absolute inset-x-1 bottom-0.5 text-[8px] font-bold text-white truncate" data-no-i18n>{sl.title}</span>
              </button>
              <button type="button" onClick={() => setOpen(open === sl.id ? null : sl.id)} className="flex-1 min-w-0 text-left cursor-pointer">
                <div className="font-bold text-slate-900 truncate" data-no-i18n>{i + 1 + (cfg.showOffers ? 1 : 0)}. {sl.title}</div>
                <div className="text-[11px] text-slate-500 truncate" data-no-i18n>{sl.badge} · {sl.href}</div>
                <div className="text-[11px] flex flex-wrap gap-x-3">
                  {(sl.startDate || sl.endDate) && (() => {
                    const st = slideDateState(sl);
                    const range = `${sl.startDate ? 'с ' + sl.startDate.split('-').reverse().join('.') : ''} ${sl.endDate ? 'по ' + sl.endDate.split('-').reverse().join('.') : ''}`.trim();
                    return <span className={st === 'live' ? 'text-emerald-700 font-bold' : st === 'future' ? 'text-sky-700 font-bold' : 'text-slate-400 font-bold'}>{st === 'live' ? 'Показывается' : st === 'future' ? 'Ещё не началась' : 'Закончилась'} · <span data-no-i18n>{range}</span></span>;
                  })()}
                  <span className="text-slate-500">Показы: <b>{stats[sl.id]?.views || 0}</b> · Нажатия: <b>{stats[sl.id]?.clicks || 0}</b></span>
                </div>
              </button>
              <button type="button" onClick={() => setSlide(sl.id, { enabled: !sl.enabled })} title={sl.enabled ? 'Скрыть слайд' : 'Показать слайд'} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">{sl.enabled ? <Eye size={16} /> : <EyeOff size={16} />}</button>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Выше" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === cfg.slides.length - 1} title="Ниже" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" onClick={() => { if (confirm(`Удалить слайд «${sl.title}»?`)) setCfg({ ...cfg, slides: cfg.slides.filter((x) => x.id !== sl.id) }); }} title="Удалить" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"><Trash2 size={16} /></button>
            </div>
            {open === sl.id && (
              <div className="p-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div><label className={labelCls}>Надпись сверху</label><input value={sl.badge} onChange={(e) => setSlide(sl.id, { badge: e.target.value })} maxLength={40} placeholder="Реклама" className={inputCls} /></div>
                <div><label className={labelCls}>Заголовок</label><input value={sl.title} onChange={(e) => setSlide(sl.id, { title: e.target.value })} maxLength={90} className={inputCls} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Текст</label><textarea rows={2} value={sl.text} onChange={(e) => setSlide(sl.id, { text: e.target.value })} maxLength={220} className={inputCls} /></div>
                <div><label className={labelCls}>Текст кнопки</label><input value={sl.cta} onChange={(e) => setSlide(sl.id, { cta: e.target.value })} maxLength={40} className={inputCls} /></div>
                <div><label className={labelCls}>Ссылка кнопки (https://… или /страница)</label><input value={sl.href} onChange={(e) => setSlide(sl.id, { href: e.target.value })} maxLength={400} placeholder="https://instagram.com/…" className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Цвет (если нет картинки)</label>
                  <select value={sl.color} onChange={(e) => setSlide(sl.id, { color: e.target.value as SlideColor })} className={`${inputCls} bg-white`}>
                    {(Object.keys(SLIDE_COLOR_NAMES) as SlideColor[]).map((c) => <option key={c} value={c}>{SLIDE_COLOR_NAMES[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Значок (если нет картинки)</label>
                  <select value={sl.icon} onChange={(e) => setSlide(sl.id, { icon: e.target.value as SlideIcon })} className={`${inputCls} bg-white`}>
                    {(Object.keys(SLIDE_ICON_NAMES) as SlideIcon[]).map((c) => <option key={c} value={c}>{SLIDE_ICON_NAMES[c]}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Показывать с (необязательно)</label><input type="date" value={sl.startDate || ''} onChange={(e) => setSlide(sl.id, { startDate: e.target.value || undefined })} className={inputCls} /></div>
                <div><label className={labelCls}>Показывать по (включительно)</label><input type="date" value={sl.endDate || ''} onChange={(e) => setSlide(sl.id, { endDate: e.target.value || undefined })} className={inputCls} /></div>
                <p className="sm:col-span-2 text-[11px] text-slate-500 -mt-1">Реклама сама включится в первый день и сама выключится после последнего. Без дат — показывается всегда.</p>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer">
                    {busy === `img-${sl.id}` ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}{sl.image ? 'Заменить картинку' : 'Загрузить картинку'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(sl.id, e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {sl.image && <button type="button" onClick={() => setSlide(sl.id, { image: undefined })} className="text-xs text-slate-500 underline cursor-pointer">Убрать картинку</button>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        {cfg.slides.length < 12 && (
          <button type="button" onClick={() => { const s = newSlide(); setCfg({ ...cfg, slides: [...cfg.slides, s] }); setOpen(s.id); }} className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><Plus size={14} />Добавить слайд</button>
        )}
        <button type="button" onClick={reset} disabled={!!busy} className="px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 font-bold inline-flex items-center gap-1.5 cursor-pointer"><RotateCcw size={14} />Вернуть примеры</button>
        <button type="button" onClick={save} disabled={!!busy} className="ml-auto px-5 py-2 rounded-lg bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-60 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer">{busy === 'save' && <Loader2 size={14} className="animate-spin" />}Сохранить</button>
      </div>
      {msg && <p className={`text-xs rounded-lg px-3 py-2 border ${msg.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{msg.text}</p>}
    </div>
  );
};
