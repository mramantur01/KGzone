import React, { useEffect, useState } from 'react';
import { MessageSquare, Star, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { getSellerReviews, postSellerReview, requestSignIn, startConversation, type SellerReviewsInfo } from '../../api/chat';
import { ChatThread } from './ChatThread';

interface Props {
  kind: 'parts' | 'cars';
  listingId: string;
  listingTitle: string;
  sellerId?: string;
  dark?: boolean;
}

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 13 }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
    ))}
  </span>
);

// "Написать продавцу" + seller rating and reviews. Shown only for listings that belong to a registered seller.
export const SellerContactBlock: React.FC<Props> = ({ kind, listingId, listingTitle, sellerId, dark = false }) => {
  const { user } = useAuth();
  const [info, setInfo] = useState<SellerReviewsInfo | null>(null);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  const load = () => { if (sellerId) getSellerReviews(sellerId).then(setInfo).catch(() => setInfo(null)); };
  useEffect(load, [sellerId, user?.id, conversationId]);
  useEffect(() => {
    setComposing(false);
    setConversationId(null);
    setText(kind === 'parts' ? 'Здравствуйте! Деталь ещё в наличии?' : 'Здравствуйте! Машина ещё продаётся?');
  }, [listingId, kind]);

  if (!sellerId) return null;
  const isOwn = user?.id === sellerId;

  const openComposer = () => {
    if (!user) { requestSignIn('Чтобы написать продавцу, войдите или зарегистрируйтесь.'); return; }
    setComposing(true);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const c = await startConversation(kind, listingId, text.trim());
      setConversationId(c.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewMsg(null);
    try {
      await postSellerReview(sellerId, rating, reviewText.trim());
      setReviewText('');
      setReviewMsg('Спасибо за отзыв!');
      load();
    } catch (err: any) {
      setReviewMsg(err.message);
    }
  };

  const box = dark ? 'bg-neutral-900 border border-neutral-800 text-white' : 'bg-white border border-slate-200 text-slate-900';
  const muted = dark ? 'text-neutral-400' : 'text-slate-500';

  return (
    <div className={`p-4 rounded-2xl space-y-3 ${box}`}>
      {info && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold text-sm" data-no-i18n>{info.seller.name}</span>
          {info.seller.verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500"><ShieldCheck size={13} />Проверенная компания</span>
          )}
          <span className={`text-xs ${muted}`}>{info.seller.accountType === 'legal' ? 'Магазин / компания' : 'Частный продавец'}</span>
          <span className={`text-xs ${muted}`}>На KGzone с {new Date(info.seller.since).toLocaleDateString('ru-RU')}</span>
          <button type="button" onClick={() => setShowReviews((v) => !v)} className="inline-flex items-center gap-1 text-xs cursor-pointer">
            {info.rating ? <><Stars value={info.rating} /><b>{info.rating}</b></> : <span className={muted}>Отзывов пока нет</span>}
            {info.reviews.length > 0 && <span className="underline">({info.reviews.length})</span>}
          </button>
        </div>
      )}

      {showReviews && info && info.reviews.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {info.reviews.map((r) => (
            <div key={r.id} className={`p-2.5 rounded-xl text-xs ${dark ? 'bg-neutral-950' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2"><Stars value={r.rating} size={11} /><b data-no-i18n>{r.authorName}</b><span className={muted}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span></div>
              {r.text && <div className="mt-1" data-no-i18n>{r.text}</div>}
              <div className={`mt-0.5 ${muted}`} data-no-i18n>{r.listingTitle}</div>
            </div>
          ))}
        </div>
      )}

      {!isOwn && !conversationId && !composing && (
        <button type="button" onClick={openComposer} className="w-full py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
          <MessageSquare size={16} />
          <span>Написать продавцу</span>
        </button>
      )}
      {isOwn && <p className={`text-xs ${muted}`}>Это ваше объявление. Вопросы покупателей — в разделе «Сообщения» личного кабинета.</p>}

      {composing && !conversationId && (
        <form onSubmit={send} className="space-y-2">
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            className={`w-full px-3 py-2 rounded-xl text-sm ${dark ? 'bg-neutral-950 border border-neutral-700 text-white' : 'bg-slate-50 border border-slate-300'}`}
          />
          <p className={`text-[11px] ${muted}`} data-no-i18n={undefined}>
            Вопрос по объявлению: <span data-no-i18n>{listingTitle}</span>
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !text.trim()} className="px-4 py-2 rounded-xl bg-[#C8102E] text-white text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60">
              {busy && <Loader2 size={14} className="animate-spin" />}<span>Отправить</span>
            </button>
            <button type="button" onClick={() => setComposing(false)} className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${dark ? 'bg-neutral-800' : 'bg-slate-100'}`}>Отмена</button>
          </div>
        </form>
      )}

      {conversationId && (
        <>
          <p className="text-xs text-emerald-500 font-semibold">Сообщение отправлено. Ответ продавца появится здесь и в разделе «Сообщения» личного кабинета.</p>
          <ChatThread conversationId={conversationId} dark={dark} />
        </>
      )}

      {info?.canReview && (
        <form onSubmit={sendReview} className={`pt-3 border-t space-y-2 ${dark ? 'border-neutral-800' : 'border-slate-200'}`}>
          <div className="text-xs font-bold">Оцените продавца</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setRating(i)} className="cursor-pointer" aria-label={`${i}`}>
                <Star size={22} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
              </button>
            ))}
          </div>
          <textarea rows={2} value={reviewText} onChange={(e) => setReviewText(e.target.value)} maxLength={1000} placeholder="Как прошла сделка? (необязательно)" className={`w-full px-3 py-2 rounded-xl text-sm ${dark ? 'bg-neutral-950 border border-neutral-700 text-white' : 'bg-slate-50 border border-slate-300'}`} />
          <button type="submit" className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${dark ? 'bg-neutral-800 text-white' : 'bg-slate-900 text-white'}`}>Оставить отзыв</button>
        </form>
      )}
      {reviewMsg && <p className="text-xs text-emerald-500">{reviewMsg}</p>}
    </div>
  );
};
