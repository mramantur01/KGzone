import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, Trash2, Star, Loader2 } from 'lucide-react';
import { useParts } from '../../api/parts';
import { listWatches, removeWatch, watchMatches, type Watch } from '../../api/watches';
import { getSellerReviews, listConversations, postSellerReview } from '../../api/chat';

const card = 'p-4 sm:p-5 rounded-2xl bg-white border border-slate-200';

// "Жду деталь": the buyer's saved searches and how many matching parts are on the site now
export const WatchesCard: React.FC<{ onSearch: (w: Watch) => void }> = ({ onSearch }) => {
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const parts = useParts();
  const load = () => listWatches().then(setWatches).catch(() => setWatches([]));
  useEffect(() => { load(); }, []);
  const counts = useMemo(() => new Map((watches || []).map((w) => [w.id, parts.filter((p) => watchMatches(w, p)).length])), [watches, parts]);

  if (!watches || watches.length === 0) return null;
  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-bold text-slate-900"><BellRing size={16} className="text-sky-600" />Жду деталь</div>
      <p className="text-xs text-slate-500 mt-0.5">Когда продавец выставит такую деталь, придёт уведомление в Telegram.</p>
      <div className="mt-3 divide-y divide-slate-100">
        {watches.map((w) => {
          const n = counts.get(w.id) || 0;
          return (
            <div key={w.id} className="py-2 flex items-center gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate" data-no-i18n>{[w.q, w.brand, w.model].filter(Boolean).join(' · ')}</span>
              {n > 0 ? (
                <button type="button" onClick={() => onSearch(w)} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap">Есть: {n} →</button>
              ) : <span className="text-xs text-slate-400 whitespace-nowrap">пока нет</span>}
              <button type="button" onClick={() => removeWatch(w.id).then(load)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" aria-label="Удалить подписку"><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// After talking to a seller, ask the buyer to rate them (a day later, once per seller)
export const RateSellersCard: React.FC = () => {
  const [items, setItems] = useState<{ sellerId: string; name: string; listingTitle: string }[]>([]);
  const [rating, setRating] = useState<Record<string, number>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const convs = (await listConversations()).filter((c) => c.role === 'buyer' && c.otherId && Date.now() - Date.parse(c.lastAt) > 86_400_000);
        const seen = new Set<string>();
        const out: { sellerId: string; name: string; listingTitle: string }[] = [];
        for (const c of convs) {
          if (out.length >= 3 || seen.has(c.otherId!)) continue;
          seen.add(c.otherId!);
          const info = await getSellerReviews(c.otherId!).catch(() => null);
          if (info?.canReview) out.push({ sellerId: c.otherId!, name: c.otherName, listingTitle: c.listingTitle });
        }
        if (!cancelled) setItems(out);
      } catch { /* not signed in or offline */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!items.length) return null;
  const send = async (sellerId: string) => {
    setBusy(sellerId);
    try { await postSellerReview(sellerId, rating[sellerId] || 5, ''); setSent((s) => ({ ...s, [sellerId]: true })); }
    catch { /* already reviewed */ setSent((s) => ({ ...s, [sellerId]: true })); }
    finally { setBusy(null); }
  };

  return (
    <div className={card}>
      <div className="font-bold text-slate-900">Оцените продавцов</div>
      <p className="text-xs text-slate-500 mt-0.5">Ваша оценка помогает другим покупателям выбрать честного продавца.</p>
      <div className="mt-3 space-y-3">
        {items.map((it) => (
          <div key={it.sellerId} className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 truncate" data-no-i18n>{it.name}</div>
              <div className="text-xs text-slate-500 truncate" data-no-i18n>{it.listingTitle}</div>
            </div>
            {sent[it.sellerId] ? <span className="text-xs text-emerald-600 font-bold">Спасибо!</span> : (
              <>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" onClick={() => setRating((r) => ({ ...r, [it.sellerId]: i }))} className="p-0.5 cursor-pointer" aria-label={`${i}`}>
                      <Star size={22} className={i <= (rating[it.sellerId] || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                    </button>
                  ))}
                </div>
                <button type="button" disabled={!rating[it.sellerId] || busy === it.sellerId} onClick={() => send(it.sellerId)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-40 inline-flex items-center gap-1">
                  {busy === it.sellerId && <Loader2 size={12} className="animate-spin" />}Оценить
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
