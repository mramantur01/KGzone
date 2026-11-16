import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { updateProfile, type Account } from '../../api/auth';
import { uploadPhoto } from '../../api/upload';

// Profile photo or shop logo for any seller: shown in the cabinet, the site header and the seller page
export const AvatarPicker: React.FC<{ user: Account; size?: 'md' | 'lg' }> = ({ user, size = 'md' }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = user.avatarUrl || user.shop?.logoUrl || '';
  const box = size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-14 h-14 text-2xl';
  const legal = user.accountType === 'legal';
  const action = url ? (legal ? 'Сменить логотип' : 'Сменить фото') : (legal ? 'Загрузить логотип' : 'Загрузить фото');

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(null);
    try { await updateProfile({ avatarUrl: await uploadPhoto(file, 'part') }); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const remove = async () => {
    setBusy(true); setError(null);
    try { await updateProfile(user.shop?.logoUrl ? { avatarUrl: '', shop: { ...user.shop, logoUrl: '' } } : { avatarUrl: '' }); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        title={action}
        className={`${box} relative shrink-0 rounded-full overflow-hidden bg-amber-400 text-neutral-950 font-black flex items-center justify-center cursor-pointer group ring-2 ring-white shadow`}
      >
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span data-no-i18n>{(user.company?.name || user.name).trim().charAt(0).toUpperCase()}</span>}
        <span className="absolute inset-0 bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        </span>
        {!url && !busy && <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#C8102E] text-white flex items-center justify-center ring-2 ring-white"><Camera size={12} /></span>}
      </button>
      <div className="text-xs leading-snug">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="font-bold text-[#1d6fb8] hover:underline cursor-pointer">
          {action}
        </button>
        {url && <button type="button" onClick={remove} disabled={busy} className="ml-2 text-slate-500 hover:text-red-600 cursor-pointer inline-flex items-center gap-0.5"><Trash2 size={11} />Убрать</button>}
        <div className="text-slate-500">Видно покупателям на вашей странице</div>
        {error && <div className="text-red-600">{error}</div>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
};
