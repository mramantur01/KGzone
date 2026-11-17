import React, { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { PERM_GROUPS, ALL_PERMS, type StaffPerm } from '../../api/staffPerms';

const ROLE_TEXT: Record<string, string> = { moderator: 'Модератор', admin: 'Администратор' };

/** Ticks for each power: shown under a person when the owner makes them staff or changes their powers */
export const PermsEditor: React.FC<{
  name: string;
  role: string;
  initial: StaffPerm[];
  /** Powers the current admin has: only these can be given */
  allowed: StaffPerm[];
  busy?: boolean;
  onConfirm: (perms: StaffPerm[]) => void;
  onCancel: () => void;
}> = ({ name, role, initial, allowed, busy, onConfirm, onCancel }) => {
  const [sel, setSel] = useState<Set<StaffPerm>>(new Set(initial.filter((x) => allowed.includes(x))));
  const toggle = (id: StaffPerm) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = allowed.every((x) => sel.has(x));
  return (
    <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-3" role="group" aria-label="Права сотрудника">
      <div className="flex items-start gap-2">
        <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-black text-sm text-slate-900">
            Какие права дать: <span data-no-i18n>{name}</span> · {ROLE_TEXT[role] || role}
          </div>
          <div className="text-xs text-slate-600">Отметьте галочками, что этот человек сможет делать. Потом нажмите «Подтвердить».</div>
        </div>
        <button type="button" onClick={() => setSel(allOn ? new Set() : new Set(allowed))} className="text-xs font-bold text-amber-800 underline cursor-pointer whitespace-nowrap">
          {allOn ? 'Снять все' : 'Отметить все'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PERM_GROUPS.map((g) => (
          <div key={g.title} className="p-3 rounded-lg bg-white border border-amber-200">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">{g.title}</div>
            <div className="space-y-1.5">
              {g.items.map((i) => {
                const locked = !allowed.includes(i.id);
                return (
                  <label key={i.id} className={`flex items-start gap-2 text-xs ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} title={locked ? 'У вас самих нет этого права' : undefined}>
                    <input type="checkbox" checked={sel.has(i.id)} disabled={locked} onChange={() => toggle(i.id)} className="mt-0.5 w-4 h-4 accent-[#C8102E] shrink-0" />
                    <span className="text-slate-800">{i.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || sel.size === 0} onClick={() => onConfirm(ALL_PERMS.filter((x) => sel.has(x)))} className="px-4 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          <Check size={15} />Подтвердить
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold cursor-pointer">Отмена</button>
        <span className="text-xs text-slate-500">Отмечено: {sel.size} из {ALL_PERMS.length}</span>
      </div>
    </div>
  );
};
