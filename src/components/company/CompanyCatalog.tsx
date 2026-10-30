import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Plus, Loader2 } from 'lucide-react';
import {
  bulkCompanyParts, createCompanyPart, listCompanyParts, updateCompanyPart,
  type CompanyInfo, type CompanyPart,
} from '../../api/company';
import { uploadPhoto } from '../../api/upload';
import { OemHint } from '../catalog/OemHint';

const PAGE = 50;
const CATEGORIES = [
  'Двигатель и элементы двигателя', 'Трансмиссия', 'Ходовая часть', 'Тормозная система', 'Детали кузова', 'Оптика', 'Электрика',
  'Система охлаждения', 'Топливная система', 'Система отопления и кондиционирования', 'Выхлопная система', 'Салон и безопасность',
  'Масла и фильтры', 'Шины и диски', 'Рулевое управление', 'Стекла и зеркала', 'Тюнинг и дополнительное оборудование',
];
const CONDITIONS = ['Новый (Оригинал)', 'Новый', 'Дубликат (OEM)', 'Б/у (Контрактный)', 'Б/У с разбора', 'Восстановленная'];

type StatusFilter = 'all' | 'active' | 'pending' | 'rejected' | 'inactive' | 'sold' | 'out';

const statusOf = (p: CompanyPart): Exclude<StatusFilter, 'all' | 'out'> => {
  if (p.listingStatus === 'sold') return 'sold';
  if (p.listingStatus === 'inactive') return 'inactive';
  if (p.moderation?.status === 'rejected') return 'rejected';
  if (p.moderation?.status === 'approved') return 'active';
  return 'pending';
};
const STATUS_LABELS: Record<Exclude<StatusFilter, 'all' | 'out'>, string> = {
  active: 'Опубликован', pending: 'На модерации', rejected: 'Отклонён', inactive: 'В архиве', sold: 'Продан',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800', pending: 'bg-amber-100 text-amber-800', rejected: 'bg-red-100 text-red-700', inactive: 'bg-slate-200 text-slate-600', sold: 'bg-slate-200 text-slate-600',
};

const inputCls = 'w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm';

export const CompanyCatalog: React.FC<{ info: CompanyInfo }> = ({ info }) => {
  const can = (p: string) => info.permissions.includes(p as any);
  const warehouses = info.company.warehouses;
  const [parts, setParts] = useState<CompanyPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [warehouse, setWarehouse] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkWarehouse, setBulkWarehouse] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { price?: string; stock?: string }>>({});
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setParts(await listCompanyParts()); setError(null); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p) => {
      if (status === 'out' ? (p.stockCount || 0) > 0 : status !== 'all' && statusOf(p) !== status) return false;
      if (warehouse && (p.warehouseId || '') !== (warehouse === '-' ? '' : warehouse)) return false;
      if (!q) return true;
      return [p.title, p.partNumber, p.sku, p.brand, p.model, p.manufacturer, ...(p.crossNumbers || [])].some((v) => v?.toLowerCase().includes(q));
    });
  }, [parts, query, status, warehouse]);

  useEffect(() => { setPage(0); }, [query, status, warehouse]);
  const pageItems = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const allOnPage = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s); pageItems.forEach((p) => (allOnPage ? n.delete(p.id) : n.add(p.id))); return n; });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError(null); setNotice(null);
    try { await fn(); setNotice(ok); await load(); } catch (e: any) { setError(e.message); }
  };

  const applyBulk = () => {
    const ids = [...selected];
    if (!ids.length || !bulkAction) return;
    const v = Number(bulkValue.replace(',', '.'));
    if (bulkAction === 'delete' && !confirm(`Удалить ${ids.length} товар(ов) навсегда?`)) return;
    const extra: Record<string, unknown> =
      bulkAction === 'pricePercent' ? { value: v, mode: 'percent' }
      : bulkAction === 'priceFixed' ? { value: v }
      : bulkAction === 'discount' || bulkAction === 'stock' ? { value: v }
      : bulkAction === 'warehouse' ? { warehouseId: bulkWarehouse }
      : {};
    const action = bulkAction.startsWith('price') ? 'price' : bulkAction;
    run(async () => {
      const r = await bulkCompanyParts(ids, action, extra);
      setSelected(new Set());
      setBulkValue('');
      return r;
    }, `Готово: изменено товаров — ${ids.length}`);
  };

  const saveDraft = (p: CompanyPart) => {
    const d = drafts[p.id];
    if (!d) return;
    const patch: Record<string, unknown> = {};
    if (d.price !== undefined && Number(d.price) !== p.priceKgs) patch.priceKgs = Number(d.price);
    if (d.stock !== undefined && Number(d.stock) !== p.stockCount) patch.stockCount = Number(d.stock);
    setDrafts((x) => { const n = { ...x }; delete n[p.id]; return n; });
    if (Object.keys(patch).length) run(() => updateCompanyPart(p.id, patch), 'Сохранено');
  };

  const counts = (s: StatusFilter) => (s === 'all' ? parts.length : s === 'out' ? parts.filter((p) => !(p.stockCount || 0)).length : parts.filter((p) => statusOf(p) === s).length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-slate-900">Каталог товаров ({parts.length})</h3>
        <div className="flex gap-2">
          {can('catalog.edit') && (
            <button type="button" onClick={() => setShowAdd((v) => !v)} className="px-3 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
              <Plus size={13} /><span>Добавить товар</span>
            </button>
          )}
          <button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /><span>Обновить</span>
          </button>
        </div>
      </div>

      {showAdd && <AddPartForm info={info} onDone={(msg) => { setShowAdd(false); setNotice(msg); load(); }} />}

      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название, OEM, кросс-номер, артикул продавца" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm" />
        </div>
        {warehouses.length > 0 && (
          <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="px-2.5 py-2 border border-slate-300 rounded-xl text-sm bg-white">
            <option value="">Все склады</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            <option value="-">Без склада</option>
          </select>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {([['all', 'Все'], ['active', 'Опубликованы'], ['pending', 'На модерации'], ['rejected', 'Отклонены'], ['inactive', 'Архив'], ['sold', 'Проданы'], ['out', 'Нет в наличии']] as [StatusFilter, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setStatus(id)} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${status === id ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {label} ({counts(id)})
          </button>
        ))}
      </div>

      {selected.size > 0 && (can('catalog.edit') || can('stock.edit')) && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center gap-2 text-xs">
          <b>Выбрано: {selected.size}</b>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
            <option value="">Действие…</option>
            {can('catalog.edit') && <option value="pricePercent">Изменить цену на %</option>}
            {can('catalog.edit') && <option value="priceFixed">Установить цену</option>}
            {can('catalog.edit') && <option value="discount">Скидка %</option>}
            {can('catalog.edit') && <option value="clearDiscount">Убрать скидку</option>}
            {can('stock.edit') && <option value="stock">Установить остаток</option>}
            {can('stock.edit') && warehouses.length > 0 && <option value="warehouse">Переместить на склад</option>}
            {can('catalog.edit') && <option value="archive">В архив (снять)</option>}
            {can('catalog.edit') && <option value="activate">Опубликовать снова</option>}
            {can('catalog.edit') && <option value="sold">Отметить проданными</option>}
            {can('catalog.edit') && <option value="delete">Удалить</option>}
          </select>
          {['pricePercent', 'priceFixed', 'discount', 'stock'].includes(bulkAction) && (
            <input
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder={bulkAction === 'pricePercent' ? 'напр. 10 или -5' : bulkAction === 'discount' ? '% скидки' : bulkAction === 'stock' ? 'шт.' : 'сом'}
              className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg"
            />
          )}
          {bulkAction === 'warehouse' && (
            <select value={bulkWarehouse} onChange={(e) => setBulkWarehouse(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
              <option value="">Без склада</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          <button type="button" onClick={applyBulk} disabled={!bulkAction} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer disabled:opacity-50">Применить</button>
          <button type="button" onClick={() => setSelected(new Set())} className="px-2 py-1.5 text-slate-500 underline cursor-pointer">Снять выбор</button>
        </div>
      )}

      {notice && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}
      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="rounded-2xl bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-2 w-8"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Выбрать все на странице" /></th>
              <th className="p-2">Товар</th>
              <th className="p-2">OEM / кросс</th>
              <th className="p-2 w-28">Цена, сом</th>
              <th className="p-2 w-20">Остаток</th>
              <th className="p-2">Склад</th>
              <th className="p-2">Статус</th>
              <th className="p-2 w-16">👁</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">{loading ? 'Загрузка...' : parts.length ? 'Ничего не найдено' : 'Товаров пока нет. Добавьте товар или загрузите файл в разделе «Импорт и экспорт».'}</td></tr>
            ) : pageItems.map((p) => {
              const st = statusOf(p);
              const d = drafts[p.id] || {};
              return (
                <tr key={p.id} className="border-t border-slate-100 align-top">
                  <td className="p-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label="Выбрать" /></td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <img src={p.image} alt="" className="w-10 h-10 rounded object-cover bg-slate-100 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 line-clamp-2" data-no-i18n>{p.title}</div>
                        <div className="text-slate-400" data-no-i18n>{[p.sku, p.brand, p.model, p.manufacturer].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 font-mono" data-no-i18n>
                    <div>{p.partNumber}</div>
                    {p.crossNumbers?.length ? <div className="text-slate-400 line-clamp-1">{p.crossNumbers.join(', ')}</div> : null}
                  </td>
                  <td className="p-2">
                    {can('catalog.edit') ? (
                      <input
                        type="number"
                        min="1"
                        value={d.price ?? String(p.priceKgs)}
                        onChange={(e) => setDrafts((x) => ({ ...x, [p.id]: { ...x[p.id], price: e.target.value } }))}
                        onBlur={() => saveDraft(p)}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-24 px-1.5 py-1 border border-slate-200 rounded"
                      />
                    ) : <span>{p.priceKgs.toLocaleString('ru-RU')}</span>}
                    {p.oldPriceKgs ? <div className="text-slate-400 line-through">{p.oldPriceKgs.toLocaleString('ru-RU')}</div> : null}
                  </td>
                  <td className="p-2">
                    {can('stock.edit') ? (
                      <input
                        type="number"
                        min="0"
                        value={d.stock ?? String(p.stockCount ?? 0)}
                        onChange={(e) => setDrafts((x) => ({ ...x, [p.id]: { ...x[p.id], stock: e.target.value } }))}
                        onBlur={() => saveDraft(p)}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-16 px-1.5 py-1 border border-slate-200 rounded"
                      />
                    ) : <span>{p.stockCount ?? 0}</span>}
                  </td>
                  <td className="p-2 text-slate-500" data-no-i18n>{warehouses.find((w) => w.id === p.warehouseId)?.name || '—'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${STATUS_COLORS[st]}`}>{STATUS_LABELS[st]}</span>
                    {st === 'rejected' && p.moderation?.reason && <div className="text-red-600 mt-1">{p.moderation.reason}</div>}
                  </td>
                  <td className="p-2 text-slate-500">{p.views || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-bold disabled:opacity-40 cursor-pointer">← Назад</button>
          <span>Страница {page + 1} из {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 font-bold disabled:opacity-40 cursor-pointer">Вперёд →</button>
        </div>
      )}
    </div>
  );
};

const AddPartForm: React.FC<{ info: CompanyInfo; onDone: (msg: string) => void }> = ({ info, onDone }) => {
  const [f, setF] = useState({
    title: '', category: CATEGORIES[0], brand: 'Toyota', model: '', generation: '', partNumber: '', crossNumbers: '', manufacturer: '',
    condition: 'Новый', priceKgs: '', stockCount: '1', warehouseId: '', sku: '', description: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 8 - photos.length)) {
        const url = await uploadPhoto(file, 'part');
        setPhotos((p) => [...p, url]);
      }
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r: any = await createCompanyPart({ ...f, priceKgs: Number(f.priceKgs), stockCount: Number(f.stockCount), images: photos });
      onDone(r.part?.moderation?.status === 'approved' ? 'Товар опубликован' : 'Товар добавлен и отправлен на модерацию');
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
      <label className="sm:col-span-2 space-y-1"><span className="font-bold text-slate-700">Название *</span><input required value={f.title} onChange={set('title')} maxLength={160} className={inputCls} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Артикул продавца (SKU)</span><input value={f.sku} onChange={set('sku')} maxLength={60} className={inputCls} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Категория</span>
        <select value={f.category} onChange={set('category')} className={inputCls}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Марка авто *</span><input required value={f.brand} onChange={set('brand')} className={inputCls} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Модель</span><input value={f.model} onChange={set('model')} className={inputCls} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Поколение / кузов</span><input value={f.generation} onChange={set('generation')} className={inputCls} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">OEM-номер *</span><input required value={f.partNumber} onChange={set('partNumber')} className={`${inputCls} font-mono`} />
        <OemHint
          oem={f.partNumber}
          onApply={(k) => setF((x) => ({
            ...x,
            title: x.title || k.names[0]?.name || '',
            crossNumbers: x.crossNumbers || k.crosses.slice(0, 15).map((c) => c.number).join(', '),
            brand: x.brand && x.model ? x.brand : k.fits[0]?.brand || x.brand,
            model: x.model || k.fits[0]?.model || '',
            generation: x.generation || k.fits[0]?.generation || '',
          }))}
        />
      </label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Кросс-номера (через запятую)</span><input value={f.crossNumbers} onChange={set('crossNumbers')} className={`${inputCls} font-mono`} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Производитель</span><input value={f.manufacturer} onChange={set('manufacturer')} placeholder="Toyota, Denso, NGK..." className={inputCls} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Состояние</span>
        <select value={f.condition} onChange={set('condition')} className={inputCls}>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Цена, сом *</span><input required type="number" min="1" value={f.priceKgs} onChange={set('priceKgs')} className={inputCls} /></label>
      <label className="space-y-1"><span className="font-bold text-slate-700">Количество</span><input type="number" min="0" value={f.stockCount} onChange={set('stockCount')} className={inputCls} /></label>
      {info.company.warehouses.length > 0 && (
        <label className="space-y-1"><span className="font-bold text-slate-700">Склад</span>
          <select value={f.warehouseId} onChange={set('warehouseId')} className={inputCls}>
            <option value="">—</option>{info.company.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></label>
      )}
      <label className="sm:col-span-3 space-y-1"><span className="font-bold text-slate-700">Описание</span><textarea rows={2} value={f.description} onChange={set('description')} maxLength={2000} className={inputCls} /></label>
      <div className="sm:col-span-3 flex flex-wrap items-center gap-2">
        {photos.map((u) => <img key={u} src={u} alt="" className="w-14 h-14 rounded object-cover" />)}
        {photos.length < 8 && (
          <label className="px-3 py-2 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 font-bold cursor-pointer">
            {uploading ? 'Загрузка...' : '+ Фото'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      {error && <p className="sm:col-span-3 text-red-600">{error}</p>}
      <div className="sm:col-span-3">
        <button type="submit" disabled={busy || uploading} className="px-4 py-2 rounded-xl bg-[#C8102E] text-white font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-60">
          {busy && <Loader2 size={14} className="animate-spin" />}<span>Сохранить товар</span>
        </button>
      </div>
    </form>
  );
};
