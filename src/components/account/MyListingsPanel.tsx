import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Minus, Camera, Search, MoreHorizontal, Download, SlidersHorizontal, Images, Store } from 'lucide-react';
import {
  deleteMyListing, editMyListing, listMyListings, raiseMyListing, setMyListingStatus,
  type ListingKind, type MyCar, type MyPart,
} from '../../api/myListings';
import { uploadPhoto } from '../../api/upload';
import { partPath, carPath, openShop } from '../../seo/routes';
import { useAuth } from '../../api/auth';

// Seller's listings in the style of drom.ru "Мои объявления", built for sellers with
// hundreds or thousands of parts: search, filters, compact rows, bulk actions, pages.

type Row = { kind: ListingKind; item: MyPart | MyCar };
type Bucket = 'active' | 'hidden' | 'pending' | 'rejected' | 'inactive' | 'sold';
type Sort = 'new' | 'cheap' | 'expensive' | 'views' | 'stock';

const PAGE = 50;
const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'active', label: 'Активные' },
  { id: 'hidden', label: 'Не видны покупателям' },
  { id: 'pending', label: 'На проверке' },
  { id: 'rejected', label: 'Отклонённые' },
  { id: 'inactive', label: 'Снятые' },
  { id: 'sold', label: 'Проданные' },
];

const isPart = (r: Row): r is { kind: 'parts'; item: MyPart } => r.kind === 'parts';
const hiddenReason = (r: Row): 'photo' | 'stock' | null => {
  if (!isPart(r)) return null;
  if (!r.item.images?.length) return 'photo';
  if (!(r.item.stockCount > 0)) return 'stock';
  return null;
};
const bucketOf = (r: Row): Bucket => {
  const status = r.item.listingStatus ?? 'active';
  if (status === 'sold') return 'sold';
  if (status === 'inactive') return 'inactive';
  const m = r.item.moderation?.status;
  if (m === 'rejected') return 'rejected';
  if (m !== 'approved') return 'pending';
  return hiddenReason(r) ? 'hidden' : 'active';
};
const priceOf = (r: Row) => (isPart(r) ? r.item.priceKgs : (r.item as MyCar).priceUsd);
const priceText = (r: Row) => (isPart(r) ? `${r.item.priceKgs.toLocaleString('ru-RU')} сом` : `$${(r.item as MyCar).priceUsd.toLocaleString('ru-RU')}`);
const viewsOf = (r: Row) => (isPart(r) ? r.item.views : (r.item as MyCar).viewsCount) || 0;
const brandOf = (r: Row) => r.item.brand || '';
const searchText = (r: Row) =>
  [r.item.title, r.item.brand, r.item.model, isPart(r) ? r.item.partNumber : '', isPart(r) ? (r.item.crossNumbers || []).join(' ') : '', isPart(r) ? r.item.sku : '']
    .join(' ').toLowerCase().replace(/[\s-]/g, '');

const linkCls = 'text-[#1d6fb8] hover:text-[#C8102E] hover:underline cursor-pointer';

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

interface Props {
  onSellPart: () => void;
  onSellCar: () => void;
  requestsCount?: number;
  onOpenRequests?: () => void;
  onOpenImport?: () => void;
}

export const MyListingsPanel: React.FC<Props> = ({ onSellPart, onSellCar, requestsCount = 0, onOpenRequests, onOpenImport }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>('active');
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [sort, setSort] = useState<Sort>('new');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [priceEdit, setPriceEdit] = useState<{ id: string; value: string } | null>(null);
  const [descEdit, setDescEdit] = useState<{ id: string; value: string } | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false); // phones: filters folded behind a button
  const photoInput = useRef<HTMLInputElement>(null);
  const bulkPhotoInput = useRef<HTMLInputElement>(null);
  const [bulkPhotoBusy, setBulkPhotoBusy] = useState<string | null>(null);
  const [statsFor, setStatsFor] = useState<string | null>(null);
  const { user } = useAuth();
  const photoFor = useRef<Row | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await listMyListings();
      setRows([...r.parts.map((item) => ({ kind: 'parts' as const, item })), ...r.cars.map((item) => ({ kind: 'cars' as const, item }))]);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // First load: if nothing is active, open the first tab that has items
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !rows.length) return;
    opened.current = true;
    if (!rows.some((r) => bucketOf(r) === 'active')) {
      const first = BUCKETS.find((b) => rows.some((r) => bucketOf(r) === b.id));
      if (first) setBucket(first.id);
    }
  }, [rows]);

  useEffect(() => { setPage(0); setSelected(new Set()); }, [bucket, query, brand, lowStock, sort]);
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuFor]);

  const flash = (ok: string | null, err: string | null = null) => { setNotice(ok); setError(err); };
  const markBusy = (id: string, on: boolean) => setBusy((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });
  const patchLocal = (id: string, patch: Partial<MyPart & MyCar>) =>
    setRows((rs) => rs.map((r) => (r.item.id === id ? { ...r, item: { ...r.item, ...patch } as any } : r)));

  // One listing action; the list reloads afterwards
  const act = async (r: Row, fn: () => Promise<unknown>, ok?: string) => {
    markBusy(r.item.id, true);
    try { await fn(); flash(ok || null); await load(); }
    catch (e: any) { flash(null, e.message); }
    finally { markBusy(r.item.id, false); }
  };

  // Stock − / +: updates the row at once, saves in the background
  const setStock = async (r: Row, n: number) => {
    if (!isPart(r)) return;
    const prev = r.item.stockCount;
    const next = Math.max(0, n);
    patchLocal(r.item.id, { stockCount: next, inStock: next > 0 });
    try {
      await editMyListing('parts', r.item.id, { stockCount: next });
      if (next === 0) flash('Товар закончился и скрыт с сайта. Нажмите «+», когда появится.');
    } catch (e: any) {
      patchLocal(r.item.id, { stockCount: prev, inStock: prev > 0 });
      flash(null, e.message);
    }
  };

  const savePrice = async (r: Row) => {
    if (!priceEdit) return;
    const value = Math.round(Number(priceEdit.value));
    setPriceEdit(null);
    if (!value || value === priceOf(r)) return;
    patchLocal(r.item.id, isPart(r) ? { priceKgs: value } : { priceUsd: value });
    try { await editMyListing(r.kind, r.item.id, isPart(r) ? { priceKgs: value } : { priceUsd: value }); flash('Цена сохранена'); }
    catch (e: any) { flash(null, e.message); load(); }
  };

  const saveDescription = (r: Row) => {
    if (!descEdit) return;
    const value = descEdit.value.trim();
    setDescEdit(null);
    act(r, () => editMyListing(r.kind, r.item.id, { description: value }), 'Описание сохранено. Его проверит модератор.');
  };

  const addPhotos = (r: Row) => { photoFor.current = r; photoInput.current?.click(); };
  const onPhotoFiles = async (files: FileList | null) => {
    const r = photoFor.current;
    if (!r || !isPart(r) || !files?.length) return;
    markBusy(r.item.id, true);
    try {
      const existing = r.item.images || [];
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 8 - existing.length)) urls.push(await uploadPhoto(f, 'part'));
      await editMyListing('parts', r.item.id, { images: [...existing, ...urls] });
      flash('Фото добавлены. Модератор проверит их, и товар появится на сайте.');
      await load();
    } catch (e: any) { flash(null, e.message); }
    finally { markBusy(r.item.id, false); if (photoInput.current) photoInput.current.value = ''; }
  };

  // Photos in bulk: files named by seller SKU or OEM ("A-001.jpg", "A-001_2.jpg", "04465-33471.jpg")
  // are matched to items and added to them.
  const onBulkPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const key = (v?: string) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const parts = rows.filter(isPart);
    const groups = new Map<string, { r: Row & { kind: 'parts'; item: MyPart }; files: File[] }>();
    const unknown: string[] = [];
    for (const file of Array.from(files)) {
      const base = key(file.name.replace(/\.[^.]+$/, '').replace(/[ _-]\d{1,2}$/, ''));
      const r = parts.find((p) => (p.item.sku && key(p.item.sku) === base) || key(p.item.partNumber) === base);
      if (!r) { unknown.push(file.name); continue; }
      const g = groups.get(r.item.id) || { r, files: [] };
      g.files.push(file);
      groups.set(r.item.id, g);
    }
    let done = 0;
    flash(null);
    for (const { r, files: list } of groups.values()) {
      setBulkPhotoBusy(`Загружаем фото: ${done + 1} из ${groups.size}`);
      try {
        const existing = r.item.images || [];
        const urls: string[] = [];
        for (const f of list.slice(0, 8 - existing.length)) urls.push(await uploadPhoto(f, 'part'));
        if (urls.length) await editMyListing('parts', r.item.id, { images: [...existing, ...urls] });
        done++;
      } catch (e: any) { unknown.push(`${r.item.title}: ${e.message}`); }
    }
    setBulkPhotoBusy(null);
    if (bulkPhotoInput.current) bulkPhotoInput.current.value = '';
    await load();
    flash(done ? `Фото добавлены к товарам: ${done}. Модератор проверит их, и товары появятся на сайте.` : null,
      unknown.length ? `Не нашли товар для файлов: ${unknown.slice(0, 8).join(', ')}${unknown.length > 8 ? '…' : ''}. Назовите файл как артикул продавца или OEM.` : null);
  };

  // ----- filtering -----
  const brands = useMemo(() => [...new Set(rows.map(brandOf).filter(Boolean))].sort(), [rows]);
  const counts = useMemo(() => Object.fromEntries(BUCKETS.map((b) => [b.id, rows.filter((r) => bucketOf(r) === b.id).length])) as Record<Bucket, number>, [rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s-]/g, '');
    const list = rows.filter((r) =>
      bucketOf(r) === bucket &&
      (!q || searchText(r).includes(q)) &&
      (!brand || brandOf(r) === brand) &&
      (!lowStock || (isPart(r) && r.item.stockCount > 0 && r.item.stockCount <= 2)));
    const by: Record<Sort, (a: Row, b: Row) => number> = {
      new: (a, b) => String(b.item.raisedAt || b.item.createdAt || '').localeCompare(String(a.item.raisedAt || a.item.createdAt || '')),
      cheap: (a, b) => priceOf(a) - priceOf(b),
      expensive: (a, b) => priceOf(b) - priceOf(a),
      views: (a, b) => viewsOf(b) - viewsOf(a),
      stock: (a, b) => (isPart(a) ? a.item.stockCount : 0) - (isPart(b) ? b.item.stockCount : 0),
    };
    return [...list].sort(by[sort]);
  }, [rows, bucket, query, brand, lowStock, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.item.id));

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((s) => {
    const n = new Set(s);
    if (allOnPage) pageRows.forEach((r) => n.delete(r.item.id)); else pageRows.forEach((r) => n.add(r.item.id));
    return n;
  });

  // ----- bulk actions -----
  const bulk = async (label: string, fn: (r: Row) => Promise<unknown>) => {
    const list = rows.filter((r) => selected.has(r.item.id));
    if (!list.length) return;
    setBulkBusy(true);
    flash(null);
    let ok = 0, failed = 0;
    for (const r of list) {
      try { await fn(r); ok++; } catch { failed++; }
    }
    setSelected(new Set());
    await load();
    setBulkBusy(false);
    flash(`${label}: ${ok}${failed ? `, не получилось: ${failed}` : ''}`);
  };
  const bulkPrice = () => {
    const v = window.prompt('На сколько процентов изменить цену? Например: 10 (дороже) или -5 (дешевле)', '10');
    const pct = Number(String(v || '').replace(',', '.'));
    if (!v || !pct || Math.abs(pct) > 90) return;
    bulk('Цена изменена', (r) => {
      const next = Math.max(1, Math.round((priceOf(r) * (100 + pct)) / 100));
      return editMyListing(r.kind, r.item.id, isPart(r) ? { priceKgs: next } : { priceUsd: next });
    });
  };

  const exportCsv = () => {
    const head = ['Артикул продавца', 'Название', 'Категория', 'Марка', 'Модель', 'OEM', 'Кросс-номера', 'Состояние', 'Цена', 'Количество', 'Описание', 'Фото (ссылки)'];
    const lines = rows.filter(isPart).map((r) => [r.item.sku, r.item.title, r.item.category, r.item.brand, r.item.model, r.item.partNumber, (r.item.crossNumbers || []).join(', '), r.item.condition, r.item.priceKgs, r.item.stockCount, r.item.description, (r.item.images || []).join(' ')].map(csvCell).join(';'));
    const url = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kgzone-moi-tovary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalViews = rows.reduce((n, r) => n + viewsOf(r), 0);
  const totalContacts = rows.reduce((n, r) => n + (r.item.contactsCount || 0), 0);
  const selCount = selected.size;
  const inSoldOrOff = bucket === 'inactive' || bucket === 'sold';

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPhotoFiles(e.target.files)} />
      <input ref={bulkPhotoInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onBulkPhotos(e.target.files)} />

      {/* Heading */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 pt-3 sm:pt-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-slate-900">Мои объявления <span className="sm:hidden text-slate-400 font-bold">{rows.length.toLocaleString('ru-RU')}</span></h1>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            {rows.length.toLocaleString('ru-RU')} товаров · {totalViews.toLocaleString('ru-RU')} просмотров · {totalContacts.toLocaleString('ru-RU')} обращений
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={onSellPart} aria-label="Продать запчасть" className="w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-full sm:rounded-lg bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus size={20} /><span className="hidden sm:inline">Продать запчасть</span>
          </button>
          <button type="button" onClick={onSellCar} className="hidden sm:flex px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold items-center gap-1.5 cursor-pointer">
            <Plus size={18} /><span>Продать авто</span>
          </button>
        </div>
      </div>

      {requestsCount > 0 && onOpenRequests && (
        <div className="px-3 sm:px-5 mt-3">
          <button type="button" onClick={onOpenRequests} className="w-full text-left px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 cursor-pointer hover:bg-emerald-100">
            <Search size={15} className="shrink-0" />
            <span className="hidden sm:inline">Покупатели ищут запчасти для ваших марок: <b>{requestsCount}</b></span>
            <span className="sm:hidden">Заявки покупателей: <b>{requestsCount}</b></span>
            <span className="ml-auto font-bold whitespace-nowrap">Посмотреть →</span>
          </button>
        </div>
      )}

      {/* Search and filters */}
      <div className="px-3 sm:px-5 mt-3 flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск: название или OEM-номер" className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]" />
          </div>
          <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-label="Фильтры" className={`sm:hidden relative w-11 shrink-0 rounded-lg border flex items-center justify-center cursor-pointer ${filtersOpen ? 'border-[#1d6fb8] text-[#1d6fb8] bg-sky-50' : 'border-slate-300 text-slate-600'}`}>
            <SlidersHorizontal size={18} />
            {(brand || lowStock || sort !== 'new') && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C8102E]" />}
          </button>
        </div>
        {brands.length > 1 && (
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={`${filtersOpen ? '' : 'hidden'} sm:block px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white`} data-no-i18n>
            <option value="">Все марки</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${filtersOpen ? '' : 'hidden'} sm:block px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white`}>
          <option value="new">Сначала новые</option>
          <option value="cheap">Сначала дешевле</option>
          <option value="expensive">Сначала дороже</option>
          <option value="views">Больше просмотров</option>
          <option value="stock">Меньше остаток</option>
        </select>
      </div>
      <div className={`${filtersOpen ? 'flex' : 'hidden'} sm:flex px-3 sm:px-5 mt-2 flex-wrap items-center gap-x-5 gap-y-2 text-sm`}>
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} className="accent-[#C8102E]" />
          <span>Мало осталось (1–2 шт)</span>
        </label>
        <span className="sm:ml-auto flex flex-wrap gap-x-4 gap-y-1">
          {user && <button type="button" onClick={() => openShop(user.id)} className={`${linkCls} inline-flex items-center gap-1`}><Store size={13} />Моя страница магазина</button>}
          <button type="button" onClick={() => bulkPhotoInput.current?.click()} disabled={Boolean(bulkPhotoBusy)} className={`${linkCls} inline-flex items-center gap-1`} title="Назовите файлы как артикул или OEM: A-001.jpg, A-001_2.jpg">
            <Images size={13} />{bulkPhotoBusy || 'Фото пачкой'}
          </button>
          {onOpenImport && <button type="button" onClick={onOpenImport} className={linkCls}>Загрузить прайс</button>}
          <button type="button" onClick={exportCsv} className={`${linkCls} inline-flex items-center gap-1`}><Download size={13} />Скачать в Excel</button>
        </span>
      </div>

      {/* Tabs */}
      <div className="mt-3 px-3 sm:px-5 flex gap-5 overflow-x-auto border-b border-slate-200 text-sm whitespace-nowrap">
        {BUCKETS.filter((b) => b.id === 'active' || counts[b.id] > 0).map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBucket(b.id)}
            className={`py-2.5 -mb-px border-b-2 cursor-pointer ${bucket === b.id ? 'border-[#C8102E] text-slate-900 font-bold' : `border-transparent hover:text-slate-800 ${b.id === 'hidden' || b.id === 'rejected' ? 'text-amber-700' : 'text-slate-500'}`}`}
          >
            {b.label} <span className="font-normal">{counts[b.id].toLocaleString('ru-RU')}</span>
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {selCount > 0 && (
        <div className="px-4 sm:px-5 py-2.5 bg-sky-50 border-b border-sky-100 text-sm flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <b className="text-slate-800">Выбрано: {selCount}</b>
          {bulkBusy ? <Loader2 size={15} className="animate-spin text-slate-500" /> : (
            <>
              {!inSoldOrOff && <button type="button" onClick={() => bulk('Снято с продажи', (r) => setMyListingStatus(r.kind, r.item.id, 'inactive'))} className={linkCls}>Снять с продажи</button>}
              {!inSoldOrOff && <button type="button" onClick={() => bulk('Отмечено проданным', (r) => setMyListingStatus(r.kind, r.item.id, 'sold'))} className={linkCls}>Продано</button>}
              {inSoldOrOff && <button type="button" onClick={() => bulk('Возвращено в продажу', (r) => setMyListingStatus(r.kind, r.item.id, 'active'))} className={linkCls}>Вернуть в продажу</button>}
              {bucket === 'active' && <button type="button" onClick={() => bulk('Поднято', (r) => raiseMyListing(r.kind, r.item.id))} className={linkCls}>Поднять</button>}
              <button type="button" onClick={bulkPrice} className={linkCls}>Изменить цену на %</button>
              <button type="button" onClick={() => { if (confirm(`Удалить выбранные объявления (${selCount}) навсегда?`)) bulk('Удалено', (r) => deleteMyListing(r.kind, r.item.id)); }} className="text-red-600 hover:underline cursor-pointer">Удалить</button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-slate-500 hover:underline cursor-pointer ml-auto">Снять выбор</button>
            </>
          )}
        </div>
      )}

      {(notice || error) && (
        <div className="px-4 sm:px-5 pt-3">
          {notice && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>
      ) : rows.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <p className="font-bold text-slate-800 text-base">Здесь будут ваши товары</p>
          <p className="text-sm text-slate-500 mt-1">Подайте объявление или загрузите прайс из Excel — сразу много товаров.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onSellPart} className="px-5 py-2.5 rounded-lg bg-[#C8102E] text-white font-bold cursor-pointer">Продать запчасть</button>
            {onOpenImport && <button type="button" onClick={onOpenImport} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold cursor-pointer">Загрузить прайс</button>}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-500">{query || brand || lowStock ? 'Ничего не найдено. Измените поиск или фильтры.' : 'В этом разделе пусто'}</div>
      ) : (
        <>
          <div className="hidden sm:grid grid-cols-[28px_64px_minmax(0,1fr)_120px_130px_36px] gap-3 items-center px-4 sm:px-5 py-2 text-[11px] text-slate-400 border-b border-slate-100">
            <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Выбрать все на странице" className="w-4 h-4 accent-[#1d6fb8]" />
            <span>Фото</span>
            <span>Товар</span>
            <span>Цена</span>
            <span>В наличии</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100">
            {pageRows.map((r) => {
              const { kind, item } = r;
              const b = bucketOf(r);
              const isBusy = busy.has(item.id);
              const reason = hiddenReason(r);
              const url = b === 'active' ? (kind === 'parts' ? partPath(item) : carPath(item)) : null;
              const meta = [isPart(r) && r.item.partNumber && `OEM ${r.item.partNumber}`, [item.brand, item.model].filter(Boolean).join(' '), `${viewsOf(r)} просм.`, item.contactsCount ? `${item.contactsCount} обращ.` : '']
                .filter(Boolean).join(' · ');
              return (
                <li key={item.id} className={`px-3 sm:px-5 py-3 ${selected.has(item.id) ? 'bg-sky-50/60' : ''}`}>
                  <div className="grid grid-cols-[28px_64px_minmax(0,1fr)_36px] sm:grid-cols-[28px_64px_minmax(0,1fr)_120px_130px_36px] gap-3 items-center">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label="Выбрать" className="w-4 h-4 accent-[#1d6fb8]" />

                    {item.image ? (
                      <img src={item.image} alt="" loading="lazy" title={isPart(r) && r.item.photoCredit ? `Фото: ${r.item.photoCredit.author}, ${r.item.photoCredit.license}, Wikimedia Commons` : undefined} className="w-16 h-12 object-cover rounded-md bg-slate-100" />
                    ) : (
                      <button type="button" onClick={() => addPhotos(r)} disabled={isBusy} className="w-16 h-12 rounded-md border-2 border-dashed border-amber-300 bg-amber-50 text-amber-700 flex items-center justify-center cursor-pointer hover:bg-amber-100" title="Добавить фото">
                        {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={18} />}
                      </button>
                    )}

                    <div className="min-w-0">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener" className="font-bold text-[#1d6fb8] hover:text-[#C8102E] hover:underline line-clamp-2" data-no-i18n>{item.title}</a>
                      ) : (
                        <div className="font-bold text-slate-900 line-clamp-2" data-no-i18n>{item.title}</div>
                      )}
                      <div className="text-xs text-slate-500 truncate" data-no-i18n>{meta}</div>
                      {b === 'hidden' && reason === 'photo' && (
                        <button type="button" onClick={() => addPhotos(r)} className="text-xs font-bold text-amber-700 hover:underline cursor-pointer">Нет фото — покупатели не видят. Добавить фото →</button>
                      )}
                      {b === 'hidden' && reason === 'stock' && <div className="text-xs font-bold text-amber-700">Закончился — скрыт с сайта</div>}
                      {b === 'pending' && <div className="text-xs text-sky-700">На проверке у модератора</div>}
                      {b === 'rejected' && <div className="text-xs text-red-600">Отклонено: {item.moderation?.reason || 'не соответствует правилам'}</div>}
                      {/* price and stock on phones */}
                      <div className="sm:hidden mt-1.5 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => setPriceEdit({ id: item.id, value: String(priceOf(r)) })} className="font-black text-slate-900 text-[15px] whitespace-nowrap text-left cursor-pointer">
                          {priceText(r)}
                        </button>
                        {isPart(r) && b !== 'sold' && b !== 'rejected' && (
                          <div className={`inline-flex items-center border rounded-lg overflow-hidden ${r.item.stockCount <= 0 ? 'border-amber-400' : 'border-slate-300'}`}>
                            <button type="button" disabled={r.item.stockCount <= 0} onClick={() => setStock(r, r.item.stockCount - 1)} className="w-9 h-9 flex items-center justify-center active:bg-slate-100 cursor-pointer disabled:opacity-30" aria-label="Меньше"><Minus size={15} /></button>
                            <span className={`w-9 text-center text-sm font-bold ${r.item.stockCount <= 0 ? 'text-amber-700' : r.item.stockCount <= 2 ? 'text-orange-600' : ''}`}>{r.item.stockCount}</span>
                            <button type="button" onClick={() => setStock(r, r.item.stockCount + 1)} className="w-9 h-9 flex items-center justify-center active:bg-slate-100 cursor-pointer" aria-label="Больше"><Plus size={15} /></button>
                          </div>
                        )}
                      </div>
                      {priceEdit?.id === item.id && (
                        <input
                          autoFocus
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={priceEdit.value}
                          onChange={(e) => setPriceEdit({ id: item.id, value: e.target.value })}
                          onBlur={() => savePrice(r)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="sm:hidden mt-1 w-full px-3 py-2 border border-[#1d6fb8] rounded-lg text-base font-bold"
                        />
                      )}
                    </div>

                    {/* Price: click to edit */}
                    <div className="hidden sm:block">
                      {priceEdit?.id === item.id ? (
                        <input
                          autoFocus
                          type="number"
                          min="1"
                          value={priceEdit.value}
                          onChange={(e) => setPriceEdit({ id: item.id, value: e.target.value })}
                          onBlur={() => savePrice(r)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setPriceEdit(null); }}
                          className="w-full px-2 py-1 border border-[#1d6fb8] rounded-md text-sm font-bold"
                        />
                      ) : (
                        <button type="button" onClick={() => setPriceEdit({ id: item.id, value: String(priceOf(r)) })} title="Изменить цену" className="font-black text-slate-900 hover:text-[#1d6fb8] border-b border-dashed border-transparent hover:border-[#1d6fb8] cursor-pointer">
                          {priceText(r)}
                        </button>
                      )}
                    </div>

                    {/* Stock stepper */}
                    <div className="hidden sm:block">
                      {isPart(r) && b !== 'sold' && b !== 'rejected' ? (
                        <div className={`inline-flex items-center border rounded-lg overflow-hidden ${r.item.stockCount <= 0 ? 'border-amber-400' : 'border-slate-300'}`}>
                          <button type="button" disabled={r.item.stockCount <= 0} onClick={() => setStock(r, r.item.stockCount - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 cursor-pointer disabled:opacity-30" aria-label="Меньше"><Minus size={13} /></button>
                          <span className={`w-12 text-center text-sm font-bold ${r.item.stockCount <= 0 ? 'text-amber-700' : r.item.stockCount <= 2 ? 'text-orange-600' : ''}`}>{r.item.stockCount}</span>
                          <button type="button" onClick={() => setStock(r, r.item.stockCount + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 cursor-pointer" aria-label="Больше"><Plus size={13} /></button>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </div>

                    {/* Row menu */}
                    <div className="relative justify-self-end">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === item.id ? null : item.id); }} className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer" aria-label="Действия">
                        {isBusy ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={18} />}
                      </button>
                      {menuFor === item.id && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 z-20 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm">
                          {isPart(r) && b !== 'sold' && <button type="button" onClick={() => { setMenuFor(null); addPhotos(r); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"><Camera size={14} />{r.item.images?.length ? `Добавить фото (${r.item.images.length}/8)` : 'Добавить фото'}</button>}
                          {b !== 'sold' && <button type="button" onClick={() => { setMenuFor(null); setDescEdit({ id: item.id, value: item.description && item.description !== '—' ? item.description : '' }); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Изменить описание</button>}
                          {b === 'active' && <button type="button" onClick={() => { setMenuFor(null); act(r, () => raiseMyListing(kind, item.id), 'Объявление поднято в поиске'); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Поднять в поиске</button>}
                          <button type="button" onClick={() => { setMenuFor(null); setStatsFor(statsFor === item.id ? null : item.id); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Статистика за 2 недели</button>
                          {url && <a href={url} target="_blank" rel="noopener" className="block px-3 py-2 hover:bg-slate-50">Открыть на сайте</a>}
                          {!inSoldOrOff && b !== 'rejected' && <button type="button" onClick={() => { setMenuFor(null); act(r, () => setMyListingStatus(kind, item.id, 'sold'), 'Отмечено как проданное'); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Продано</button>}
                          {!inSoldOrOff && <button type="button" onClick={() => { setMenuFor(null); act(r, () => setMyListingStatus(kind, item.id, 'inactive'), 'Снято с продажи'); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Снять с продажи</button>}
                          {inSoldOrOff && <button type="button" onClick={() => { setMenuFor(null); act(r, () => setMyListingStatus(kind, item.id, 'active'), 'Снова в продаже'); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Вернуть в продажу</button>}
                          <button type="button" onClick={() => { setMenuFor(null); if (confirm('Удалить объявление навсегда?')) act(r, () => deleteMyListing(kind, item.id), 'Объявление удалено'); }} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 cursor-pointer border-t border-slate-100">Удалить</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {statsFor === item.id && (() => {
                    const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10));
                    const v = days.map((d) => item.viewsByDay?.[d] || 0);
                    const c = days.map((d) => item.contactsByDay?.[d] || 0);
                    const max = Math.max(1, ...v);
                    return (
                      <div className="mt-2 sm:ml-[104px] p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-600 mb-2">
                          За 2 недели: <b>{v.reduce((a, b) => a + b, 0)}</b> просмотров, <b>{c.reduce((a, b) => a + b, 0)}</b> обращений
                        </div>
                        <div className="flex items-end gap-1 h-16">
                          {days.map((d, i) => (
                            <div key={d} className="flex-1 flex flex-col justify-end items-center gap-0.5" title={`${d.slice(8)}.${d.slice(5, 7)}: ${v[i]} просм., ${c[i]} обращ.`}>
                              <div className="w-full rounded-t bg-[#1d6fb8]/70" style={{ height: `${Math.round((v[i] / max) * 48)}px` }} />
                              {c[i] > 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{days[0].slice(8)}.{days[0].slice(5, 7)}</span><span>сегодня</span></div>
                        <div className="text-[10px] text-slate-500 mt-1">Столбики — просмотры, красные точки — звонки и сообщения. Считаем с этой недели.</div>
                      </div>
                    );
                  })()}

                  {descEdit?.id === item.id && (
                    <div className="mt-2 sm:ml-[104px] p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <textarea rows={3} autoFocus value={descEdit.value} onChange={(e) => setDescEdit({ id: item.id, value: e.target.value })} maxLength={kind === 'parts' ? 2000 : 3000} placeholder="Состояние, совместимость, что входит в комплект" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
                      <div className="flex items-center gap-2 text-sm">
                        <button type="button" onClick={() => saveDescription(r)} className="px-4 py-1.5 rounded-lg bg-[#C8102E] text-white font-bold cursor-pointer">Сохранить</button>
                        <button type="button" onClick={() => setDescEdit(null)} className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold cursor-pointer">Отмена</button>
                        <span className="text-xs text-slate-500">Новое описание проверит модератор</span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Pages */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>Показано {page * PAGE + 1}–{Math.min(filtered.length, page * PAGE + PAGE)} из {filtered.length.toLocaleString('ru-RU')}</span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded hover:bg-slate-100 cursor-pointer disabled:opacity-30">← Назад</button>
                {Array.from({ length: pages }, (_, i) => i)
                  .filter((i) => i === 0 || i === pages - 1 || Math.abs(i - page) <= 2)
                  .map((i, idx, arr) => (
                    <React.Fragment key={i}>
                      {idx > 0 && i - arr[idx - 1] > 1 && <span className="px-1">…</span>}
                      <button type="button" onClick={() => setPage(i)} className={`min-w-8 px-2 py-1 rounded cursor-pointer ${i === page ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-[#1d6fb8]'}`}>{i + 1}</button>
                    </React.Fragment>
                  ))}
                <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded hover:bg-slate-100 cursor-pointer disabled:opacity-30">Дальше →</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
