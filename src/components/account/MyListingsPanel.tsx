import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Phone, ArrowUp, Pause, Play, CheckCircle2, Trash2, Pencil, Loader2, RefreshCw } from 'lucide-react';
import {
  deleteMyListing, editMyListing, listMyListings, raiseMyListing, setMyListingStatus,
  type ListingKind, type MyCar, type MyPart,
} from '../../api/myListings';

type Row = { kind: ListingKind; item: MyPart | MyCar };
type Bucket = 'pending' | 'active' | 'rejected' | 'inactive' | 'sold';

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'active', label: 'Активные' },
  { id: 'pending', label: 'На модерации' },
  { id: 'rejected', label: 'Отклонённые' },
  { id: 'inactive', label: 'Снятые' },
  { id: 'sold', label: 'Проданные' },
];

const bucketOf = ({ item }: Row): Bucket => {
  const status = item.listingStatus ?? 'active';
  if (status === 'sold') return 'sold';
  if (status === 'inactive') return 'inactive';
  const m = item.moderation?.status;
  if (m === 'rejected') return 'rejected';
  if (m === 'approved') return 'active';
  return 'pending';
};

const priceText = ({ kind, item }: Row) =>
  kind === 'parts' ? `${(item as MyPart).priceKgs.toLocaleString('ru-RU')} сом` : `$${(item as MyCar).priceUsd.toLocaleString('ru-RU')}`;
const viewsOf = ({ kind, item }: Row) => (kind === 'parts' ? (item as MyPart).views : (item as MyCar).viewsCount) || 0;

interface Props {
  onSellPart: () => void;
  onSellCar: () => void;
}

export const MyListingsPanel: React.FC<Props> = ({ onSellPart, onSellCar }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>('active');
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listMyListings();
      setRows([...r.parts.map((item) => ({ kind: 'parts' as const, item })), ...r.cars.map((item) => ({ kind: 'cars' as const, item }))]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (ok) setNotice(ok);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = ({ kind, item }: Row) => {
    setEditing(item.id);
    setEditPrice(String(kind === 'parts' ? (item as MyPart).priceKgs : (item as MyCar).priceUsd));
    setEditStock(kind === 'parts' ? String((item as MyPart).stockCount ?? 0) : '');
    setEditDescription(item.description && item.description !== '—' ? item.description : '');
  };

  const saveEdit = (row: Row) => {
    const patch: Record<string, unknown> = row.kind === 'parts'
      ? { priceKgs: Number(editPrice), stockCount: Number(editStock) }
      : { priceUsd: Number(editPrice) };
    const oldDescription = row.item.description && row.item.description !== '—' ? row.item.description : '';
    if (editDescription.trim() !== oldDescription) patch.description = editDescription.trim();
    act(row.item.id, async () => {
      const r = await editMyListing(row.kind, row.item.id, patch);
      setEditing(null);
      setNotice(r.needsReview ? 'Сохранено. Изменённое описание снова проверит модератор.' : 'Сохранено.');
    });
  };

  const shown = rows.filter((r) => bucketOf(r) === bucket);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900">Мои объявления</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onSellPart} className="px-3 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs font-bold cursor-pointer">+ Продать запчасть</button>
          <button type="button" onClick={onSellCar} className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">+ Продать авто</button>
          <button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBucket(b.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${bucket === b.id ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {b.label} ({rows.filter((r) => bucketOf(r) === b.id).length})
          </button>
        ))}
      </div>

      {notice && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}
      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading && rows.length === 0 ? (
        <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>
      ) : shown.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
          {rows.length === 0 ? 'У вас пока нет объявлений. Начните с кнопки «Продать запчасть» или «Продать авто».' : 'В этом разделе пусто'}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((row) => {
            const { kind, item } = row;
            const b = bucketOf(row);
            const busy = busyId === item.id;
            return (
              <div key={item.id} className="p-3 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row gap-3">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full sm:w-32 h-24 object-cover rounded-xl bg-slate-100" />
                ) : (
                  <div className="w-full sm:w-32 h-24 rounded-xl bg-slate-100 flex items-center justify-center text-[11px] text-slate-400">Без фото</div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">{kind === 'parts' ? 'Запчасть' : 'Автомобиль'}</div>
                  <div className="font-bold text-slate-900 text-sm" data-no-i18n>{item.title}</div>
                  <div className="text-sm font-black text-[#C8102E]">{priceText(row)}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Eye size={11} />Просмотры: {viewsOf(row)}</span>
                    <span className="flex items-center gap-1"><Phone size={11} />Обращения: {item.contactsCount || 0}</span>
                    {item.createdAt && <span>Подано: {new Date(item.createdAt).toLocaleDateString('ru-RU')}</span>}
                    {item.raisedAt && <span>Поднято: {new Date(item.raisedAt).toLocaleDateString('ru-RU')}</span>}
                  </div>
                  {b === 'rejected' && item.moderation?.reason && (
                    <div className="text-xs text-red-600">Причина отказа: {item.moderation.reason}</div>
                  )}
                  {b === 'pending' && <div className="text-xs text-amber-600">Ждёт проверки модератором</div>}

                  {editing === item.id && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="font-bold text-slate-600">{kind === 'parts' ? 'Цена, сом' : 'Цена, $'}</span>
                          <input type="number" min="1" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg" />
                        </label>
                        {kind === 'parts' && (
                          <label className="space-y-1">
                            <span className="font-bold text-slate-600">В наличии, шт.</span>
                            <input type="number" min="0" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg" />
                          </label>
                        )}
                      </div>
                      <label className="block space-y-1">
                        <span className="font-bold text-slate-600">Описание</span>
                        <textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={kind === 'parts' ? 2000 : 3000} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg" />
                      </label>
                      <p className="text-[11px] text-slate-500">Цена и количество меняются сразу. Изменённое описание снова проверит модератор.</p>
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => saveEdit(row)} className="px-3 py-1.5 rounded-lg bg-[#C8102E] text-white font-bold cursor-pointer disabled:opacity-60">Сохранить</button>
                        <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold cursor-pointer">Отмена</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 text-xs">
                  {editing !== item.id && b !== 'sold' && (
                    <button type="button" onClick={() => startEdit(row)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer">
                      <Pencil size={12} /><span>Редактировать</span>
                    </button>
                  )}
                  {b === 'active' && (
                    <button type="button" disabled={busy} onClick={() => act(item.id, () => raiseMyListing(kind, item.id), 'Объявление поднято наверх')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60">
                      <ArrowUp size={12} /><span>Поднять</span>
                    </button>
                  )}
                  {(b === 'active' || b === 'pending') && (
                    <button type="button" disabled={busy} onClick={() => act(item.id, () => setMyListingStatus(kind, item.id, 'inactive'), 'Объявление снято с публикации')} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60">
                      <Pause size={12} /><span>Снять</span>
                    </button>
                  )}
                  {(b === 'inactive' || b === 'sold') && (
                    <button type="button" disabled={busy} onClick={() => act(item.id, () => setMyListingStatus(kind, item.id, 'active'), 'Объявление снова активно')} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60">
                      <Play size={12} /><span>Активировать</span>
                    </button>
                  )}
                  {b !== 'sold' && b !== 'rejected' && (
                    <button type="button" disabled={busy} onClick={() => act(item.id, () => setMyListingStatus(kind, item.id, 'sold'), 'Отмечено как проданное')} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60">
                      <CheckCircle2 size={12} /><span>Продано</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { if (confirm('Удалить объявление навсегда?')) act(item.id, () => deleteMyListing(kind, item.id), 'Объявление удалено'); }}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <Trash2 size={12} /><span>Удалить</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
