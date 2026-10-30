import React, { useEffect, useState } from 'react';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { sendPartRequest } from '../../api/partRequests';

interface Props {
  part: string;
  brand?: string;
  model?: string;
  generation?: string;
}

// Shown when nothing is listed: the buyer leaves a request, staff look for the part on the markets
export const PartRequestForm: React.FC<Props> = ({ part, brand = '', model = '', generation = '' }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState(part);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => { setWhat(part); setSent(false); }, [part, brand, model, generation]);
  useEffect(() => {
    if (user) { setName((n) => n || user.name); setPhone((p) => p || `+${user.phone}`); }
  }, [user]);

  const car = [brand, model, generation].filter(Boolean).join(' ');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendPartRequest({ part: what.trim(), brand, model, generation, comment: comment.trim(), name: name.trim(), phone: phone.trim() });
      setSent(true);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Не удалось отправить заявку');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <p className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 font-semibold">
        <CheckCircle2 size={16} /> Заявка принята. Её получат продавцы с запчастями для вашей марки — они позвонят вам.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black rounded-xl inline-flex items-center gap-2 cursor-pointer">
        <Search size={14} /> Оставить заявку на поиск
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 max-w-md mx-auto text-left space-y-2 text-xs">
      <div className="text-neutral-300 font-semibold">
        Заявка на поиск{car ? <> для <span className="text-white" data-no-i18n>{car}</span></> : null}
      </div>
      <input value={what} onChange={(e) => setWhat(e.target.value)} required maxLength={160} placeholder="Какая деталь нужна" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white" />
      <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Подробности: OEM-номер, VIN или номер кузова, новая или б/у (необязательно)" className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white" />
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ваше имя" className="px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white" />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+996 700 123 456" className="px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono" />
      </div>
      <p className="text-neutral-500">Заявку и ваш телефон увидят продавцы KGzone, у которых есть запчасти для этой марки, и администрация сайта.</p>
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black inline-flex items-center gap-2 cursor-pointer disabled:opacity-60">
          {busy && <Loader2 size={14} className="animate-spin" />}<span>Отправить заявку</span>
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold cursor-pointer">Отмена</button>
      </div>
    </form>
  );
};
