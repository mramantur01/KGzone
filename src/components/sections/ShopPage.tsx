import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Clock, Phone, Search, Star, Share2, Loader2, Store, Navigation } from 'lucide-react';
import { call } from '../../api/admin';
import { useParts } from '../../api/parts';
import type { AutoPartItem } from '../../types/car';
import { VerifiedSellerBadge } from '../common/VerifiedSellerBadge';
import { lastSeenText, seenRecently } from '../../utils/lastSeen';
import { isDemoCabinet } from '../../api/demo';
import { partHaystack, smartMatch } from '../../utils/smartSearch';

interface ShopInfo { about: string; market: string; container: string; address: string; hours: string; mapUrl: string }
interface SellerProfile {
  id: string;
  name: string;
  accountType: 'individual' | 'legal';
  verified: boolean;
  city: string;
  since: string;
  lastSeenAt?: string;
  shop: ShopInfo | null;
  rating: number | null;
  reviewsCount: number;
}

// Public page of one seller: kgzone/magazin/<id>. Sellers share this link in Instagram and WhatsApp.
export const ShopPage: React.FC<{ sellerId: string; onOpenPart: (part: AutoPartItem) => void }> = ({ sellerId, onOpenPart }) => {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const allParts = useParts();

  useEffect(() => {
    setSeller(null);
    setError(null);
    call<{ seller: SellerProfile }>(`/api/sellers/${encodeURIComponent(sellerId)}`).then((r) => setSeller(r.seller)).catch((e) => setError(e.message));
  }, [sellerId]);

  const [demoParts, setDemoParts] = useState<AutoPartItem[] | null>(null);
  useEffect(() => {
    if (!isDemoCabinet() || sellerId !== 'demo-seller') { setDemoParts(null); return; }
    call<{ parts: (AutoPartItem & { moderation?: { status: string } })[] }>('/api/my/listings')
      .then((r) => setDemoParts(r.parts.filter((p) => p.moderation?.status === 'approved' && p.stockCount > 0 && p.images?.length)))
      .catch(() => setDemoParts([]));
  }, [sellerId]);
  const parts = useMemo(() => demoParts || allParts.filter((p) => p.sellerId === sellerId), [demoParts, allParts, sellerId]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s-]/g, '');
    if (!q) return parts;
    return parts.filter((p) => [p.title, p.brand, p.model, p.partNumber, ...(p.crossNumbers || [])].join(' ').toLowerCase().replace(/[\s-]/g, '').includes(q) || smartMatch(partHaystack(p), query));
  }, [parts, query]);
  const phone = parts.find((p) => p.sellerPhone)?.sellerPhone;

  useEffect(() => {
    if (seller) document.title = `${seller.name} — автозапчасти | KGzone`;
  }, [seller]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: seller?.name, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    } catch { /* cancelled */ }
  };

  if (error) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-600">{error}</div>;
  }
  if (!seller) {
    return <div className="py-24 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;
  }
  const where = [seller.shop?.market, seller.shop?.container].filter(Boolean).join(', ');
  const seen = lastSeenText(seller.lastSeenAt);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 space-y-4">
      {/* Shop header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C8102E] text-white flex items-center justify-center shrink-0"><Store size={26} /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex flex-wrap items-center gap-2" data-no-i18n>
              {seller.name}
              {seller.verified && <VerifiedSellerBadge withLabel size={12} />}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>{seller.accountType === 'legal' ? 'Магазин / компания' : 'Частный продавец'}</span>
              {seller.rating ? <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /><b>{seller.rating}</b> ({seller.reviewsCount})</span> : null}
              <span>На KGzone с {new Date(seller.since).toLocaleDateString('ru-RU')}</span>
              {seen && <span className={seenRecently(seller.lastSeenAt) ? 'text-emerald-600 font-semibold' : ''}>{seen}</span>}
            </div>
            {seller.shop?.about && <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap" data-no-i18n>{seller.shop.about}</p>}
          </div>
          <button type="button" onClick={share} className="order-last sm:order-none w-full sm:w-auto justify-center px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <Share2 size={15} /><span>{copied ? 'Ссылка скопирована' : 'Поделиться'}</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          {(where || seller.shop?.address || seller.city) && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50">
              <MapPin size={16} className="text-[#C8102E] shrink-0 mt-0.5" />
              <span data-no-i18n>{[where, seller.shop?.address, seller.city].filter(Boolean).join(' · ')}</span>
            </div>
          )}
          {seller.shop?.hours && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50">
              <Clock size={16} className="text-slate-500 shrink-0 mt-0.5" /><span data-no-i18n>{seller.shop.hours}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex-1 px-3 py-3 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold flex items-center justify-center gap-2">
                <Phone size={16} /><span data-no-i18n>{phone}</span>
              </a>
            )}
            {seller.shop?.mapUrl && (
              <a href={seller.shop.mapUrl} target="_blank" rel="noopener noreferrer" className="flex-1 px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2">
                <Navigation size={16} /><span>Как проехать</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-100">
          <h2 className="font-black text-slate-900 text-lg">Товары в наличии <span className="text-slate-400">{parts.length}</span></h2>
          <div className="relative sm:ml-auto sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск в этом магазине" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">{parts.length ? 'Ничего не найдено' : 'Сейчас у продавца нет товаров в наличии'}</p>
        ) : (
          <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map((p) => (
              <button key={p.id} type="button" onClick={() => onOpenPart(p)} className="text-left rounded-xl border border-slate-200 hover:border-[#1d6fb8] hover:shadow-sm overflow-hidden cursor-pointer bg-white">
                <img src={p.image} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover bg-slate-100" />
                <div className="p-2.5">
                  <div className="text-sm font-bold text-[#1d6fb8] line-clamp-2" data-no-i18n>{p.title}</div>
                  <div className="text-[11px] text-slate-500 truncate" data-no-i18n>{[p.partNumber && `OEM ${p.partNumber}`, [p.brand, p.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</div>
                  <div className="mt-1 font-black text-slate-900">{p.priceKgs.toLocaleString('ru-RU')} сом</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
