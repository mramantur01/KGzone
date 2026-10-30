import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAccount } from '../../api/auth';

// Self-service account deletion (privacy policy): needs the password and a confirmation
export const DeleteAccountCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Удалить аккаунт и все ваши объявления? Это действие нельзя отменить.')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-bold text-red-600 underline cursor-pointer flex items-center gap-1">
        <Trash2 size={12} />
        <span>Удалить аккаунт</span>
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <p className="text-xs text-slate-600">
            Будут удалены аккаунт и все ваши объявления. В переписке вместо вашего имени появится «Удалённый пользователь».
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ваш пароль"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
            />
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold cursor-pointer shrink-0 disabled:opacity-60">
              Удалить навсегда
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
};
